import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Header from './components/Header';
import Piano from './components/Piano';
import StepSequencer from './components/StepSequencer';
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
  }, []);

  const setupConnectionHandlers = (conn) => {
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
  };

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
    setTracks(prev => [...prev, newTrack]);
  };

  const handlePlay = () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
    timelineChannel.current.mute = false;
    sequencerChannel.current.mute = true;
    Tone.Transport.start();
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

  const handleNoteDown = (midiNumber, time) => {
    if (isRecording && activeInstrumentTab === 'Piano') {
      activeNotes.current.push({ midi: midiNumber, startTime: time });
    }
  };

  const handleNoteUp = (midiNumber, time) => {
    if (isRecording && activeInstrumentTab === 'Piano') {
      const note = activeNotes.current.find(n => n.midi === midiNumber);
      if (note) {
        recordedNotes.current.push({
          midi: midiNumber,
          time: note.startTime,
          duration: time - note.startTime,
          velocity: 1,
        });
        activeNotes.current = activeNotes.current.filter(n => n.midi !== midiNumber);
      }
    }
  };

  const synthesizePianoRecording = async (recording, skipBroadcast = false, clipId = null) => {
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
    addBufferToTrack(buffer, 'Synth', resolvedClipId);

    if (!skipBroadcast) {
      broadcastMessage({ type: 'pianoRecording', recording, clipId: resolvedClipId });
    }
  };
  const handlePianoExport = (recording) => {
    const validRecording = recording.filter(note => note.duration > 0);
    if (validRecording.length === 0) return;
    synthesizePianoRecording(validRecording, true);
  };

  const synthesizeSequencerPattern = async (pattern, skipBroadcast = false, clipId = null) => {
    const loopDuration = Tone.Time('1m').toSeconds();
    
    const buffer = await Tone.Offline(async ({ transport }) => {
      const synths = drumSynthConfigs.map((config) => new config.type(config.options).toDestination());
      
      const seq = new Tone.Sequence(
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
      let trackIndex = prevTracks.findIndex(t => t.name === trackNamePrefix);

      let tracksCopy = [...prevTracks];
      if (trackIndex === -1) {
        let i = 1;
        let newName = trackNamePrefix;
        while (tracksCopy.some(t => t.name === newName)) {
          i++;
          newName = `${trackNamePrefix} ${i}`;
        }
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
      clipToMove.player.unsync();
      clipToMove.player.sync().start(newLeft / 100);

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
        onStop={handleStop}
        peerId={peerId}
        remotePeerId={remotePeerId}
        onRemotePeerIdChange={setRemotePeerId}
        onConnect={connectToPeer}
        isConnected={isConnected}
      />
      <div className="flex flex-grow overflow-hidden">
        <Sidebar onAddTrack={() => addTrack()} tracks={tracks} setTracks={setTracks} />
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow">
            <Timeline tracks={tracks} setTracks={setTracks} timelineChannel={timelineChannel} onClipDrop={handleClipDrop} />
          </div>
          <div className="flex-shrink-0 bg-bg-medium">
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
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
