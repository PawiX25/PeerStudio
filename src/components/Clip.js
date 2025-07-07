import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import Waveform from './Waveform';

const Clip = ({ clip, onUpdate, onPositionChange, trackId, onContextMenu, scrollContainerRef, timelineWidth, setTimelineWidth }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [initialX, setInitialX] = useState(0);
  const [initialLeft, setInitialLeft] = useState(0);
  const [tempLeft, setTempLeft] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const clipRef = useRef(null);
  const cursorOffsetRef = useRef(0);

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
    setIsDragging(true);
    setInitialX(e.clientX);
    setInitialLeft(clip.left);
    setTempLeft(clip.left);

    if (clipRef.current) {
        cursorOffsetRef.current = e.clientX - clipRef.current.getBoundingClientRect().left;
    } else {
        cursorOffsetRef.current = 0;
    }

    e.dataTransfer.setData('clipId', clip.id);
    e.dataTransfer.setData('sourceTrackId', trackId);
    e.dataTransfer.setData('clipLeft', clip.left);
    e.dataTransfer.setData('cursorOffset', cursorOffsetRef.current);
    // Add specific identifier for clip drags to avoid conflicts with track drags
    e.dataTransfer.setData('application/x-clip-id', clip.id);
    e.dataTransfer.setData('startX', String(e.clientX));
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    setTempLeft(null);
    
    // Only process drag end if not playing music
    if (isMusicPlaying) {
      return;
    }
    
    if (scrollContainerRef && scrollContainerRef.current) {
        const timelineRect = scrollContainerRef.current.getBoundingClientRect();
        let finalLeft = e.clientX - timelineRect.left + scrollContainerRef.current.scrollLeft - cursorOffsetRef.current;
        if (finalLeft < 0) finalLeft = 0;

        // Safely update audio player timing only when not playing
        try {
          if (clip.player && clip.player.loaded) {
            clip.player.unsync();
            const newTime = finalLeft / 100; // 100px per second
            clip.player.sync().start(newTime);
          }
        } catch (error) {
          console.warn('Error updating clip timing:', error);
        }
        
        onUpdate(clip.id, { left: finalLeft });
        if (typeof onPositionChange === 'function') {
          onPositionChange(clip.id, finalLeft);
        }
    } else {
        const deltaX = e.clientX - initialX;
        let finalLeft = initialLeft + deltaX;
        if (finalLeft < 0) finalLeft = 0;
        onUpdate(clip.id, { left: finalLeft });
        if (typeof onPositionChange === 'function') {
          onPositionChange(clip.id, finalLeft);
        }
    }
  };

  const handleDrag = (e) => {
    // Don't process drag events during playback
    if (isMusicPlaying) {
      return;
    }
    
    if (isDragging && e.clientX !== 0) {
        if (scrollContainerRef && scrollContainerRef.current) {
            const timelineRect = scrollContainerRef.current.getBoundingClientRect();
            let newLeft = e.clientX - timelineRect.left + scrollContainerRef.current.scrollLeft - cursorOffsetRef.current;
            if (newLeft < 0) newLeft = 0;
            setTempLeft(newLeft);
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
    }
  };
  
  const clipWidth = clip.duration * 100; // 100px per second

  return (
    <div
      ref={clipRef}
      className={`absolute h-full top-0 ${clip.color} rounded-lg text-black p-2 box-border overflow-hidden select-none border-2 border-transparent ${
        isMusicPlaying 
          ? 'cursor-not-allowed opacity-75' 
          : 'cursor-grab active:cursor-grabbing hover:border-white'
      }`}
      style={{ left: `${(isDragging && tempLeft !== null) ? tempLeft : clip.left}px`, width: `${clipWidth}px` }}
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