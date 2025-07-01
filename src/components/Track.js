import React, { useRef, useState } from 'react';
import * as Tone from 'tone';
import Clip from './Clip';
import generateId from '../utils/generateId';

const clipColors = [
  'bg-orange-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-pink-400',
];

const Track = ({ track, setTracks, timelineChannel, onClipMove, onClipDrop }) => {
const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const player = new Tone.Player(url, () => {
        const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
        const newClip = {
          id: generateId(),
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

  const handleClipPositionChange = (clipId, newLeft) => {
    if (onClipMove) {
      onClipMove(track.name, clipId, newLeft);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const clipId = e.dataTransfer.getData('clipId');
    const sourceTrackId = e.dataTransfer.getData('sourceTrackId');
    const clipLeft = parseFloat(e.dataTransfer.getData('clipLeft')) || 0;
    onClipDrop(clipId, sourceTrackId, track.id, clipLeft);
  };

  const isLabelObscured = track.clips.some((clip) => clip.left < 50);

  return (
    <div
      className={`relative h-24 bg-bg-medium rounded-lg border-2 ${isDragOver ? 'border-accent' : 'border-transparent hover:border-accent/50'}`}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!isLabelObscured && (
        <div className="absolute top-2 left-3 text-text-secondary font-bold z-10 pointer-events-none opacity-70">
          {track.name}
        </div>
      )}
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
          onPositionChange={handleClipPositionChange}
          trackId={track.id}
        />
      ))}
    </div>
  );
};

export default Track; 