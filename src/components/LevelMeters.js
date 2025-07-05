import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

const LevelMeter = ({ label, level, peak, color = "bg-green-500", compact = false }) => {
  const segments = 20;
  const segmentHeight = 100 / segments;
  
  // Color zones for professional meter
  const getSegmentColor = (segmentIndex) => {
    const percentage = (segmentIndex + 1) * segmentHeight;
    if (percentage > 90) return 'bg-red-500'; // Danger zone
    if (percentage > 75) return 'bg-yellow-500'; // Warning zone
    if (percentage > 50) return 'bg-green-500'; // Normal zone
    return 'bg-green-400'; // Low zone
  };
  
  const isSegmentActive = (segmentIndex) => {
    const segmentLevel = (segmentIndex + 1) * segmentHeight;
    return level >= segmentLevel;
  };
  
  const isPeakSegment = (segmentIndex) => {
    const segmentLevel = (segmentIndex + 1) * segmentHeight;
    return peak >= segmentLevel - segmentHeight && peak < segmentLevel;
  };

  const meterHeight = compact ? 'h-16' : 'h-48';
  const meterWidth = compact ? 'w-3' : 'w-6';
  const labelSize = compact ? 'text-xs' : 'text-sm';
  const displaySegments = compact ? 10 : segments;
  const compactSegmentHeight = 100 / displaySegments;
  
  return (
    <div className="flex flex-col items-center">
      <span className={`${labelSize} text-text-primary mb-1 font-bold ${compact ? 'max-w-12 truncate' : ''}`} title={label}>
        {compact && label.length > 8 ? label.substring(0, 6) + '..' : label}
      </span>
      
      {/* Level meter display */}
      <div className={`relative ${meterWidth} ${meterHeight} bg-bg-dark rounded-sm border border-gray-600`}>
        {Array.from({ length: displaySegments }, (_, i) => {
          const segmentIndex = displaySegments - 1 - i; // Reverse order (top to bottom)
          const currentSegmentHeight = compact ? compactSegmentHeight : segmentHeight;
          return (
            <div
              key={segmentIndex}
              className={`absolute w-full transition-all duration-75 ${
                isSegmentActive(segmentIndex * (compact ? 2 : 1))
                  ? getSegmentColor(segmentIndex * (compact ? 2 : 1))
                  : 'bg-gray-700'
              } ${isPeakSegment(segmentIndex * (compact ? 2 : 1)) ? 'border border-white' : ''}`}
              style={{
                height: `${currentSegmentHeight - 1}%`,
                top: `${i * currentSegmentHeight}%`,
                opacity: isSegmentActive(segmentIndex * (compact ? 2 : 1)) ? 1 : 0.3,
              }}
            />
          );
        })}
        
        {/* Peak indicator */}
        {peak > 0 && (
          <div
            className="absolute w-full h-0.5 bg-white shadow-lg transition-all duration-100"
            style={{ top: `${100 - peak}%` }}
          />
        )}
      </div>
      
      {/* Numeric display */}
      {!compact && (
        <div className="mt-3 text-center">
          <div className="text-text-secondary text-sm font-medium">
            {level > 0 ? `-${(100 - level).toFixed(0)}dB` : '-∞'}
          </div>
          <div className="text-red-400 text-sm font-bold">
            {peak > 90 ? 'CLIP' : ''}
          </div>
        </div>
      )}
      
      {/* Compact numeric display */}
      {compact && (
        <div className="mt-1 text-xs text-center">
          <div className="text-text-secondary text-xs">
            {peak > 90 ? 'CLIP' : level > 0 ? `-${(100 - level).toFixed(0)}` : '-∞'}
          </div>
        </div>
      )}
    </div>
  );
};

