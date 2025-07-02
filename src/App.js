import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Header from './components/Header';
import Piano from './components/Piano';
import StepSequencer from './components/StepSequencer';
import Synthesizer from './components/Synthesizer';
import AudioImport from './components/AudioImport';
import BassInstruments from './components/BassInstruments';
import VolumeMixer from './components/VolumeMixer';
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

  const synthesizeSequencerPattern = useCallback(async (pattern, skipBroadcast = false, clipId = null) => {
    const loopDuration = Tone.Time('1m').toSeconds();
    
    const buffer = await Tone.Offline(async ({ transport }) => {
      const synths = drumSynthConfigs.map((config) => new config.type(config.options).toDestination());
      
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


  const connectToPeer = () => {
    if (!remotePeerId || !peerRef.current) return;

    const conn = peerRef.current.connect(remotePeerId);
    conn.on('open', () => {
      setupConnectionHandlers(conn);
      setIsConnected(true);
    });
  };

  // Load ZIP project
  const loadZipProject = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const zip = await JSZip.loadAsync(event.target.result);
        const projectFile = zip.file('project.json');
        if (projectFile) {
          const projectContent = await projectFile.async('string');
          const projectData = JSON.parse(projectContent);
          console.log('Project Data:', projectData);
          alert('Project structure loaded! Re-import audio manually.');
          // Load project data into state if needed
        } else {
          alert('project.json not found in the ZIP file');
        }
      } catch (error) {
        console.error('Error loading ZIP project:', error);
        alert('Error loading ZIP project.');
      }
    };
    reader.readAsArrayBuffer(file);
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
    setTracks(prev => [...prev, newTrack]);
  };

  const handlePlay = () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
    Tone.Transport.start();
  };

  const handlePause = () => {
    Tone.Transport.pause();
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
  };

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
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
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
  const handlePianoExport = (recording) => {
    const validRecording = recording.filter(note => note.duration > 0);
    if (validRecording.length === 0) return;
    synthesizePianoRecording(validRecording, true);
  };

  // Generic handler for all instrument exports
  const handleInstrumentExport = (recording, instrumentName = 'Instrument') => {
    const validRecording = recording.filter(note => note.duration > 0);
    if (validRecording.length === 0) return;
    synthesizePianoRecording(validRecording, true, null, instrumentName);
  };

  // Handler for audio file imports
  const handleAudioImport = async (file) => {
    try {
      // Create a URL for the file to load it properly
      const url = URL.createObjectURL(file);
      
      // Create a Tone.Player which handles loading and provides proper buffer access
      const player = new Tone.Player(url, () => {
        // Once loaded, create the clip and add to track
        const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
        const newClip = {
          id: generateId(),
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          player,
          duration: player.buffer.duration,
          left: 0,
          color: randomColor,
        };
        
        // Add to track
        setTracks((prevTracks) => {
          const existingNames = new Set(prevTracks.map(t => t.name));
          let newName = 'Audio Import';
          let i = 1;
          while (existingNames.has(newName)) {
            i++;
            newName = `Audio Import ${i}`;
          }
          
          const newTrack = { id: generateId(), name: newName, clips: [newClip] };
          return [...prevTracks, newTrack];
        });
        
        // Connect and sync the player
        player.connect(timelineChannel.current);
        player.sync().start(0);
        
        // Clean up the URL
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
        return tracksCopy;
      }

      const track = tracksCopy[trackIndex];
      if (!track.clips.some(c => c.id === newClipId)) {
        track.clips = [...track.clips, createClip(track.name)];
        tracksCopy[trackIndex] = track;
      }
      return tracksCopy;
    });

    player.sync().start(0);
  };

  const handleClipDrop = (clipId, sourceTrackId, destinationTrackId, newLeft) => {
    // Prevent clip drops during playback to avoid audio conflicts
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
      
      // Safely update audio player timing only when not playing
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
        className="mobile-landscape-header"
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="mobile-landscape-sidebar">
          <Sidebar onAddTrack={() => addTrack()} tracks={tracks} setTracks={setTracks} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Timeline Section - Takes remaining space but allows bottom panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Timeline tracks={tracks} setTracks={setTracks} timelineChannel={timelineChannel} onClipDrop={handleClipDrop} onAudioImport={handleAudioImport} />
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
                <Synthesizer onExport={(recording) => handleInstrumentExport(recording, 'Synthesizer')} />
              </Tab>
              <Tab label="Bass">
                <BassInstruments onExport={(recording) => handleInstrumentExport(recording, 'Bass')} />
              </Tab>
              <Tab label="Audio Import">
                <AudioImport onImport={handleAudioImport} />
              </Tab>
              <Tab label="Volume Mixer">
                <div className="mobile-landscape-volume">
                  <VolumeMixer tracks={tracks} />
                </div>
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
