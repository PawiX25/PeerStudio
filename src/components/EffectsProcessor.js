import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

const EffectsProcessor = ({ trackId, trackName, track }) => {
  const [effects, setEffects] = useState({
    reverb: { enabled: false, mix: 0.5, roomSize: 0.7 },
    delay: { enabled: false, time: '8n', feedback: 0.2, mix: 0.3 },
    chorus: { enabled: false, frequency: 1.5, depth: 0.7, spread: 180 },
    distortion: { enabled: false, amount: 0.3 },
    eq: { enabled: false, low: 0, mid: 0, high: 0 },
    compressor: { enabled: false, threshold: -12, ratio: 4, attack: 0.003, release: 0.1 }
  });

  const [isLoading, setIsLoading] = useState(false);
  const effectsRef = useRef({});
  const soloChannelRef = useRef(null);

  const testEffects = async () => {
    console.log('🧪 Testing effects...');
    
    const osc = new Tone.Oscillator(440, "sine").toDestination();
    
    const reverb = new Tone.Reverb(2).toDestination();
    osc.disconnect();
    osc.connect(reverb);
    
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.dispose();
      reverb.dispose();
      console.log('✅ Test complete - you should have heard reverb');
    }, 1000);
  };

  const processTrackWithEffects = async (trackClips) => {
    if (!trackClips || trackClips.length === 0) {
      alert('No clips in track to process');
      return;
    }

    setIsLoading(true);
    console.log('🎛️ Processing track with effects...');

    try {
      const totalDuration = trackClips.reduce((max, clip) => 
        Math.max(max, clip.left + clip.duration), 0
      ) + 1;

      const processedBuffer = await Tone.Offline(async ({ transport }) => {
        const fxChain = [];
        
        if (effects.compressor.enabled) {
          const comp = new Tone.Compressor({
            threshold: effects.compressor.threshold,
            ratio: effects.compressor.ratio,
            attack: effects.compressor.attack,
            release: effects.compressor.release
          });
          fxChain.push(comp);
        }

        if (effects.eq.enabled) {
          const eq = new Tone.EQ3({
            low: effects.eq.low,
            mid: effects.eq.mid,
            high: effects.eq.high
          });
          fxChain.push(eq);
        }

        if (effects.distortion.enabled) {
          const dist = new Tone.Distortion({
            distortion: effects.distortion.amount,
            wet: 1
          });
          fxChain.push(dist);
        }

        if (effects.chorus.enabled) {
          const chorus = new Tone.Chorus({
            frequency: effects.chorus.frequency,
            depth: effects.chorus.depth,
            spread: effects.chorus.spread
          }).start();
          fxChain.push(chorus);
        }

        if (effects.delay.enabled) {
          const delay = new Tone.FeedbackDelay({
            delayTime: effects.delay.time,
            feedback: effects.delay.feedback,
            wet: effects.delay.mix
          });
          fxChain.push(delay);
        }

        if (effects.reverb.enabled) {
          const reverb = new Tone.Reverb({
            decay: 2,
            wet: effects.reverb.mix
          });
          await reverb.ready;
          fxChain.push(reverb);
        }

        let lastNode = null;
        for (let i = 0; i < fxChain.length; i++) {
          if (i === 0) {
            fxChain[i].toDestination();
          } else {
            lastNode.connect(fxChain[i]);
          }
          lastNode = fxChain[i];
        }

        for (const clip of trackClips) {
          if (clip.player && clip.player.buffer) {
            const player = new Tone.Player(clip.player.buffer);
            
            if (fxChain.length > 0) {
              player.connect(fxChain[0]);
            } else {
              player.toDestination();
            }
            
            player.start(clip.left);
          }
        }

        transport.start();
      }, totalDuration);

      console.log('✅ Processing complete');
      
      if (soloChannelRef.current) {
        soloChannelRef.current.dispose();
      }
      
      soloChannelRef.current = new Tone.Player(processedBuffer).toDestination();
      
      return processedBuffer;
      
    } catch (error) {
      console.error('Error processing effects:', error);
      alert('Error processing effects: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const playProcessed = () => {
    if (soloChannelRef.current) {
      soloChannelRef.current.start();
    }
  };

  const exportProcessed = async (trackClips) => {
    const buffer = await processTrackWithEffects(trackClips);
    if (!buffer) return;

    const wav = bufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trackName}_with_effects.wav`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const bufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    let offset = 44;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const updateEffect = (effectName, param, value) => {
    setEffects(prev => ({
      ...prev,
      [effectName]: {
        ...prev[effectName],
        [param]: value
      }
    }));
  };

  const toggleEffect = (effectName) => {
    setEffects(prev => ({
      ...prev,
      [effectName]: {
        ...prev[effectName],
        enabled: !prev[effectName].enabled
      }
    }));
  };

  return (
    <div className="bg-bg-dark p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">Effects Processor - {trackName}</h3>
        <div className="space-x-2">
          <button
            onClick={testEffects}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            disabled={isLoading}
          >
            Test Effects
          </button>
          <button
            onClick={() => {
              if (track && track.clips) {
                processTrackWithEffects(track.clips);
              }
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            disabled={isLoading || !track || !track.clips || track.clips.length === 0}
          >
            {isLoading ? 'Processing...' : 'Process Track'}
          </button>
          <button
            onClick={playProcessed}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
            disabled={!soloChannelRef.current || isLoading}
          >
            Play Processed
          </button>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-bg-medium rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Reverb</h4>
          <button
            onClick={() => toggleEffect('reverb')}
            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
              effects.reverb.enabled ? 'bg-accent text-bg-dark' : 'bg-bg-light text-text-secondary'
            }`}
          >
            {effects.reverb.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {effects.reverb.enabled && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">Mix</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effects.reverb.mix}
                onChange={(e) => updateEffect('reverb', 'mix', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
      <div className="mb-4 p-3 bg-bg-medium rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-text-primary">Delay</h4>
          <button
            onClick={() => toggleEffect('delay')}
            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
              effects.delay.enabled ? 'bg-accent text-bg-dark' : 'bg-bg-light text-text-secondary'
            }`}
          >
            {effects.delay.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {effects.delay.enabled && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">Time</label>
              <select
                value={effects.delay.time}
                onChange={(e) => updateEffect('delay', 'time', e.target.value)}
                className="w-full bg-bg-dark text-text-primary px-2 py-1 rounded"
              >
                <option value="16n">1/16</option>
                <option value="8n">1/8</option>
                <option value="4n">1/4</option>
                <option value="2n">1/2</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Feedback</label>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.01"
                value={effects.delay.feedback}
                onChange={(e) => updateEffect('delay', 'feedback', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Mix</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effects.delay.mix}
                onChange={(e) => updateEffect('delay', 'mix', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-text-secondary">
        <p>This processor renders effects offline. Click "Process Track" to apply effects, then "Play Processed" to hear the result.</p>
      </div>
    </div>
  );
};

export default EffectsProcessor;
