import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import Waveform from './Waveform';

const Clip = ({ clip, onUpdate, onPositionChange, trackId, onContextMenu, scrollContainerRef, timelineWidth, setTimelineWidth }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const clipRef = useRef(null);
  const cursorOffsetRef = useRef(0);
  const dragImageRef = useRef(null);

  useEffect(() => {
    const checkTransportState = () => {
      setIsMusicPlaying(Tone.Transport.state === 'started');
    };

    // Check initial state
    checkTransportState();

    // Poll for transport state changes
    const interval = setInterval(checkTransportState, 200);

    return () => clearInterval(interval);
  }, []);

  const handleDragStart = (e) => {
    // Prevent dragging during playback to avoid audio context conflicts
    if (isMusicPlaying) {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    
    if (clipRef.current) {
      clipRef.current.style.opacity = '0.5';
    }
    setIsDragging(true);
    
    const rect = clipRef.current.getBoundingClientRect();
    cursorOffsetRef.current = e.clientX - rect.left;

  
    const clampedOffsetX = Math.max(0, Math.min(cursorOffsetRef.current, rect.width));

    const dragImage = clipRef.current.cloneNode(true);

    dragImage.style.opacity = '1';
    dragImage.style.pointerEvents = 'none';

    const originalCanvas = clipRef.current.querySelector('canvas');
    if (originalCanvas) {
      const clonedCanvas = dragImage.querySelector('canvas');
      if (clonedCanvas) {
        const clonedCtx = clonedCanvas.getContext('2d');
        clonedCanvas.width = originalCanvas.width;
        clonedCanvas.height = originalCanvas.height;
        clonedCtx.drawImage(originalCanvas, 0, 0);
      }
    }

    dragImage.style.position = 'absolute';
    dragImage.style.top = '-10000px';
    dragImage.style.left = '-10000px';
    dragImage.style.width = `${rect.width}px`;
    dragImage.style.height = `${rect.height}px`;
    document.body.appendChild(dragImage);
    dragImageRef.current = dragImage;


    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(dragImage, clampedOffsetX, rect.height / 2);

    e.dataTransfer.setData('clipId', clip.id);
    e.dataTransfer.setData('sourceTrackId', trackId);
    e.dataTransfer.setData('clipLeft', clip.left);
    e.dataTransfer.setData('cursorOffset', cursorOffsetRef.current);
    e.dataTransfer.setData('application/x-clip-id', clip.id);
  };

  const handleDragEnd = (e) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    if (clipRef.current) {
      clipRef.current.style.opacity = '1';
    }
    
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    
    if (isMusicPlaying || e.clientX === 0) {
      return;
    }
    
    const timelineRect = scrollContainerRef.current.getBoundingClientRect();
    let finalLeft = e.clientX - timelineRect.left + scrollContainerRef.current.scrollLeft - cursorOffsetRef.current;
    if (finalLeft < 0) finalLeft = 0;

    try {
      if (clip.player && clip.player.loaded) {
        clip.player.unsync();
        const newTime = finalLeft / 100;
        clip.player.sync().start(newTime);
      }
    } catch (error) {
      console.warn('Error updating clip timing:', error);
    }
    
    onUpdate(clip.id, { left: finalLeft });
    if (typeof onPositionChange === 'function') {
      onPositionChange(clip.id, finalLeft);
    }
  };

  const handleDrag = (e) => {
    if (isMusicPlaying || !isDragging || e.clientX === 0) {
      return;
    }

    if (scrollContainerRef && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scrollZone = 50;
      const scrollSpeed = 15;

      if (x > rect.width - scrollZone) {
        container.scrollLeft += scrollSpeed;
        if (container.scrollLeft + container.offsetWidth >= timelineWidth - 200) {
          setTimelineWidth(prev => prev + 500);
        }
      } else if (x < scrollZone) {
        container.scrollLeft -= scrollSpeed;
      }
    }
  };
  
  const clipWidth = clip.duration * 100;

  return (
    <div
      ref={clipRef}
      className={`absolute h-full top-0 ${clip.color} rounded-lg text-black p-2 box-border overflow-hidden select-none border-2 border-transparent transition-opacity ${
        isMusicPlaying 
          ? 'cursor-not-allowed' 
          : 'cursor-grab active:cursor-grabbing hover:border-white'
      }`}
      style={{ left: `${clip.left}px`, width: `${clipWidth}px`, opacity: isDragging ? '0.5' : '1' }}
      draggable={!isMusicPlaying}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onContextMenu={onContextMenu}
      title={isMusicPlaying ? 'Stop playback to move clips' : 'Drag to move clip'}
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