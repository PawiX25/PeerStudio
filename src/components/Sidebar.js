import React, { useState, useEffect, useRef } from 'react';
import LevelMeters from './LevelMeters';
import * as Tone from 'tone';

const VolumeSlider = ({ label, volume, onChange, isMuted, onMuteToggle, color = "bg-accent", compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={onMuteToggle}
          className={`p-1 rounded ${isMuted ? 'bg-red-600 text-white' : 'bg-bg-light text-text-primary hover:bg-gray-600'} transition-colors`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
              <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
            </svg>
          )}
        </button>
        <span className="text-xs font-medium text-text-primary">{label}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={isMuted}
          className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          style={{
            background: isMuted 
              ? '#4B5563' 
              : `linear-gradient(to right, #22c55e 0%, #22c55e ${volume}%, #4B5563 ${volume}%, #4B5563 100%)`
          }}
        />
        <span className="text-xs text-text-secondary w-8 text-right">
          {isMuted ? 'M' : `${volume}`}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center p-2 bg-bg-medium rounded-lg min-w-[100px]">
      <div className="flex flex-col items-center gap-1 mb-2">
        <button
          onClick={onMuteToggle}
          className={`p-1.5 rounded-lg ${isMuted ? 'bg-red-600 text-white' : 'bg-bg-light text-text-primary hover:bg-gray-600'} transition-colors`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
              <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
            </svg>
          )}
        </button>
        <span className="text-xs font-bold text-text-primary text-center">{label}</span>
      </div>
      
      <div className="w-full px-1">
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={isMuted}
          className="simple-volume-slider w-full"
          style={{
            background: isMuted 
              ? '#4B5563' 
              : `linear-gradient(to right, #22c55e 0%, #22c55e ${volume}%, #4B5563 ${volume}%, #4B5563 100%)`
          }}
        />
      </div>
      
      <div className="mt-1 text-xs text-text-secondary text-center font-medium">
        {isMuted ? 'MUTED' : `${volume}%`}
      </div>
    </div>
  );
};

