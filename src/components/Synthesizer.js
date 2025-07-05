import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import * as Tone from 'tone';

const Synthesizer = ({ onExport }) => {
  const loadSettings = () => {
    const saved = localStorage.getItem('synthesizerSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings;
    }
    return {
      synthType: 'subtractive',
      params: {
        oscType: 'sawtooth',
        oscDetune: 0,
        filterFreq: 2000,
        filterQ: 1,
        filterType: 'lowpass',
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1,
        fmIndex: 10,
        fmRatio: 2,
        wavetablePos: 0,
        volume: -6
      }
    };
  };

  const savedSettings = loadSettings();
  const [synthType, setSynthType] = useState(savedSettings.synthType);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState([]);
  const activeNotesRef = useRef([]);
  const recordStartRef = useRef(0);
  const synthRef = useRef(null);
  const [params, setParams] = useState(savedSettings.params);

  useEffect(() => {
    const settings = { synthType, params };
    localStorage.setItem('synthesizerSettings', JSON.stringify(settings));
  }, [synthType, params]);

  const createSynth = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.dispose();
    }

    switch (synthType) {
      case 'subtractive':
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: params.oscType,
            detune: params.oscDetune
          },
          filter: {
            frequency: params.filterFreq,
            Q: params.filterQ,
            type: params.filterType
          },
          envelope: {
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
          },
          volume: params.volume || -6
        }).toDestination();
        break;

      case 'fm':
        synthRef.current = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: params.fmRatio,
          modulationIndex: params.fmIndex,
          oscillator: {
            type: params.oscType
          },
          envelope: {
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
          },
          modulation: {
            type: 'sine'
          },
          modulationEnvelope: {
            attack: 0.01,
            decay: 0.01,
            sustain: 1,
            release: 0.5
          },
          volume: params.volume || -6
        }).toDestination();
        break;

      case 'wavetable':
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'custom',
            partials: generateWavetable(params.wavetablePos)
          },
          filter: {
            frequency: params.filterFreq,
            Q: params.filterQ,
            type: params.filterType
          },
          envelope: {
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
          },
          volume: params.volume || -6
        }).toDestination();
        break;

      case 'granular':
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'pulse',
            width: 0.1
          },
          filter: {
            frequency: params.filterFreq,
            Q: params.filterQ * 2,
            type: 'bandpass'
          },
          envelope: {
            attack: params.attack * 0.5,
            decay: params.decay * 0.3,
            sustain: params.sustain * 0.7,
            release: params.release * 2
          },
          volume: params.volume || -6
        }).toDestination();
        break;

      default:
        synthRef.current = new Tone.PolySynth({ volume: params.volume || -6 }).toDestination();
    }
  }, [synthType, params]);

  useEffect(() => {
    createSynth();
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, [createSynth]);

  const generateWavetable = (position) => {
    const harmonics = [];
    for (let i = 1; i <= 16; i++) {
      const amplitude = Math.sin(position * Math.PI + i * 0.5) * (1 / i);
      harmonics.push(amplitude);
    }
    return harmonics;
  };

  const playNote = (midiNumber) => {
    const frequency = Tone.Midi(midiNumber).toFrequency();
    synthRef.current.triggerAttack(frequency);

    if (isRecording) {
      const currentTime = Tone.now();
      activeNotesRef.current.push({ midi: midiNumber, start: currentTime });
    }
  };

  const stopNote = (midiNumber) => {
    const frequency = Tone.Midi(midiNumber).toFrequency();
    synthRef.current.triggerRelease(frequency);

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

  const updateParam = (param, value) => {
    setParams(prev => ({ ...prev, [param]: value }));
  };

  return (
    <div className="bg-bg-medium p-4 rounded-lg"
         onContextMenu={(e) => e.preventDefault()}
         onDoubleClick={(e) => e.preventDefault()}>
      <div className="mb-4">
        <label className="block text-text-primary mb-2">Synthesizer Type:</label>
        <select
          value={synthType}
          onChange={(e) => setSynthType(e.target.value)}
          className="bg-bg-dark text-text-primary p-2 rounded"
        >
          <option value="subtractive">Subtractive</option>
          <option value="fm">FM Synthesis</option>
          <option value="wavetable">Wavetable</option>
          <option value="granular">Granular</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-text-secondary text-sm mb-1">Oscillator</label>
          <select
            value={params.oscType}
            onChange={(e) => updateParam('oscType', e.target.value)}
            className="w-full bg-bg-dark text-text-primary p-1 rounded text-sm"
          >
            <option value="sine">Sine</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Filter Freq</label>
          <input
            type="range"
            min="50"
            max="8000"
            value={params.filterFreq}
            onChange={(e) => updateParam('filterFreq', parseInt(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.filterFreq}Hz</span>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Filter Q</label>
          <input
            type="range"
            min="0.1"
            max="30"
            step="0.1"
            value={params.filterQ}
            onChange={(e) => updateParam('filterQ', parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.filterQ}</span>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Attack</label>
          <input
            type="range"
            min="0.001"
            max="2"
            step="0.001"
            value={params.attack}
            onChange={(e) => updateParam('attack', parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.attack}s</span>
        </div>

        {synthType === 'fm' && (
          <>
            <div>
              <label className="block text-text-secondary text-sm mb-1">FM Index</label>
              <input
                type="range"
                min="0"
                max="50"
                value={params.fmIndex}
                onChange={(e) => updateParam('fmIndex', parseInt(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{params.fmIndex}</span>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">FM Ratio</label>
              <input
                type="range"
                min="0.1"
                max="8"
                step="0.1"
                value={params.fmRatio}
                onChange={(e) => updateParam('fmRatio', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{params.fmRatio}</span>
            </div>
          </>
        )}

        {synthType === 'wavetable' && (
          <div>
            <label className="block text-text-secondary text-sm mb-1">Wave Position</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.wavetablePos}
              onChange={(e) => updateParam('wavetablePos', parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <span className="text-xs text-text-secondary">{(params.wavetablePos * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      <div onContextMenu={(e) => e.preventDefault()} onDoubleClick={(e) => e.preventDefault()}>
        <ReactPiano
          noteRange={{ first: MidiNumbers.fromNote('C3'), last: MidiNumbers.fromNote('C5') }}
          playNote={playNote}
          stopNote={stopNote}
          width={1000}
        />
      </div>

      <div className="flex justify-between mt-4">
        <div className="flex items-center gap-2">
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
              Record
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
            onClick={() => onExport(recording, synthType, params)}
            className="bg-accent hover:bg-accent-hover text-bg-dark font-bold py-2 px-4 rounded"
            disabled={recording.length === 0}
          >
            Export to Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default Synthesizer;
