import React, { useRef, useState } from 'react';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import * as Tone from 'tone';

const Piano = ({ onExport }) => {
  const synth = useRef(new Tone.Synth().toDestination());

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState([]);
  const activeNotesRef = useRef([]);
  const recordStartRef = useRef(0);

  const playNote = (midiNumber) => {
    const frequency = Tone.Midi(midiNumber).toFrequency();
    synth.current.triggerAttack(frequency);

    if (isRecording) {
      const currentTime = Tone.now();
      activeNotesRef.current.push({ midi: midiNumber, start: currentTime });
    }
  };

  const stopNote = (midiNumber) => {
    synth.current.triggerRelease();

    if (isRecording) {
      const currentTime = Tone.now();
      const noteIndex = activeNotesRef.current.findIndex(n => n.midi === midiNumber);
      if (noteIndex !== -1) {
        const noteInfo = activeNotesRef.current[noteIndex];
        activeNotesRef.current.splice(noteIndex, 1);
        setRecording(prev => [
          ...prev,
          {
            midi: midiNumber,
            time: noteInfo.start - recordStartRef.current,
            duration: currentTime - noteInfo.start,
            velocity: 1,
          },
        ]);
      }
    }
  };

  const startRecording = () => {
    setRecording([]);
    activeNotesRef.current = [];
    recordStartRef.current = Tone.now();
    setIsRecording(true);
  };

  const stopRecording = () => {
    const now = Tone.now();
    activeNotesRef.current.forEach((n) => {
      setRecording(prev => [
        ...prev,
        {
          midi: n.midi,
          time: n.start - recordStartRef.current,
          duration: now - n.start,
          velocity: 1,
        },
      ]);
    });
    activeNotesRef.current = [];
    setIsRecording(false);
  };

  return (
    <div className="bg-bg-medium p-4 rounded-lg h-full overflow-auto">
      <div 
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <ReactPiano
          noteRange={{ first: MidiNumbers.fromNote('C3'), last: MidiNumbers.fromNote('C5') }}
          playNote={playNote}
          stopNote={stopNote}
          width={1000}
        />
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Stop Recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              🎹 Record
            </button>
          )}
          
          <button
            onClick={() => setRecording([])}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            disabled={recording.length === 0}
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-text-secondary text-sm">
            {recording.length} note{recording.length !== 1 ? 's' : ''} recorded
          </span>
          <button
            onClick={() => onExport(recording)}
            className="bg-accent hover:bg-accent-hover text-bg-dark font-bold py-2 px-4 rounded"
            disabled={recording.length === 0}
          >
            🎵 Export to Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default Piano; 