const LevelMeters = ({ tracks, compact = false, masterOnly = false }) => {
  const [masterLevel, setMasterLevel] = useState(0);
  const [masterPeak, setMasterPeak] = useState(0);
  const [trackLevels, setTrackLevels] = useState({});
  const [trackPeaks, setTrackPeaks] = useState({});
  
  const masterAnalyzer = useRef(null);
  const trackAnalyzers = useRef({});
  const animationFrame = useRef(null);
  const peakHoldTime = useRef({});
  const peakHoldTimeout = useRef({});

  // Initialize analyzers
  useEffect(() => {
    // Master analyzer
    if (!masterAnalyzer.current) {
      masterAnalyzer.current = new Tone.Analyser('waveform', 512);
      Tone.Destination.connect(masterAnalyzer.current);
    }

    // Track analyzers
    tracks.forEach(track => {
      if (!trackAnalyzers.current[track.id]) {
        trackAnalyzers.current[track.id] = new Tone.Analyser('waveform', 256);
        
        // Connect track clips to their analyzer
        track.clips.forEach(clip => {
          if (clip.player) {
            try {
              clip.player.disconnect();
              clip.player.connect(trackAnalyzers.current[track.id]);
              trackAnalyzers.current[track.id].connect(Tone.Destination);
            } catch (error) {
              // Handle connection errors gracefully
              console.warn('Could not connect analyzer to track:', track.name);
            }
          }
        });
      }
    });

    // Cleanup removed tracks
    Object.keys(trackAnalyzers.current).forEach(trackId => {
      const trackExists = tracks.some(track => track.id === trackId);
      if (!trackExists) {
        if (trackAnalyzers.current[trackId]) {
          trackAnalyzers.current[trackId].dispose();
          delete trackAnalyzers.current[trackId];
        }
      }
    });

  }, [tracks]);

  // Calculate RMS level from waveform data
  const calculateRMSLevel = (waveformData) => {
    if (!waveformData || waveformData.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < waveformData.length; i++) {
      sum += waveformData[i] * waveformData[i];
    }
    
    const rms = Math.sqrt(sum / waveformData.length);
    // Convert to percentage (0-100)
    return Math.min(100, rms * 200); // Scale for better visibility
  };

  // Calculate peak level from waveform data
  const calculatePeakLevel = (waveformData) => {
    if (!waveformData || waveformData.length === 0) return 0;
    
    let peak = 0;
    for (let i = 0; i < waveformData.length; i++) {
      peak = Math.max(peak, Math.abs(waveformData[i]));
    }
    
    return Math.min(100, peak * 200); // Scale for better visibility
  };

  // Update level meters
  const updateLevels = () => {
    // Update master levels
    if (masterAnalyzer.current) {
      try {
        const masterWaveform = masterAnalyzer.current.getValue();
        const newMasterLevel = calculateRMSLevel(masterWaveform);
        const newMasterPeak = calculatePeakLevel(masterWaveform);
        
        setMasterLevel(newMasterLevel);
        
        // Peak hold logic
        if (newMasterPeak > masterPeak) {
          setMasterPeak(newMasterPeak);
          clearTimeout(peakHoldTimeout.current.master);
          peakHoldTimeout.current.master = setTimeout(() => {
            setMasterPeak(prev => Math.max(0, prev - 2));
          }, 1000);
        }
      } catch (error) {
        // Handle analyzer errors gracefully
      }
    }

    // Update track levels
    tracks.forEach(track => {
      const analyzer = trackAnalyzers.current[track.id];
      if (analyzer) {
        try {
          const waveform = analyzer.getValue();
          const newLevel = calculateRMSLevel(waveform);
          const newPeak = calculatePeakLevel(waveform);
          
          setTrackLevels(prev => ({ ...prev, [track.id]: newLevel }));
          
          // Peak hold logic for tracks
          setTrackPeaks(prev => {
            const currentPeak = prev[track.id] || 0;
            if (newPeak > currentPeak) {
              clearTimeout(peakHoldTimeout.current[track.id]);
              peakHoldTimeout.current[track.id] = setTimeout(() => {
                setTrackPeaks(prevPeaks => ({
                  ...prevPeaks,
                  [track.id]: Math.max(0, (prevPeaks[track.id] || 0) - 2)
                }));
              }, 1000);
              return { ...prev, [track.id]: newPeak };
            }
            return prev;
          });
        } catch (error) {
          // Handle analyzer errors gracefully
        }
      }
    });

    animationFrame.current = requestAnimationFrame(updateLevels);
  };

  // Start/stop level monitoring
  useEffect(() => {
    animationFrame.current = requestAnimationFrame(updateLevels);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      
      // Clear peak hold timeouts
      Object.values(peakHoldTimeout.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [masterPeak, tracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (masterAnalyzer.current) {
        masterAnalyzer.current.dispose();
      }
      
      Object.values(trackAnalyzers.current).forEach(analyzer => {
        analyzer.dispose();
      });
    };
  }, []);

  if (masterOnly) {
    return (
      <div className="flex justify-center">
        <LevelMeter
          label="Master"
          level={masterLevel}
          peak={masterPeak}
          color="bg-blue-500"
          compact={compact}
        />
      </div>
    );
  }

  if (compact) {
    
    return (
      <div className="overflow-auto scrollbar-thin max-h-40">
        <div className="flex gap-2 justify-start overflow-x-auto pb-2">
          {/* Master Level Meter */}
          <LevelMeter
            label="Master"
            level={masterLevel}
            peak={masterPeak}
            color="bg-blue-500"
            compact={true}
          />
          
          {/* Track Level Meters */}
          {tracks.map(track => (
            <LevelMeter
              key={track.id}
              label={track.name}
              level={trackLevels[track.id] || 0}
              peak={trackPeaks[track.id] || 0}
              color="bg-green-500"
              compact={true}
            />
          ))}
          
          {tracks.length === 0 && (
            <div className="flex items-center text-text-secondary text-xs px-4">
              <p>No tracks for monitoring</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {tracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="mb-6">
            <LevelMeter
              label="Master"
              level={masterLevel}
              peak={masterPeak}
              color="bg-blue-500"
            />
          </div>
          <div className="text-center text-text-secondary">
            <p>No tracks available for level monitoring.</p>
            <p className="text-sm mt-2 opacity-70">Add tracks to see their audio levels.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-h-0 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 mx-auto">
            {/* Master Level Meter */}
            <div className="flex-shrink-0">
              <LevelMeter
                label="Master"
                level={masterLevel}
                peak={masterPeak}
                color="bg-blue-500"
              />
            </div>
            
            {/* Track Level Meters */}
            {tracks.map(track => (
              <div key={track.id} className="flex-shrink-0">
                <LevelMeter
                  label={track.name.length > 8 ? track.name.substring(0, 8) + '...' : track.name}
                  level={trackLevels[track.id] || 0}
                  peak={trackPeaks[track.id] || 0}
                  color="bg-green-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelMeters;
