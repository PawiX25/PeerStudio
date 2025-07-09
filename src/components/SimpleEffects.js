import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

let globalEffects = null;

const initializeGlobalEffects = async () => {
  if (globalEffects) return globalEffects;
  
  console.log('🎛️ Initializing global effects...');
  
  const sends = {
    reverb: new Tone.Gain(0),
    delay: new Tone.Gain(0),
    chorus: new Tone.Gain(0)
  };
  
  const effects = {
    reverb: new Tone.Reverb(2.5),
    delay: new Tone.FeedbackDelay('8n', 0.3),
    chorus: new Tone.Chorus(4, 2.5, 0.5).start()
  };
  
  sends.reverb.connect(effects.reverb);
  sends.delay.connect(effects.delay);
  sends.chorus.connect(effects.chorus);
  
  effects.reverb.toDestination();
  effects.delay.toDestination();
  effects.chorus.toDestination();
  
  await effects.reverb.ready;
  
  globalEffects = { sends, effects };
  console.log('✅ Global effects ready');
  
  return globalEffects;
};

const SimpleEffects = ({ trackId, trackName, channel }) => {
  const [sendLevels, setSendLevels] = useState({
    reverb: 0,
    delay: 0,
    chorus: 0
  });
  
  const [isReady, setIsReady] = useState(false);
  const connectionsRef = useRef([]);
  
  useEffect(() => {
    let mounted = true;
    
    const setupEffects = async () => {
      const fx = await initializeGlobalEffects();
      if (mounted) {
        setIsReady(true);
      }
    };
    
    setupEffects();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  useEffect(() => {
    if (!channel || !isReady || !globalEffects) return;
    
    console.log(`🔌 Connecting ${trackName} to effects sends`);
    
    connectionsRef.current.forEach(conn => {
      try {
        channel.disconnect(conn);
      } catch (e) {
      }
    });
    connectionsRef.current = [];
    
    Object.entries(sendLevels).forEach(([effectName, level]) => {
      if (level > 0) {
        const gain = new Tone.Gain(level);
        channel.connect(gain);
        gain.connect(globalEffects.sends[effectName]);
        connectionsRef.current.push(gain);
      }
    });
    
    return () => {
      connectionsRef.current.forEach(conn => {
        try {
          conn.disconnect();
          conn.dispose();
        } catch (e) {
        }
      });
    };
  }, [channel, sendLevels, trackName, isReady]);
  
  const updateSend = (effectName, value) => {
    setSendLevels(prev => ({
      ...prev,
      [effectName]: value
    }));
  };
  
  const testEffect = (effectName) => {
    if (!globalEffects) return;
    
    console.log(`🧪 Testing ${effectName}...`);
    const osc = new Tone.Oscillator(440, "sine");
    const gain = new Tone.Gain(0.5);
    
    osc.connect(gain);
    gain.connect(globalEffects.sends[effectName]);
    
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.dispose();
      gain.dispose();
    }, 500);
  };
  
  if (!isReady) {
    return (
      <div className="bg-bg-dark p-4 rounded-lg">
        <h3 className="text-lg font-bold text-text-primary mb-4">Simple Effects - {trackName}</h3>
        <div className="text-text-secondary">Loading effects...</div>
      </div>
    );
  }
  
  return (
    <div className="bg-bg-dark p-4 rounded-lg">
      <h3 className="text-lg font-bold text-text-primary mb-4">Simple Effects - {trackName}</h3>
      
      <div className="mb-2 text-xs text-text-secondary">
        These are send effects - they work in parallel with your dry signal.
      </div>
      
      <div className="mb-4 p-3 bg-bg-medium rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Reverb Send</h4>
          <button
            onClick={() => testEffect('reverb')}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Test
          </button>
        </div>
        <div>
          <label className="text-xs text-text-secondary">Send Level</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sendLevels.reverb}
            onChange={(e) => updateSend('reverb', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-text-secondary mt-1">
            {Math.round(sendLevels.reverb * 100)}%
          </div>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-bg-medium rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Delay Send (1/8 note)</h4>
          <button
            onClick={() => testEffect('delay')}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Test
          </button>
        </div>
        <div>
          <label className="text-xs text-text-secondary">Send Level</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sendLevels.delay}
            onChange={(e) => updateSend('delay', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-text-secondary mt-1">
            {Math.round(sendLevels.delay * 100)}%
          </div>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-bg-medium rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Chorus Send</h4>
          <button
            onClick={() => testEffect('chorus')}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Test
          </button>
        </div>
        <div>
          <label className="text-xs text-text-secondary">Send Level</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sendLevels.chorus}
            onChange={(e) => updateSend('chorus', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-text-secondary mt-1">
            {Math.round(sendLevels.chorus * 100)}%
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-bg-light rounded text-xs text-text-secondary">
        <p className="font-bold mb-1">How send effects work:</p>
        <p>• Your original audio continues to play normally</p>
        <p>• A copy is sent to each effect based on the send level</p>
        <p>• The effected signal is mixed with your original</p>
        <p>• All tracks share the same effects (like a real mixer)</p>
      </div>
    </div>
  );
};

export default SimpleEffects;
