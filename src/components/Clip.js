import React, { useState } from 'react';
import Waveform from './Waveform';

const Clip = ({ clip, onUpdate, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [initialX, setInitialX] = useState(0);
  const [initialLeft, setInitialLeft] = useState(0);

  const handleDragStart = (e) => {
    setIsDragging(true);
    setInitialX(e.clientX);
    setInitialLeft(clip.left);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    const deltaX = e.clientX - initialX;
    let finalLeft = initialLeft + deltaX;
    if (finalLeft < 0) finalLeft = 0;
    
    clip.player.unsync();
    const newTime = finalLeft / 100;
    clip.player.sync().start(newTime);
    onUpdate(clip.id, { left: finalLeft });
    if (typeof onPositionChange === 'function') {
      onPositionChange(clip.id, finalLeft);
    }
  };

  const handleDrag = (e) => {
    if (isDragging && e.clientX !== 0) {
      const deltaX = e.clientX - initialX;
      let newLeft = initialLeft + deltaX;
      if (newLeft < 0) newLeft = 0;
      onUpdate(clip.id, { left: newLeft });
    }
  };
  
  const clipWidth = clip.duration * 100;

  return (
    <div
      className={`absolute h-full top-0 ${clip.color} rounded-lg cursor-grab active:cursor-grabbing text-black p-2 box-border overflow-hidden select-none border-2 border-transparent hover:border-white`}
      style={{ left: `${clip.left}px`, width: `${clipWidth}px` }}
      draggable="true"
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute inset-0">
        {clip.player.loaded && <Waveform buffer={clip.player.buffer} />}
      </div>
      <span className="relative z-10 font-semibold text-sm whitespace-nowrap text-ellipsis overflow-hidden">
        {clip.name}
      </span>
    </div>
  );
};

export default Clip;