import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';

const VolumeSlider = ({ label, volume, onChange, isMuted, onMuteToggle, color = "bg-accent" }) => {
  return (
    <div className="flex flex-col items-center p-3 bg-bg-medium rounded-lg min-w-[120px]">
      {/* Mute button and label */}
      <div className="flex flex-col items-center gap-2 mb-3">
        <button
          onClick={onMuteToggle}
          className={`p-2 rounded-lg ${isMuted ? 'bg-red-600 text-white' : 'bg-bg-light text-text-primary hover:bg-gray-600'} transition-colors`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 8V4L3 9h4v2l3-3zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C19.82 15.38 20 13.73 20 12c0-3.87-2.13-7.26-5.29-9.06l-.71.71c2.58 1.15 4.38 3.77 4.38 6.79 4.38 3.77zM4.27 3L3 4.27l6.01 6.01V18l4.5-4.5v-2.78l4.5 4.5H9v-7.73L16.73 17 18 15.73 4.27 3z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.464 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.464l3.919-3.816a1 1 0 011-.108zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <span className="text-text-primary font-bold text-sm text-center">{label}</span>
      </div>
      
      {/* Simple horizontal slider with progress fill */}
      <div className="w-full px-2">
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
      
      {/* Volume percentage display */}
      <div className="mt-3 text-sm text-text-secondary text-center font-medium">
        {isMuted ? 'MUTED' : `${volume}%`}
      </div>
    </div>
  );
};

const VolumeMixer = ({ tracks }) => {
  const [masterVolume, setMasterVolume] = useState(85);
  const [masterMuted, setMasterMuted] = useState(false);
  const [trackVolumes, setTrackVolumes] = useState({});
  const [trackMutes, setTrackMutes] = useState({});

  // Initialize track volumes
  useEffect(() => {
    tracks.forEach(track => {
      if (!trackVolumes[track.id]) {
        setTrackVolumes(prev => ({ ...prev, [track.id]: 70 }));
        setTrackMutes(prev => ({ ...prev, [track.id]: false }));
      }
    });
  }, [tracks, trackVolumes]);

  // Apply master volume
  useEffect(() => {
    const masterGain = masterMuted ? 0 : masterVolume / 100;
    Tone.Destination.volume.value = Tone.gainToDb(masterGain);
  }, [masterVolume, masterMuted]);


  // Apply individual track volumes
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

  return (
    <div className="bg-bg-dark p-4 rounded-lg h-full">
      <div className="flex gap-6 overflow-x-auto scrollbar-thin pb-2 h-full justify-center">
        {/* Master Volume */}
        <VolumeSlider
          label="Master"
          volume={masterVolume}
          onChange={setMasterVolume}
          isMuted={masterMuted}
          onMuteToggle={() => setMasterMuted(!masterMuted)}
          color="bg-red-500"
        />
        
        {/* Individual Track Volumes */}
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
    </div>
  );
};

export default VolumeMixer;
