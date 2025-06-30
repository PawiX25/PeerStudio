import React, { useRef } from 'react';
import * as Tone from 'tone';
import Clip from './Clip';

const clipColors = [
  'bg-orange-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-pink-400',
];

const Track = ({ track, setTracks, timelineChannel }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const player = new Tone.Player(url, () => {
        const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
        const newClip = {
          id: Date.now(),
          name: file.name,
          player,
          duration: player.buffer.duration,
          left: 0,
          color: randomColor,
        };
        setTracks((prevTracks) =>
          prevTracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
          )
        );
        player.connect(timelineChannel.current);
        player.sync().start(0);
      });
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    fileInputRef.current.click();
  };

  const handleClipUpdate = (clipId, updates) => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === track.id) {
          const newClips = t.clips.map((c) =>
            c.id === clipId ? { ...c, ...updates } : c
          );
          return { ...t, clips: newClips };
        }
        return t;
      })
    );
  };

  return (
    <div
        className="relative flex-grow h-24 bg-bg-medium rounded-lg border border-transparent hover:border-accent/50"
        onContextMenu={handleContextMenu}
      >
        <input
            type="file"
            accept="audio/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />
        {track.clips.map((clip) => (
            <Clip
            key={clip.id}
            clip={clip}
            onUpdate={handleClipUpdate}
            />
        ))}
      </div>
  );
};

export default Track; 