import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';

export const defaultFxSettings = {
  reverb: { enabled: false, mix: 0.5 },
  delay: { enabled: false, time: '8n', feedback: 0.2, mix: 0.3 },
  chorus: { enabled: false, frequency: 1.5, depth: 0.7, spread: 180 },
  distortion: { enabled: false, amount: 0.3 },
  eq: { enabled: false, low: 0, mid: 0, high: 0 },
  compressor: { enabled: false, threshold: -12, ratio: 4, attack: 0.003, release: 0.1 }
};

const EffectsRack = ({ trackId, trackName, channel, settings, onSettingsChange }) => {
  const [fx, setFx] = useState(settings || defaultFxSettings);

  useEffect(() => setFx(settings || defaultFxSettings), [settings]);

  useEffect(() => {
    if (!channel || !channel._effects) return;
    const e = channel._effects;
    const v = fx;
    try {
      if (e.compressor) {
        e.compressor.threshold.value = v.compressor.enabled ? v.compressor.threshold : 0;
        e.compressor.ratio.value = v.compressor.enabled ? v.compressor.ratio : 1;
        e.compressor.attack.value = v.compressor.attack;
        e.compressor.release.value = v.compressor.release;
      }
      if (e.eq) {
        e.eq.low.value = v.eq.enabled ? v.eq.low : 0;
        e.eq.mid.value = v.eq.enabled ? v.eq.mid : 0;
        e.eq.high.value = v.eq.enabled ? v.eq.high : 0;
      }
      if (e.distortion) {
        e.distortion.distortion = v.distortion.amount;
        e.distortion.wet.value = v.distortion.enabled ? 1 : 0;
      }
      if (e.chorus) {
        e.chorus.frequency.value = v.chorus.frequency;
        e.chorus.depth = v.chorus.depth;
        e.chorus.spread = v.chorus.spread;
        e.chorus.wet.value = v.chorus.enabled ? 1 : 0;
      }
      if (e.delay) {
        e.delay.delayTime.value = Tone.Time(v.delay.time).toSeconds();
        e.delay.feedback.value = v.delay.feedback;
        e.delay.wet.value = v.delay.enabled ? v.delay.mix : 0;
      }
      if (e.reverb) {
        e.reverb.wet.value = v.reverb.enabled ? v.reverb.mix : 0;
      }
    } catch (_) {}
  }, [fx, channel]);

  const commit = updated => {
    setFx(updated);
    onSettingsChange && onSettingsChange(trackId, updated);
  };
  const toggle = name => {
    commit({ ...fx, [name]: { ...fx[name], enabled: !fx[name].enabled } });
  };
  const change = (name, key, val) => {
    commit({ ...fx, [name]: { ...fx[name], [key]: val } });
  };

  return (
    <div className="bg-bg-dark p-4 rounded-lg overflow-auto">
      <h3 className="text-lg font-bold mb-4">Effects – {trackName}</h3>

      <EffectBlock title="Reverb" enabled={fx.reverb.enabled} onToggle={() => toggle('reverb')}>
        <Slider label="Mix" min={0} max={1} step={0.01} value={fx.reverb.mix} onChange={v => change('reverb','mix',v)} />
      </EffectBlock>

      <EffectBlock title="Delay" enabled={fx.delay.enabled} onToggle={() => toggle('delay')}>
        <Select label="Time" value={fx.delay.time} onChange={v=>change('delay','time',v)} opts={[['16n','1/16'],['8n','1/8'],['4n','1/4'],['2n','1/2']]} />
        <Slider label="Feedback" min={0} max={0.9} step={0.01} value={fx.delay.feedback} onChange={v=>change('delay','feedback',v)} />
        <Slider label="Mix" min={0} max={1} step={0.01} value={fx.delay.mix} onChange={v=>change('delay','mix',v)} />
      </EffectBlock>

      <EffectBlock title="Chorus" enabled={fx.chorus.enabled} onToggle={() => toggle('chorus')}>
        <Slider label="Frequency" min={0.1} max={5} step={0.1} value={fx.chorus.frequency} onChange={v=>change('chorus','frequency',v)} />
        <Slider label="Depth" min={0} max={1} step={0.01} value={fx.chorus.depth} onChange={v=>change('chorus','depth',v)} />
      </EffectBlock>

      <EffectBlock title="Distortion" enabled={fx.distortion.enabled} onToggle={() => toggle('distortion')}>
        <Slider label="Amount" min={0} max={1} step={0.01} value={fx.distortion.amount} onChange={v=>change('distortion','amount',v)} />
      </EffectBlock>

      <EffectBlock title="EQ" enabled={fx.eq.enabled} onToggle={() => toggle('eq')}>
        <Slider label="Low" min={-12} max={12} step={0.1} value={fx.eq.low} onChange={v=>change('eq','low',v)} />
        <Slider label="Mid" min={-12} max={12} step={0.1} value={fx.eq.mid} onChange={v=>change('eq','mid',v)} />
        <Slider label="High" min={-12} max={12} step={0.1} value={fx.eq.high} onChange={v=>change('eq','high',v)} />
      </EffectBlock>

      <EffectBlock title="Compressor" enabled={fx.compressor.enabled} onToggle={() => toggle('compressor')}>
        <Slider label="Threshold" min={-48} max={0} step={1} value={fx.compressor.threshold} onChange={v=>change('compressor','threshold',v)} />
        <Slider label="Ratio" min={1} max={20} step={0.1} value={fx.compressor.ratio} onChange={v=>change('compressor','ratio',v)} />
      </EffectBlock>
    </div>
  );
};

const EffectBlock = ({ title, enabled, onToggle, children }) => (
  <div className="mb-4 p-3 bg-bg-medium rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-bold">{title}</h4>
      <button onClick={onToggle} className={`px-2 py-1 rounded text-xs font-bold ${enabled?'bg-accent text-bg-dark':'bg-bg-light text-text-secondary'}`}>{enabled?'ON':'OFF'}</button>
    </div>
    {enabled && children}
  </div>
);
const Slider = ({ label, min, max, step, value, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="mb-1">
      <label className="text-xs">{label}</label>
      <div className="relative group">
        <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={e=>onChange(parseFloat(e.target.value))} 
          className="absolute top-0 left-0 w-full h-1.5 opacity-0 cursor-grab active:cursor-grabbing"
        />
        <div 
          className="absolute top-1/2 w-4 h-4 bg-white border border-gray-400 rounded-full shadow-sm transform -translate-y-1/2 pointer-events-none group-hover:border-green-500 group-hover:shadow-md group-hover:bg-slate-50 group-active:border-green-600 group-active:bg-slate-100 group-active:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};
const Select = ({ label, value, onChange, opts=[] }) => (
  <div className="mb-1">
    <label className="text-xs">{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-bg-light text-text-primary rounded px-1 py-1">
      {opts.map(([val,txt]) => <option key={val} value={val}>{txt}</option>)}
    </select>
  </div>
);

export default EffectsRack;
