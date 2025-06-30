import React, { useRef, useState } from 'react';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import * as Tone from 'tone';

const Piano = ({ onExport }) => {
  const synth = useRef(new Tone.Synth().toDestination());
  const [recording, setRecording] = useState([]);

  const playNote = (midiNumber) => {
    const frequency = Tone.Midi(midiNumber).toFrequency();
    synth.current.triggerAttack(frequency);
    setRecording(rec => [...rec, { midi: midiNumber, time: Tone.now(), duration: null }]);
  };

  const stopNote = (midiNumber) => {
    synth.current.triggerRelease();
    setRecording(rec =>
      rec.map(n =>
        n.midi === midiNumber && n.duration === null
          ? { ...n, duration: Tone.now() - n.time }
          : n
      )
    );
  };

  return (
    <div className="bg-bg-medium p-4 rounded-lg">
      <ReactPiano
        noteRange={{ first: MidiNumbers.fromNote('C3'), last: MidiNumbers.fromNote('C5') }}
        playNote={playNote}
        stopNote={stopNote}
        width={1000}
      />
      <div className="flex justify-end mt-4">
        <button
          onClick={() => onExport(recording)}
          className="bg-accent hover:bg-accent-hover text-bg-dark font-bold py-2 px-4 rounded"
        >
          Export to Timeline
        </button>
      </div>
    </div>
  );
};

export default Piano; 