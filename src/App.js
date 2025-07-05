import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Header from './components/Header';
import Piano from './components/Piano';
import StepSequencer from './components/StepSequencer';
import Synthesizer from './components/Synthesizer';
import AudioImport from './components/AudioImport';
import BassInstruments from './components/BassInstruments';

import ExportOptions from './components/ExportOptions';
import Tabs, { Tab } from './components/Tabs';
import * as Tone from 'tone';
import Peer from 'peerjs';
import generateId from './utils/generateId';

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handlePlay, handlePause]);

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

  const addTrack = (name, trackId = null) => {
    const newTrack = { id: trackId || generateId(), name: name || `Track ${tracks.length + 1}`, clips: [] };
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
        const newClip = {
          id: generateId(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          player,
          duration: player.buffer.duration,
          left: 0,
          color: randomColor,
        };
        
        setTracks((prevTracks) => {
          const existingNames = new Set(prevTracks.map(t => t.name));
          let newName = 'Audio Import';
          let i = 1;
          while (existingNames.has(newName)) {
            i++;
            newName = `Audio Import ${i}`;
          }
          
          const newTrack = { id: generateId(), name: newName, clips: [newClip] };
          const newTracks = [...prevTracks, newTrack];
          pushToHistory(newTracks);
          return newTracks;
        });
        
        player.connect(timelineChannel.current);
        player.sync().start(0);
        
        URL.revokeObjectURL(url);
      });
      
    } catch (error) {
      console.error('Error importing audio file:', error);
      alert('Error importing audio file. Please try a different file.');
    }
  };


  const addBufferToTrack = (buffer, trackNamePrefix = 'Track', clipId = null) => {
    const player = new Tone.Player(buffer).connect(timelineChannel.current);
    const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
    const newClipId = clipId || generateId();

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
        const newTrack = { id: generateId(), name: newName, clips: [createClip(newName)] };
        tracksCopy.push(newTrack);
        pushToHistory(tracksCopy);
        return tracksCopy;
      }

      const track = tracksCopy[trackIndex];
      if (!track.clips.some(c => c.id === newClipId)) {
        track.clips = [...track.clips, createClip(track.name)];
        tracksCopy[trackIndex] = track;
      }
      pushToHistory(tracksCopy);
      return tracksCopy;
    });

    player.sync().start(0);
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
          clipToMove.player.sync().start(newLeft / 100);
        }
      } catch (error) {
        console.warn('Error updating clip timing during drop:', error);
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
        className="mobile-landscape-header"
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="mobile-landscape-sidebar">
          <Sidebar onAddTrack={() => addTrack()} tracks={tracks} setTracks={setTracks} pushToHistory={pushToHistory} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Timeline Section - Takes remaining space but allows bottom panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Timeline
              tracks={tracks}
              setTracks={setTracks}
              timelineChannel={timelineChannel}
              onClipDrop={handleClipDrop}
              onAudioImport={handleAudioImport}
              onAddTrack={() => addTrack()}
              pushToHistory={pushToHistory}
            />
          </div>
          {/* Bottom Instrument Panel - Fixed height, responsive for landscape */}
          <div className="flex-shrink-0 bg-bg-medium mobile-landscape-bottom" style={{ height: 'min(40vh, 400px)' }}>
            <Tabs activeTab={activeInstrumentTab} onTabClick={setActiveInstrumentTab}>
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
              <Tab label="Export Options">
                <ExportOptions tracks={tracks} />
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
