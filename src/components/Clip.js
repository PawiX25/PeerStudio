import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import Waveform from './Waveform';

const Clip = ({ clip, onUpdate, trackId, onContextMenu, scrollContainerRef, timelineWidth, setTimelineWidth, pixelsPerSecond, soloedClipId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const clipRef = useRef(null);
  const cursorOffsetRef = useRef(0);
  const dragImageRef = useRef(null);

  useEffect(() => {
    const checkTransportState = () => {
      setIsMusicPlaying(Tone.Transport.state === 'started');
    };

    checkTransportState();

    const interval = setInterval(checkTransportState, 200);

    return () => clearInterval(interval);
  }, []);

  const handleDragStart = (e) => {
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
    let finalLeftPx = e.clientX - timelineRect.left + scrollContainerRef.current.scrollLeft - cursorOffsetRef.current;
    if (finalLeftPx < 0) finalLeftPx = 0;

    const finalLeftSeconds = finalLeftPx / pixelsPerSecond;

    try {
      if (clip.player && clip.player.loaded) {
        clip.player.unsync();
        clip.player.sync().start(finalLeftSeconds);
      }
    } catch (error) {
      console.warn('Error updating clip timing:', error);
    }
    
    onUpdate(clip.id, { left: finalLeftSeconds });
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
  
  const clipWidth = clip.duration * pixelsPerSecond;
  const leftPosition = clip.left * pixelsPerSecond;

  return (
    <div
      ref={clipRef}
      className={`absolute h-full top-0 ${clip.color} rounded-lg text-black p-2 box-border overflow-hidden select-none border-2 transition-opacity ${
        soloedClipId === clip.id 
          ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' 
          : 'border-transparent hover:border-white'
      } ${
        isMusicPlaying 
          ? 'cursor-not-allowed' 
          : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ left: `${leftPosition}px`, width: `${clipWidth}px`, opacity: isDragging ? '0.5' : '1' }}
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
      <div className="relative z-10 flex items-center gap-2">
        <span className="font-semibold text-sm whitespace-nowrap text-ellipsis overflow-hidden">
          {clip.name}
        </span>
        {soloedClipId === clip.id && (
          <span className="text-yellow-900 text-xs font-bold bg-yellow-400 px-1.5 py-0.5 rounded whitespace-nowrap">
            SOLO
          </span>
        )}
      </div>
    </div>
  );
};

export default Clip;