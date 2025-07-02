import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

const drumSynthConfigs = [
  { options: { pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' } }, type: Tone.MembraneSynth, note: 'C1' },
  { options: { pitchDecay: 0.01, octaves: 6, oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }, type: Tone.MembraneSynth, note: 'C1' },
  { options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }, type: Tone.NoiseSynth, note: '8n' },
  { options: { pitchDecay: 0.05, octaves: 4, oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0.01, release: 1.4 } }, type: Tone.MembraneSynth, note: 'C1' },
];

const drumNames = ['Kick', 'Snare', 'Hat', 'Bass'];
const initialPattern = Array.from({ length: drumNames.length }, () => Array(16).fill(0));

const StepSequencer = ({ onExport, timelineChannel, sequencerChannel }) => {
  const [pattern, setPattern] = useState(initialPattern);
  const patternRef = useRef(initialPattern);
  const [currentStep, setCurrentStep] = useState(0);
  const synths = useRef([]);
  const clock = useRef(null);
  
  useEffect(() => {
    synths.current = drumSynthConfigs.map(cfg => new cfg.type(cfg.options).connect(sequencerChannel.current));
    return () => synths.current.forEach(s => s.dispose());
  }, [sequencerChannel]);

  useEffect(() => {
    let stepIndex = 0;
    const freq = 1 / Tone.Time('16n').toSeconds();

    clock.current = new Tone.Clock((time) => {
      const col = stepIndex % 16;

      const currentPattern = patternRef.current;

      currentPattern.forEach((row, rowIdx) => {
        if (row[col]) {
          const synth = synths.current[rowIdx];
          const note = drumSynthConfigs[rowIdx].note;

          if (synth instanceof Tone.NoiseSynth) {
            synth.triggerAttackRelease('8n', time);
          } else {
            synth.triggerAttackRelease(note, '8n', time);
          }
        }
      });

      Tone.Draw.schedule(() => setCurrentStep(col), time);
      stepIndex = (col + 1) % 16;
    }, freq);

    return () => {
      clock.current.stop();
      clock.current.dispose();
    };
  }, []);

  const toggleStep = (row, col) => {
    const newPattern = pattern.map(r => [...r]);
    newPattern[row][col] = newPattern[row][col] === 0 ? 1 : 0;
    patternRef.current = newPattern;
    setPattern(newPattern);
  };

  const handlePreviewPlay = () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
    sequencerChannel.current.mute = false;
    timelineChannel.current.mute = true;

    if (clock.current) {
      clock.current.start();
    }
  };

  const handlePreviewStop = () => {
    if (clock.current) {
      clock.current.stop();
    }

    sequencerChannel.current.mute = true;
    timelineChannel.current.mute = false;
    setCurrentStep(0);
  };

  const handleClear = () => {
    const cleared = Array.from({ length: drumNames.length }, () => Array(16).fill(0));
    patternRef.current = cleared;
    setPattern(cleared);
  };

  return (
    <div className="bg-bg-dark p-4 rounded-lg"
         onContextMenu={(e) => e.preventDefault()}
         onDoubleClick={(e) => e.preventDefault()}>
       <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <button onClick={handlePreviewPlay} className="bg-bg-light hover:bg-green-600 text-text-primary font-bold p-2 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
              <div className="w-0 h-0 border-l-[12px] border-l-green-500 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent ml-0.5"></div>
            </button>
            <button onClick={handlePreviewStop} className="bg-bg-light hover:bg-gray-600 text-text-primary font-bold p-2 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
              <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
            </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="bg-bg-light hover:bg-gray-600 text-text-primary font-bold py-2 px-4 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => onExport(pattern)}
            className="bg-accent hover:bg-accent-hover text-bg-dark font-bold py-2 px-4 rounded"
          >
            Export to Timeline
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {pattern.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 items-center">
            <div className="w-20 text-text-secondary font-bold text-sm text-right">{drumNames[rowIndex]}</div>
            <div className="grid grid-cols-16 gap-1 flex-grow">
              {row.map((step, colIndex) => (
                <button
                  key={colIndex}
                  onClick={() => toggleStep(rowIndex, colIndex)}
                  className={`h-12 w-full rounded transition-colors border-2 border-transparent ${
                    step ? 'bg-accent' : 'bg-bg-light'
                  } ${
                    currentStep === colIndex ? '!border-white' : ''
                  }`}
                ></button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepSequencer; 