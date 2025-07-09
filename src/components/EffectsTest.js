import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

const EffectsTest = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);
  const channelRef = useRef(null);
  const reverbRef = useRef(null);
  
  useEffect(() => {
    // Create simple synth -> channel -> reverb -> destination chain
    channelRef.current = new Tone.Channel().toDestination();
    synthRef.current = new Tone.Synth().connect(channelRef.current);
    
    // Add reverb
    reverbRef.current = new Tone.Reverb({
      decay: 4,
      wet: 0.5
    });
    
    // Insert reverb into chain
    channelRef.current.disconnect();
    channelRef.current.connect(reverbRef.current);
    reverbRef.current.toDestination();
    
    return () => {
      synthRef.current?.dispose();
      channelRef.current?.dispose();
      reverbRef.current?.dispose();
    };
  }, []);
  
  const playNote = () => {
    if (Tone.context.state !== 'running') {
      Tone.context.resume();
    }
    synthRef.current.triggerAttackRelease('C4', '8n');
  };
  
  const toggleReverb = () => {
    if (reverbRef.current) {
      reverbRef.current.wet.value = reverbRef.current.wet.value > 0 ? 0 : 0.5;
      console.log('Reverb wet:', reverbRef.current.wet.value);
    }
  };
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Effects Test</h3>
      <div className="space-x-4">
        <button 
          onClick={playNote}
          className="px-4 py-2 bg-accent rounded"
        >
          Play Test Note
        </button>
        <button 
          onClick={toggleReverb}
          className="px-4 py-2 bg-blue-500 rounded"
        >
          Toggle Reverb
        </button>
      </div>
    </div>
  );
};

export default EffectsTest;