const Sidebar = ({ onAddTrack, tracks, setTracks }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [masterVolume, setMasterVolume] = useState(85);
  const [masterMuted, setMasterMuted] = useState(false);
  const [trackVolumes, setTrackVolumes] = useState({});
  const [trackMutes, setTrackMutes] = useState({});

  const getProjectDuration = () => {
    if (tracks.length === 0) {
      return 0;
    }
    
    let maxDuration = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipStart = clip.left / 100;
        const clipDuration = clip.duration || 0;
        const clipEnd = clipStart + clipDuration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });
    
    return maxDuration;
  };

  const getTotalClips = () => {
    return tracks.reduce((sum, track) => sum + track.clips.length, 0);
  };

  useEffect(() => {
    tracks.forEach(track => {
      if (!trackVolumes[track.id]) {
        setTrackVolumes(prev => ({ ...prev, [track.id]: 70 }));
        setTrackMutes(prev => ({ ...prev, [track.id]: false }));
      }
    });
  }, [tracks, trackVolumes]);

  useEffect(() => {
    const masterGain = masterMuted ? 0 : masterVolume / 100;
    Tone.Destination.volume.value = Tone.gainToDb(masterGain);
  }, [masterVolume, masterMuted]);

  useEffect(() => {
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.player && clip.player.volume) {
          const trackVolume = trackVolumes[track.id] || 70;
          const trackMuted = trackMutes[track.id] || false;
          const gain = trackMuted ? 0 : trackVolume / 100;
          clip.player.volume.value = Tone.gainToDb(gain);
        }
      });
    });
  }, [tracks, trackVolumes, trackMutes]);

  const handleTrackVolumeChange = (trackId, volume) => {
    setTrackVolumes(prev => ({ ...prev, [trackId]: volume }));
  };

  const handleTrackMuteToggle = (trackId) => {
    setTrackMutes(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`bg-bg-medium border-r border-bg-light flex flex-col h-full overflow-hidden transition-all duration-500 ease-out transform ${
      isCollapsed ? 'w-32' : 'w-80'
    } hover:shadow-lg`}>
      <div className="relative">
        <div className={`p-3 flex items-center border-b border-bg-light transition-all duration-300 ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <h3 className={`font-bold text-text-primary transition-all duration-300 ${
            isCollapsed ? 'text-xs opacity-0 w-0 overflow-hidden' : 'text-md opacity-100'
          }`}>
            Audio Control
          </h3>
          
          <button
            onClick={toggleCollapse}
            className={`relative p-2 rounded-lg transition-all duration-300 ease-out group bg-bg-medium hover:bg-bg-light text-text-primary hover:scale-105 active:scale-95 ${
              isCollapsed ? 'shadow-lg' : ''
            }`}
            title={isCollapsed ? 'Expand Audio Controls' : 'Collapse to Master Only'}
          >
            <div className="relative w-4 h-4 overflow-hidden">
              <svg 
                className={`absolute inset-0 w-4 h-4 transition-all duration-300 ease-out transform ${
                  isCollapsed 
                    ? 'translate-x-0 opacity-100 rotate-0' 
                    : 'translate-x-6 opacity-0 rotate-90'
                }`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              
              <svg 
                className={`absolute inset-0 w-4 h-4 transition-all duration-300 ease-out transform ${
                  isCollapsed 
                    ? '-translate-x-6 opacity-0 -rotate-90' 
                    : 'translate-x-0 opacity-100 rotate-0'
                }`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        </div>
      </div>
      
      {isCollapsed && (
        <div className="flex-1 flex flex-col p-3 animate-fadeIn">
          <div className="space-y-2 mb-4">
            <div className="flex flex-col items-center justify-center bg-bg-dark rounded-lg p-2">
              <div className="text-xs text-text-secondary font-bold">TRACKS</div>
              <div className="text-lg font-bold text-text-primary">{tracks.length}</div>
            </div>
            <div className="flex flex-col items-center justify-center bg-bg-dark rounded-lg p-2">
              <div className="text-xs text-text-secondary font-bold">CLIPS</div>
              <div className="text-lg font-bold text-text-primary">{getTotalClips()}</div>
            </div>
            <div className="flex flex-col items-center justify-center bg-bg-dark rounded-lg p-2">
              <div className="text-xs text-text-secondary font-bold">DURATION</div>
              <div className="text-lg font-bold text-text-primary">
                {getProjectDuration() > 0 ? `${getProjectDuration().toFixed(1)}s` : '0.0s'}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center my-4 min-h-[200px]">
            <div className="transform scale-125">
              <LevelMeters tracks={tracks} compact={false} masterOnly={true} />
            </div>
          </div>
          
          <div className="mb-3">
            <button
              onClick={() => setMasterMuted(!masterMuted)}
              className={`w-full p-3 rounded-lg text-lg font-bold transition-all transform hover:scale-105 active:scale-95 ${
                masterMuted 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-bg-light text-text-primary hover:bg-gray-600 shadow-md'
              }`}
              title={masterMuted ? 'Unmute Master' : 'Mute Master'}
            >
              {masterMuted ? (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                  <span className="text-xs font-bold">MUTED</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                  </svg>
                  <span className="text-xs font-bold">MASTER</span>
                </div>
              )}
            </button>
          </div>
          
          <div className="space-y-2 pb-4">
            <div className="flex flex-col items-center justify-center bg-bg-dark rounded-lg p-3">
              <div className="text-xs text-text-secondary font-bold mb-1">VOLUME</div>
              <div className="text-xl font-bold text-text-primary">
                {masterMuted ? 'MUTED' : `${masterVolume}%`}
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={masterMuted ? 0 : masterVolume}
              onChange={(e) => setMasterVolume(parseInt(e.target.value))}
              disabled={masterMuted}
              className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer simple-volume-slider"
              style={{
                background: masterMuted 
                  ? '#4B5563' 
                  : `linear-gradient(to right, #22c55e 0%, #22c55e ${masterVolume}%, #4B5563 ${masterVolume}%, #4B5563 100%)`
              }}
            />
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
          <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
            <h4 className="text-sm font-bold text-text-primary mb-3 flex-shrink-0">Audio Levels</h4>
            <div className="bg-bg-dark rounded-lg p-4 flex-1 min-h-[200px] overflow-auto transform transition-all duration-300 hover:shadow-inner">
              <LevelMeters tracks={tracks} compact={false} />
            </div>
          </div>
          
          <div className="px-4 pb-4 flex-shrink-0">
            <h4 className="text-sm font-bold text-text-primary mb-3 transform transition-all duration-300">Volume Mixer</h4>
            <div className="bg-bg-dark rounded-lg p-3 max-h-[300px] overflow-auto transform transition-all duration-300 hover:shadow-inner">
              <div className="space-y-3">
                <div className="pb-3 border-b border-bg-light">
                  <VolumeSlider
                    label="Master"
                    volume={masterVolume}
                    onChange={setMasterVolume}
                    isMuted={masterMuted}
                    onMuteToggle={() => setMasterMuted(!masterMuted)}
                    color="bg-red-500"
                  />
                </div>
                
                <div className="space-y-2">
                  {tracks.map(track => (
                    <VolumeSlider
                      key={track.id}
                      label={track.name}
                      volume={trackVolumes[track.id] || 70}
                      onChange={(volume) => handleTrackVolumeChange(track.id, volume)}
                      isMuted={trackMutes[track.id] || false}
                      onMuteToggle={() => handleTrackMuteToggle(track.id)}
                      color="bg-purple-500"
                    />
                  ))}
                      </div>
                
                {tracks.length === 0 && (
                  <div className="text-center text-text-secondary py-4 text-sm">
                    <p>No tracks available</p>
                    <p className="text-xs mt-1">Add tracks to control their volume</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;