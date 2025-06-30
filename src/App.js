import React, { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Header from './components/Header';
import Piano from './components/Piano';
import StepSequencer from './components/StepSequencer';
import Tabs, { Tab } from './components/Tabs';
import * as Tone from 'tone';

const clipColors = ['bg-orange-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400'];

function App() {
  const [tracks, setTracks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeInstrumentTab, setActiveInstrumentTab] = useState('Step Sequencer');
  const activeNotes = useRef([]);
  const recordedNotes = useRef([]);
  const timelineChannel = useRef(new Tone.Channel().toDestination());
  const sequencerChannel = useRef(new Tone.Channel().toDestination());

  const addTrack = (name) => {
    const newTrack = { id: Date.now(), name: name || `Track ${tracks.length + 1}`, clips: [] };
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
        synthesizePianoRecording();
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

  const synthesizePianoRecording = async () => {
    if (recordedNotes.current.length === 0) return;

    const recordingDuration = recordedNotes.current.reduce((max, note) => Math.max(max, note.time + note.duration), 0) + 0.5;

    const buffer = await Tone.Offline(async (transport) => {
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      new Tone.Part((time, value) => {
        synth.triggerAttackRelease(Tone.Midi(value.midi).toFrequency(), value.duration, time, value.velocity);
      }, recordedNotes.current).start(0);
    }, recordingDuration);

    addBufferToTrack(buffer, 'Synth');
  };

  const synthesizeSequencerPattern = async (pattern, configs) => {
    const loopDuration = Tone.Time('1m').toSeconds();
    
    const buffer = await Tone.Offline(async ({ transport }) => {
      const synths = configs.map((config) => new config.type(config.options).toDestination());
      
      const seq = new Tone.Sequence(
        (time, col) => {
          pattern.forEach((row, rowIndex) => {
            if (row[col]) {
              const synth = synths[rowIndex];
              const note = configs[rowIndex].note;

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

    addBufferToTrack(buffer, 'Drums');
  };

  const addBufferToTrack = (buffer, trackNamePrefix = 'Track') => {
    let targetTrackName = trackNamePrefix;
    let targetTrack = tracks.find(t => t.name === targetTrackName);
    
    if (!targetTrack) {
        let i = 1;
        targetTrackName = `${trackNamePrefix}`;
        while (tracks.some(t => t.name === targetTrackName)) {
            i++;
            targetTrackName = `${trackNamePrefix} ${i}`;
        }
        addTrack(targetTrackName);
    }
    
    const player = new Tone.Player(buffer).connect(timelineChannel.current);
    const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
    const newClip = {
      id: Date.now(),
      name: `${targetTrackName} Pattern`,
      player,
      duration: buffer.duration,
      left: 0,
      color: randomColor,
    };
    
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      const trackIndex = newTracks.findIndex(t => t.name === targetTrackName);
      if (trackIndex !== -1) {
        newTracks[trackIndex].clips.push(newClip);
      } else {
        const newTrackWithClip = { id: Date.now(), name: targetTrackName, clips: [newClip] };
        return [...newTracks, newTrackWithClip];
      }
      return newTracks;
    });
    
    player.sync().start(0);
  };

  return (
    <div className="bg-bg-dark text-text-primary h-screen flex flex-col">
      <Header isRecording={isRecording} onRecord={handleRecord} onPlay={handlePlay} onStop={handleStop} />
      <div className="flex flex-grow overflow-hidden">
        <Sidebar onAddTrack={() => addTrack()} tracks={tracks} />
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow">
            <Timeline tracks={tracks} setTracks={setTracks} timelineChannel={timelineChannel} />
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
                <Piano onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
