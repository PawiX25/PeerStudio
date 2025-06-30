import React, { useRef } from 'react';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import * as Tone from 'tone';

const Piano = ({ onNoteDown, onNoteUp }) => {
  const synth = useRef(new Tone.Synth().toDestination());

  const playNote = (midiNumber) => {
    const frequency = Tone.Midi(midiNumber).toFrequency();
    synth.current.triggerAttack(frequency);
    if (onNoteDown) {
      onNoteDown(midiNumber, Tone.Transport.now());
    }
  };

  const stopNote = (midiNumber) => {
    synth.current.triggerRelease();
    if (onNoteUp) {
      onNoteUp(midiNumber, Tone.Transport.now());
    }
  };

  return (
    <div className="bg-bg-medium p-4 rounded-lg">
      <ReactPiano
        noteRange={{ first: MidiNumbers.fromNote('C3'), last: MidiNumbers.fromNote('C5') }}
        playNote={playNote}
        stopNote={stopNote}
        width={1000}
      />
    </div>
  );
};

export default Piano; 