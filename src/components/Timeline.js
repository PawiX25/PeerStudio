import React, { useState, useEffect, useRef } from 'react';
import Track from './Track';
import TimelineRuler from './TimelineRuler';
import * as Tone from 'tone';

const Timeline = ({ tracks, setTracks, timelineChannel, onClipDrop }) => {
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [draggedTrackId, setDraggedTrackId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let rafId;

    const pixelsPerSecond = 100; // how many timeline pixels correspond to one second

    const updatePlayhead = () => {
      const positionSeconds = Tone.Transport.seconds;
      const newPosition = positionSeconds * pixelsPerSecond;

      setPlayheadPosition(newPosition);

      if (scrollContainerRef.current && Tone.Transport.state === 'started') {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        scrollContainerRef.current.scrollLeft = newPosition - containerWidth / 2;
      }

      rafId = requestAnimationFrame(updatePlayhead);
    };

    // kick off the animation loop
    rafId = requestAnimationFrame(updatePlayhead);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleDragStart = (e, trackId) => {
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();

    const isClipDrag = !!e.dataTransfer.getData('clipId');
    if (isClipDrag) return;

    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId && draggedId !== '') {
      const draggedIndex = tracks.findIndex(t => t.id === draggedId);
      if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
        const newTracks = [...tracks];
        const [draggedTrack] = newTracks.splice(draggedIndex, 1);
        newTracks.splice(dropIndex, 0, draggedTrack);
        setTracks(newTracks);
      }
    }
    
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark overflow-hidden">
      <div className="flex-shrink-0 flex items-center">
        <div className="w-32 flex-shrink-0 pr-4" />
        <div className="flex-grow pl-4">
          <TimelineRuler />
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-grow overflow-auto relative">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
          style={{ left: `${playheadPosition + 128 + 16}px` }}
        />
        <div className="space-y-2 py-2">
          {tracks.map((track, index) => (
            <div key={track.id}>
              {draggedTrackId && dragOverIndex === index && draggedTrackId !== track.id && (
                <div className="h-2 bg-accent rounded-md mb-2 opacity-75"></div>
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, track.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-start gap-4 cursor-move transition-opacity ${
                  draggedTrackId === track.id ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <div className="w-32 flex-shrink-0 h-24 flex items-center justify-end pr-4 text-text-secondary font-bold truncate">
                  {track.name}
                </div>
                <div className="flex-grow pr-4">
                  <Track
                    track={track}
                    setTracks={setTracks}
                    timelineChannel={timelineChannel}
                    onClipDrop={onClipDrop}
                    trackId={track.id}
                  />
                </div>
              </div>
            </div>
          ))}
          {draggedTrackId && dragOverIndex === tracks.length && (
            <div className="h-2 bg-accent rounded-md opacity-75"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline; 