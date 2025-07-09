import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Header from './components/Header';
import Piano from './components/Piano';
import StepSequencer from './components/StepSequencer';
import Synthesizer from './components/Synthesizer';
import AudioImport from './components/AudioImport';
import BassInstruments from './components/BassInstruments';
import EffectsRack, { defaultFxSettings } from './components/EffectsRack';
import ExportOptions from './components/ExportOptions';
import Tabs, { Tab } from './components/Tabs';
import * as Tone from 'tone';
import Peer from 'peerjs';
import generateId from './utils/generateId';
import { debugAudioRouting, checkForAudioLeaks, testAudioFlow } from './utils/debugAudio';

const clipColors = ['bg-orange-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400'];

const drumSynthConfigs = [
  { options: { pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' } }, type: Tone.MembraneSynth, note: 'C1' },
  { options: { pitchDecay: 0.01, octaves: 6, oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }, type: Tone.MembraneSynth, note: 'C1' },
  { options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }, type: Tone.NoiseSynth, note: '8n' },
  { options: { pitchDecay: 0.05, octaves: 4, oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0.01, release: 1.4 } }, type: Tone.MembraneSynth, note: 'C1' },
];

function App() {
  const [tracks, setTracks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeInstrumentTab, setActiveInstrumentTab] = useState('Step Sequencer');
  
  const handleTabChange = (tabName) => {
    setActiveInstrumentTab(tabName);
    if (tabName === 'Effects Rack' && tracks.length > 0 && !selectedTrackId) {
      setSelectedTrackId(tracks[0].id);
    }
  };
  const activeNotes = useRef([]);
  const recordedNotes = useRef([]);
  const timelineChannel = useRef(new Tone.Channel().toDestination());
  const sequencerChannel = useRef(new Tone.Channel().toDestination());
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState([tracks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const maxHistorySize = 50;
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMetronomeOn, setMetronomeOn] = useState(false);
  const [time, setTime] = useState(0);
  const [trackChannels, setTrackChannels] = useState({});
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [trackFxSettings, setTrackFxSettings] = useState({});
  const [soloedTrackId, setSoloedTrackId] = useState(null);
  const [soloedClipId, setSoloedClipId] = useState(null);

  const toggleSoloTrack = (trackId) => {
    setSoloedTrackId(prev => prev === trackId ? null : trackId);
    setSoloedClipId(null);
  };

  const toggleSoloClip = (clipId) => {
    setSoloedClipId(prev => prev === clipId ? null : clipId);
    setSoloedTrackId(null);
  };

  useEffect(() => {
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.player && clip.player.loaded) {
          if (soloedTrackId) {
            clip.player.mute = track.id !== soloedTrackId;
          } else if (soloedClipId) {
            clip.player.mute = clip.id !== soloedClipId;
          } else {
            clip.player.mute = false;
          }
        }
      });
    });
  }, [soloedTrackId, soloedClipId, tracks]);

  const synthesizeSequencerPattern = useCallback(async (pattern, skipBroadcast = false, clipId = null) => {
    const loopDuration = Tone.Time('1m').toSeconds();
    
    const buffer = await Tone.Offline(async ({ transport }) => {
      const synths = drumSynthConfigs.map((config) => {
        const synth = new config.type(config.options);
        synth.volume.value = -6;
        return synth.toDestination();
      });
      
      new Tone.Sequence(
        (time, col) => {
          pattern.forEach((row, rowIndex) => {
            if (row[col]) {
              const synth = synths[rowIndex];
              const note = drumSynthConfigs[rowIndex].note;

              if (synth instanceof Tone.NoiseSynth) {
                synth.triggerAttackRelease('8n', time);
              } else {
                synth.triggerAttackRelease(note, '8n', time);
              }
            }
          });
        },
        Array.from({ length: 16 }, (_, i) => i),
        '16n'
      ).start(0);

      transport.start();
    }, loopDuration);

    const resolvedClipId = clipId || generateId();
    addBufferToTrack(buffer, 'Drums', resolvedClipId);

    if (!skipBroadcast) {
      broadcastMessage({ type: 'sequencerPattern', pattern, clipId: resolvedClipId });
    }
  }, []);

  const setupConnectionHandlers = useCallback((conn) => {
    connectionsRef.current.push(conn);

    conn.on('data', (data) => {
      if (data?.type === 'clipMove') {
        const { trackName, clipId, left } = data;
        setTracks((prevTracks) =>
          prevTracks.map((t) => {
            if (t.name === trackName) {
              const newClips = t.clips.map((c) => {
                if (c.id === clipId) {
                  c.player.unsync();
                  c.player.sync().start(left / 100);
                  return { ...c, left };
                }
                return c;
              });
              return { ...t, clips: newClips };
            }
            return t;
          })
        );
      } else if (data?.type === 'sequencerPattern') {
        synthesizeSequencerPattern(data.pattern, true, data.clipId);
      }
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
    });
  }, [synthesizeSequencerPattern]);

  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      setupConnectionHandlers(conn);
      conn.on('open', () => setIsConnected(true));
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [setupConnectionHandlers]);

  const pushToHistory = useCallback((newTracks) => {
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), newTracks];
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousTracks = history[historyIndex - 1];
      setTracks(previousTracks);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextTracks = history[historyIndex + 1];
      setTracks(nextTracks);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  const handlePlay = useCallback(() => {
    if (Tone.context.state !== 'running') Tone.context.resume();
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
    Tone.Transport.start();
  }, []);

  const handlePause = useCallback(() => {
    Tone.Transport.pause();
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputElement = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === ' ' && !isInputElement) {
        e.preventDefault();
        if (Tone.Transport.state === 'started') {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.key === 'd' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        console.log('🔍 Debug Audio Routing');
        debugAudioRouting();
        checkForAudioLeaks();
        console.log('Track Channels:', trackChannels);
        console.log('Selected Track:', selectedTrackId);
        if (selectedTrackId && trackChannels[selectedTrackId]) {
          testAudioFlow(trackChannels[selectedTrackId]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handlePlay, handlePause, trackChannels, selectedTrackId]);

  const metronomeRef = useRef(null);
  const metronomeLoopRef = useRef(null);
  
  const metronomeChannelRef = useRef(null);
  
  useEffect(() => {
    if (!metronomeRef.current) {
      metronomeChannelRef.current = new Tone.Channel(-10).toDestination();
      
      metronomeRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).connect(metronomeChannelRef.current);
      
      metronomeLoopRef.current = new Tone.Loop((time) => {
        if (metronomeRef.current) {
          metronomeRef.current.triggerAttackRelease("C5", "16n", time);
        }
      }, "4n").start(0);
    }
    
    return () => {
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.stop();
        metronomeLoopRef.current.dispose();
        metronomeLoopRef.current = null;
      }
      if (metronomeRef.current) {
        metronomeRef.current.dispose();
        metronomeRef.current = null;
      }
      if (metronomeChannelRef.current) {
        metronomeChannelRef.current.dispose();
        metronomeChannelRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (metronomeLoopRef.current) {
      metronomeLoopRef.current.mute = !isMetronomeOn;
    }
  }, [isMetronomeOn]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Tone.Transport.state === 'started') {
        setTime(Tone.Transport.seconds);
      }
}, 100);

    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    tracks.forEach(track => {
      if (!trackChannels[track.id]) {
        
        const channel = createChannelWithEffects();
        
        setTrackChannels(prev => ({ ...prev, [track.id]: channel }));
      }
    });
  }, [tracks, trackChannels]);

  useEffect(() => {
    tracks.forEach(track => {
      const channel = trackChannels[track.id];
      if (!channel) return;

      track.clips.forEach(clip => {
        if (clip.player && clip.player.loaded && clip.connectedChannelId !== track.id) {
          try {
            clip.player.disconnect();
            clip.player.connect(channel);
            clip.connectedChannelId = track.id;
          } catch (err) {
            console.warn('Error connecting clip:', err);
          }
        }
      });
    });
  }, [tracks, trackChannels]);

  const connectToPeer = () => {
    if (!remotePeerId || !peerRef.current) return;

    const conn = peerRef.current.connect(remotePeerId);
    conn.on('open', () => {
      setupConnectionHandlers(conn);
      setIsConnected(true);
    });
  };

  const broadcastMessage = (msg) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  };

  const updateTrackFxSettings = (trackId, settings) => {
    setTrackFxSettings(prev => ({ ...prev, [trackId]: settings }));
  };

  const createChannelWithEffects = () => {
    const channel = new Tone.Channel();
    
    const effects = {
      compressor: new Tone.Compressor({ threshold: 0, ratio: 1 }),
      eq: new Tone.EQ3({ low: 0, mid: 0, high: 0 }),
      distortion: new Tone.Distortion({ distortion: 0.3, wet: 0 }),
      chorus: new Tone.Chorus({ frequency: 1.5, depth: 0.7, spread: 180, wet: 0 }).start(),
      delay: new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0 }),
      reverb: new Tone.Reverb({ decay: 2, wet: 0 })
    };
    
    channel.chain(
      effects.compressor,
      effects.eq,
      effects.distortion,
      effects.chorus,
      effects.delay,
      effects.reverb,
      Tone.Destination
    );
    
    channel._effects = effects;
    
    
    return channel;
  };

  const addTrack = (name, trackId = null) => {
    const newTrackId = trackId || generateId();
    const newTrack = { id: newTrackId, name: name || `Track ${tracks.length + 1}`, clips: [] };
    
    const newChannel = createChannelWithEffects();
    
    setTrackChannels(prev => ({ ...prev, [newTrackId]: newChannel }));
    
    setTracks(prev => {
      const newTracks = [...prev, newTrack];
      pushToHistory(newTracks);
      return newTracks;
    });
  };

  const handleStop = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
    setTime(0);
  }, []);

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      if (activeInstrumentTab === 'Piano') {
        synthesizePianoRecording(recordedNotes.current);
      }
    } else {
      recordedNotes.current = [];
      activeNotes.current = [];
      setIsRecording(true);
    }
  };

  const synthesizePianoRecording = async (recording, skipBroadcast = false, clipId = null, trackName = 'Synth') => {
    if (!recording || recording.length === 0) return;

    const recordingDuration = recording.reduce((max, note) => Math.max(max, note.time + note.duration), 0) + 0.5;

    const buffer = await Tone.Offline(async ({ transport }) => {
      const synth = new Tone.PolySynth(Tone.Synth, { volume: -6 }).toDestination();
      new Tone.Part((time, value) => {
        synth.triggerAttackRelease(Tone.Midi(value.midi).toFrequency(), value.duration, time, value.velocity);
      }, recording).start(0);
      transport.start();
    }, recordingDuration);

    const resolvedClipId = clipId || generateId();
    addBufferToTrack(buffer, trackName, resolvedClipId);

    if (!skipBroadcast) {
      broadcastMessage({ type: 'pianoRecording', recording, clipId: resolvedClipId });
    }
  };

  const synthesizeBassRecording = async (recording, skipBroadcast = false, clipId = null, bassType = 'electric', params = {}) => {
    if (!recording || recording.length === 0) return;

    const recordingDuration = recording.reduce((max, note) => Math.max(max, note.time + note.duration), 0) + 0.5;

    const buffer = await Tone.Offline(async ({ transport }) => {
      let synth;
      
      const baseVolume = params.volume !== undefined ? params.volume : 0;
      
      switch (bassType) {
        case 'electric':
          synth = new Tone.MonoSynth({
            oscillator: { type: 'sawtooth' },
            filter: { frequency: 800 + (params.brightness || 0.5) * 1200, Q: 2, type: 'lowpass' },
            envelope: {
              attack: params.attack || 0.01,
              decay: params.decay || 0.3,
              sustain: params.sustain || 0.5,
              release: params.release || 1.2
            },
            volume: baseVolume
          }).toDestination();
          break;
        case 'acoustic':
          synth = new Tone.MonoSynth({
            oscillator: { type: 'triangle' },
            filter: { frequency: 300, Q: 1, type: 'lowpass' },
            envelope: {
              attack: (params.attack || 0.01) * 2,
              decay: (params.decay || 0.3) * 1.5,
              sustain: (params.sustain || 0.5) * 0.7,
              release: (params.release || 1.2) * 1.5
            },
            volume: baseVolume
          }).toDestination();
          break;
        case 'synth':
          synth = new Tone.MonoSynth({
            oscillator: {
              type: 'custom',
              partials: [1, params.oscMix || 0.5, (params.oscMix || 0.5) * 0.5, (params.oscMix || 0.5) * 0.25]
            },
            filter: {
              frequency: params.cutoff || 800,
              Q: params.resonanceQ || 2,
              type: 'lowpass'
            },
            envelope: {
              attack: params.attack || 0.01,
              decay: params.decay || 0.3,
              sustain: params.sustain || 0.5,
              release: params.release || 1.2
            },
            volume: baseVolume
          }).toDestination();
          break;
        default:
          synth = new Tone.MonoSynth({ volume: baseVolume }).toDestination();
      }

      new Tone.Part((time, value) => {
        const bassNote = Tone.Midi(value.midi - 12).toFrequency();
        synth.triggerAttackRelease(bassNote, value.duration, time, value.velocity);
      }, recording).start(0);
      transport.start();
    }, recordingDuration);

    const resolvedClipId = clipId || generateId();
    addBufferToTrack(buffer, 'Bass', resolvedClipId);

    if (!skipBroadcast) {
      broadcastMessage({ type: 'bassRecording', recording, clipId: resolvedClipId, bassType, params });
    }
  };
  const handlePianoExport = (recording) => {
    const validRecording = recording.filter(note => note.duration > 0);
    if (validRecording.length === 0) return;
    synthesizePianoRecording(validRecording, true);
  };

  const synthesizeSynthRecording = async (recording, skipBroadcast = false, clipId = null, synthType = 'subtractive', params = {}) => {
    if (!recording || recording.length === 0) return;

    const recordingDuration = recording.reduce((max, note) => Math.max(max, note.time + note.duration), 0) + 0.5;
    
    const generateWavetable = (position) => {
        const harmonics = [];
        for (let i = 1; i <= 16; i++) {
            const amplitude = Math.sin(position * Math.PI + i * 0.5) * (1 / i);
            harmonics.push(amplitude);
        }
        return harmonics;
    };

    const buffer = await Tone.Offline(async ({ transport }) => {
      let synth;
      const baseVolume = params.volume || -6;
      
      switch (synthType) {
        case 'subtractive':
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
              type: params.oscType || 'sawtooth',
              detune: params.oscDetune || 0
            },
            filter: {
              frequency: params.filterFreq || 2000,
              Q: params.filterQ || 1,
              type: params.filterType || 'lowpass'
            },
            envelope: {
              attack: params.attack || 0.1,
              decay: params.decay || 0.2,
              sustain: params.sustain || 0.5,
              release: params.release || 1
            },
            volume: baseVolume
          }).toDestination();
          break;
        case 'fm':
          synth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: params.fmRatio || 2,
            modulationIndex: params.fmIndex || 10,
            oscillator: { type: params.oscType || 'sine' },
            envelope: {
              attack: params.attack || 0.1,
              decay: params.decay || 0.2,
              sustain: params.sustain || 0.5,
              release: params.release || 1
            },
            volume: baseVolume
          }).toDestination();
          break;
        case 'wavetable':
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: 'custom',
                    partials: generateWavetable(params.wavetablePos || 0)
                },
                filter: {
                    frequency: params.filterFreq || 2000,
                    Q: params.filterQ || 1,
                    type: params.filterType || 'lowpass'
                },
                envelope: {
                    attack: params.attack || 0.1,
                    decay: params.decay || 0.2,
                    sustain: params.sustain || 0.5,
                    release: params.release || 1
                },
                volume: baseVolume
            }).toDestination();
            break;
        case 'granular':
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: 'pulse',
                    width: 0.1
                },
                filter: {
                    frequency: params.filterFreq || 2000,
                    Q: (params.filterQ || 1) * 2,
                    type: 'bandpass'
                },
                envelope: {
                    attack: (params.attack || 0.1) * 0.5,
                    decay: (params.decay || 0.2) * 0.3,
                    sustain: (params.sustain || 0.5) * 0.7,
                    release: (params.release || 1) * 2
                },
                volume: baseVolume
            }).toDestination();
            break;
        default:
          synth = new Tone.PolySynth(Tone.Synth, { volume: baseVolume }).toDestination();
      }

      new Tone.Part((time, value) => {
        synth.triggerAttackRelease(Tone.Midi(value.midi).toFrequency(), value.duration, time, value.velocity);
      }, recording).start(0);
      transport.start();
    }, recordingDuration);

    const resolvedClipId = clipId || generateId();
    addBufferToTrack(buffer, 'Synthesizer', resolvedClipId);

    if (!skipBroadcast) {
      broadcastMessage({ type: 'synthRecording', recording, clipId: resolvedClipId, synthType, params });
    }
  };

  const handleInstrumentExport = (recording, instrumentName = 'Instrument') => {
    const validRecording = recording.filter(note => note.duration > 0);
    if (validRecording.length === 0) return;
    synthesizePianoRecording(validRecording, true, null, instrumentName);
  };

  const handleAudioImport = async (file) => {
    try {
      const url = URL.createObjectURL(file);
      
      const player = new Tone.Player(url, () => {
        const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
        const trackId = generateId();
        const newClip = {
          id: generateId(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          player,
          duration: player.buffer.duration,
          left: 0,
          color: randomColor,
        };
        
        const newChannel = createChannelWithEffects();
        setTrackChannels(prev => ({ ...prev, [trackId]: newChannel }));
        
        player.disconnect();
        player.connect(newChannel);
        
        setTracks((prevTracks) => {
          const existingNames = new Set(prevTracks.map(t => t.name));
          let newName = 'Audio Import';
          let i = 1;
          while (existingNames.has(newName)) {
            i++;
            newName = `Audio Import ${i}`;
          }
          
          const newTrack = { id: trackId, name: newName, clips: [newClip] };
          const newTracks = [...prevTracks, newTrack];
          pushToHistory(newTracks);
          return newTracks;
        });
        
        player.sync().start(0);
        
        URL.revokeObjectURL(url);
      });
      
    } catch (error) {
      console.error('Error importing audio file:', error);
      alert('Error importing audio file. Please try a different file.');
    }
  };

  const addBufferToTrack = (buffer, trackNamePrefix = 'Track', clipId = null) => {
    const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
    const newClipId = clipId || generateId();
    let player = null;
    let trackId = null;

    const createClip = (forTrackName) => ({
      id: newClipId,
      name: `${forTrackName} Pattern`,
      player,
      duration: buffer.duration,
      left: 0,
      color: randomColor,
    });

    setTracks(prevTracks => {
      const existingNames = new Set(prevTracks.map(t => t.name));
      let newName = trackNamePrefix;
      let i = 1;
      while (existingNames.has(newName)) {
        i++;
        newName = `${trackNamePrefix} ${i}`;
      }

      const trackIndex = prevTracks.findIndex(t => t.name === trackNamePrefix);
      const tracksCopy = [...prevTracks];
      
      if (trackIndex === -1) {
        trackId = generateId();
        const newTrack = { id: trackId, name: newName, clips: [] };
        
        const newChannel = createChannelWithEffects();
        setTrackChannels(prev => ({ ...prev, [trackId]: newChannel }));
        
        player = new Tone.Player(buffer).connect(newChannel);
        newTrack.clips = [createClip(newName)];
        
        tracksCopy.push(newTrack);
        pushToHistory(tracksCopy);
        
        setTimeout(() => {
          player.sync().start(0);
        }, 0);
        
        return tracksCopy;
      }

      const track = tracksCopy[trackIndex];
      trackId = track.id;
      
      let channel = trackChannels[trackId];
      if (!channel) {
        channel = createChannelWithEffects();
        setTrackChannels(prev => ({ ...prev, [trackId]: channel }));
      }
      
      player = new Tone.Player(buffer).connect(channel);
      
      if (!track.clips.some(c => c.id === newClipId)) {
        track.clips = [...track.clips, createClip(track.name)];
        tracksCopy[trackIndex] = track;
      }
      pushToHistory(tracksCopy);
      
      setTimeout(() => {
        player.sync().start(0);
      }, 0);
      
      return tracksCopy;
    });
  };

  const handleClipDrop = (clipId, sourceTrackId, destinationTrackId, newLeft) => {
    if (Tone.Transport.state === 'started') {
      return;
    }
    
    setTracks(prevTracks => {
      let clipToMove = null;
      let newTracks = [...prevTracks];

      const sourceTrackIndex = newTracks.findIndex(t => t.id === sourceTrackId);
      if (sourceTrackIndex !== -1) {
        const sourceTrack = newTracks[sourceTrackIndex];
        clipToMove = sourceTrack.clips.find(c => c.id === clipId);
        if (clipToMove) {
          newTracks[sourceTrackIndex] = {
            ...sourceTrack,
            clips: sourceTrack.clips.filter(c => c.id !== clipId),
          };
        }
      }

      if (!clipToMove) return prevTracks;

      clipToMove.left = newLeft;
      
      try {
        if (clipToMove.player && clipToMove.player.loaded) {
          clipToMove.player.unsync();
          clipToMove.player.disconnect();
          
          let destChannel = trackChannels[destinationTrackId];
          if (!destChannel) {
            destChannel = createChannelWithEffects();
            setTrackChannels(prev => ({ ...prev, [destinationTrackId]: destChannel }));
          }
          
          clipToMove.player.connect(destChannel);
          clipToMove.player.sync().start(newLeft);
        }
      } catch (error) {
        console.warn('Error updating clip during drop:', error);
      }

      const destinationTrackIndex = newTracks.findIndex(t => t.id === destinationTrackId);
      if (destinationTrackIndex !== -1) {
        const destinationTrack = newTracks[destinationTrackIndex];
        newTracks[destinationTrackIndex] = {
          ...destinationTrack,
          clips: [...destinationTrack.clips, clipToMove],
        };
      } else {
        newTracks[sourceTrackIndex].clips.push(clipToMove);
      }

      pushToHistory(newTracks);
      return newTracks;
    });

    const destinationTrack = tracks.find(t => t.id === destinationTrackId);
    if (destinationTrack) {
      broadcastMessage({ type: 'clipMove', trackName: destinationTrack.name, clipId, left: newLeft });
    }
  };

  return (
    <div className="bg-bg-dark text-text-primary h-screen flex flex-col">
      <Header
        isRecording={isRecording}
        onRecord={handleRecord}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        peerId={peerId}
        remotePeerId={remotePeerId}
        onRemotePeerIdChange={setRemotePeerId}
        onConnect={connectToPeer}
        isConnected={isConnected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onZoomChange={setZoomLevel}
        zoomLevel={zoomLevel}
        isMetronomeOn={isMetronomeOn}
        onMetronomeToggle={() => setMetronomeOn(!isMetronomeOn)}
        time={time}
        soloedTrackId={soloedTrackId}
        soloedClipId={soloedClipId}
        className="mobile-landscape-header"
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="mobile-landscape-sidebar">
          <Sidebar 
            onAddTrack={() => addTrack()} 
            tracks={tracks} 
            setTracks={setTracks} 
            pushToHistory={pushToHistory}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Timeline
              tracks={tracks}
              setTracks={setTracks}
              timelineChannel={timelineChannel}
              trackChannels={trackChannels}
              onClipDrop={handleClipDrop}
              onAudioImport={handleAudioImport}
              onAddTrack={() => addTrack()}
              pushToHistory={pushToHistory}
              isSidebarCollapsed={isSidebarCollapsed}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              selectedTrackId={selectedTrackId}
              onTrackSelect={setSelectedTrackId}
              soloedTrackId={soloedTrackId}
              toggleSoloTrack={toggleSoloTrack}
              soloedClipId={soloedClipId}
              toggleSoloClip={toggleSoloClip}
            />
          </div>
          <div className="flex-shrink-0 bg-bg-medium mobile-landscape-bottom" style={{ height: 'min(40vh, 400px)' }}>
            <Tabs activeTab={activeInstrumentTab} onTabClick={handleTabChange}>
              <Tab label="Step Sequencer">
                <StepSequencer
                  onExport={synthesizeSequencerPattern}
                  timelineChannel={timelineChannel}
                  sequencerChannel={sequencerChannel}
                />
              </Tab>
              <Tab label="Piano">
                <Piano onExport={handlePianoExport} />
              </Tab>
              <Tab label="Synthesizers">
                <Synthesizer onExport={(recording, synthType, params) => synthesizeSynthRecording(recording, true, null, synthType, params)} />
              </Tab>
              <Tab label="Bass">
                <BassInstruments onExport={(recording, bassType, params) => synthesizeBassRecording(recording, true, null, bassType, params)} />
              </Tab>
              <Tab label="Audio Import">
                <AudioImport onImport={handleAudioImport} />
              </Tab>
              <Tab label="Effects Rack">
                {selectedTrackId && trackChannels[selectedTrackId] ? (
                  <EffectsRack
                    trackId={selectedTrackId}
                    trackName={tracks.find(t => t.id === selectedTrackId)?.name || 'Unknown'}
                    channel={trackChannels[selectedTrackId]}
                    settings={trackFxSettings[selectedTrackId] || defaultFxSettings}
                    onSettingsChange={updateTrackFxSettings}
                  />
                ) : (
                  <div className="p-8 text-center text-text-secondary">
                    <p className="text-lg mb-2">No track selected</p>
                    <p className="text-sm">Click on a track in the timeline to apply effects</p>
                  </div>
                )}
              </Tab>
              <Tab label="Export Options">
                <ExportOptions tracks={tracks} trackFxSettings={trackFxSettings} />
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
