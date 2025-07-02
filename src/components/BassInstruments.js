import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import * as Tone from 'tone';

const BassInstruments = ({ onExport }) => {
  const [bassType, setBassType] = useState('electric');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState([]);
  const activeNotesRef = useRef([]);
  const recordStartRef = useRef(0);
  const synthRef = useRef(null);

  // Bass-specific parameters
  const [params, setParams] = useState({
    // Common
    volume: -6,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
    release: 1.2,
    // Electric bass specific
    distortion: 0,
    brightness: 0.5,
    // Acoustic bass specific
    resonance: 0.3,
    dampening: 0.2,
    // Synth bass specific
    cutoff: 800,
    resonanceQ: 2,
    oscMix: 0.5
  });

  const createBass = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.dispose();
    }

    switch (bassType) {
      case 'electric':
        // Electric bass simulation with distortion
        const distortion = new Tone.Distortion(params.distortion).toDestination();
        const eq = new Tone.EQ3({
          low: 2,
          mid: params.brightness * 2 - 1,
          high: params.brightness - 0.5
        }).connect(distortion);

        synthRef.current = new Tone.MonoSynth({
          oscillator: {
            type: 'sawtooth'
          },
          filter: {
            frequency: 800 + params.brightness * 1200,
            Q: 2,
            type: 'lowpass'
          },
          envelope: {
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
          },
          volume: params.volume
        }).connect(eq);
        break;

      case 'acoustic':
        // Acoustic upright bass simulation
        const reverb = new Tone.Reverb({
          decay: 2,
          wet: params.resonance
        }).toDestination();

        const filter = new Tone.Filter({
          frequency: 400 + (1 - params.dampening) * 600,
          Q: 1,
          type: 'lowpass'
        }).connect(reverb);

        synthRef.current = new Tone.MonoSynth({
          oscillator: {
            type: 'triangle'
          },
          filter: {
            frequency: 300,
            Q: 1,
            type: 'lowpass'
          },
          envelope: {
            attack: params.attack * 2,
            decay: params.decay * 1.5,
            sustain: params.sustain * 0.7,
            release: params.release * 1.5
          },
          volume: params.volume
        }).connect(filter);
        break;

      case 'synth':
        // Analog-style synth bass
        const synthFilter = new Tone.Filter({
          frequency: params.cutoff,
          Q: params.resonanceQ,
          type: 'lowpass'
        }).toDestination();

        synthRef.current = new Tone.MonoSynth({
          oscillator: {
            type: 'custom',
            partials: [1, params.oscMix, params.oscMix * 0.5, params.oscMix * 0.25]
          },
          filter: {
            frequency: params.cutoff,
            Q: params.resonanceQ,
            type: 'lowpass'
          },
          envelope: {
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
          },
          volume: params.volume
        }).connect(synthFilter);
        break;

      default:
        synthRef.current = new Tone.MonoSynth().toDestination();
    }
  }, [bassType, params]);

  useEffect(() => {
    createBass();
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, [createBass]);

  const playNote = (midiNumber) => {
    // Transpose bass notes down by 2 octaves for realistic bass range
    const bassNote = Tone.Midi(midiNumber - 24).toFrequency();
    synthRef.current.triggerAttack(bassNote);

    if (isRecording) {
      const currentTime = Tone.now();
      activeNotesRef.current.push({ midi: midiNumber, start: currentTime });
    }
  };

  const stopNote = (midiNumber) => {
    synthRef.current.triggerRelease();

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
      {/* Bass Type Selector */}
      <div className="mb-4">
        <label className="block text-text-primary mb-2">Bass Type:</label>
        <select
          value={bassType}
          onChange={(e) => setBassType(e.target.value)}
          className="bg-bg-dark text-text-primary p-2 rounded"
        >
          <option value="electric">Electric Bass</option>
          <option value="acoustic">Acoustic Upright Bass</option>
          <option value="synth">Synth Bass</option>
        </select>
      </div>

      {/* Parameter Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Common Controls */}
        <div>
          <label className="block text-text-secondary text-sm mb-1">Volume</label>
          <input
            type="range"
            min="-40"
            max="6"
            value={params.volume}
            onChange={(e) => updateParam('volume', parseInt(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.volume}dB</span>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Attack</label>
          <input
            type="range"
            min="0.001"
            max="0.5"
            step="0.001"
            value={params.attack}
            onChange={(e) => updateParam('attack', parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.attack}s</span>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Sustain</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.sustain}
            onChange={(e) => updateParam('sustain', parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{(params.sustain * 100).toFixed(0)}%</span>
        </div>

        <div>
          <label className="block text-text-secondary text-sm mb-1">Release</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={params.release}
            onChange={(e) => updateParam('release', parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <span className="text-xs text-text-secondary">{params.release}s</span>
        </div>

        {/* Electric Bass Specific */}
        {bassType === 'electric' && (
          <>
            <div>
              <label className="block text-text-secondary text-sm mb-1">Distortion</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.distortion}
                onChange={(e) => updateParam('distortion', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{(params.distortion * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">Brightness</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.brightness}
                onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{(params.brightness * 100).toFixed(0)}%</span>
            </div>
          </>
        )}

        {/* Acoustic Bass Specific */}
        {bassType === 'acoustic' && (
          <>
            <div>
              <label className="block text-text-secondary text-sm mb-1">Resonance</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.resonance}
                onChange={(e) => updateParam('resonance', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{(params.resonance * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">Dampening</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.dampening}
                onChange={(e) => updateParam('dampening', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{(params.dampening * 100).toFixed(0)}%</span>
            </div>
          </>
        )}

        {/* Synth Bass Specific */}
        {bassType === 'synth' && (
          <>
            <div>
              <label className="block text-text-secondary text-sm mb-1">Cutoff</label>
              <input
                type="range"
                min="50"
                max="2000"
                value={params.cutoff}
                onChange={(e) => updateParam('cutoff', parseInt(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{params.cutoff}Hz</span>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">Resonance</label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={params.resonanceQ}
                onChange={(e) => updateParam('resonanceQ', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{params.resonanceQ}</span>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">Oscillator Mix</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.oscMix}
                onChange={(e) => updateParam('oscMix', parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-xs text-text-secondary">{(params.oscMix * 100).toFixed(0)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Piano Interface - limited to bass range */}
      <div onContextMenu={(e) => e.preventDefault()} onDoubleClick={(e) => e.preventDefault()}>
        <ReactPiano
          noteRange={{ first: MidiNumbers.fromNote('C3'), last: MidiNumbers.fromNote('C5') }}
          playNote={playNote}
          stopNote={stopNote}
          width={1000}
        />
      </div>

      {/* Controls */}
      <div className="flex justify-between mt-4">
        <div>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-bg-dark font-bold py-2 px-4 rounded mr-2"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="bg-green-600 hover:bg-green-700 text-bg-dark font-bold py-2 px-4 rounded mr-2"
            >
              Record
            </button>
          )}
        </div>

        <button
          onClick={() => onExport(recording)}
          className="bg-accent hover:bg-accent-hover text-bg-dark font-bold py-2 px-4 rounded"
          disabled={recording.length === 0}
        >
          Export to Timeline
        </button>
      </div>
    </div>
  );
};

export default BassInstruments;
