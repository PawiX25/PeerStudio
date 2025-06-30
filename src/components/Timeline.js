import React, { useState, useEffect, useRef } from 'react';
import Track from './Track';
import TimelineRuler from './TimelineRuler';
import * as Tone from 'tone';

const Timeline = ({ tracks, setTracks, timelineChannel }) => {
  const [playheadPosition, setPlayheadPosition] = useState(0);
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

  return (
    <div className="flex flex-col h-full bg-bg-dark overflow-hidden">
      <div className="flex-shrink-0">
        <TimelineRuler />
      </div>
      <div ref={scrollContainerRef} className="flex-grow overflow-auto relative p-4">
        <div className="flex items-start gap-4">
          <div className="w-32 flex-shrink-0 space-y-2">
            {tracks.map(track => (
              <div key={track.id} className="h-24 flex items-center justify-end pr-4 text-text-secondary font-bold truncate">
                {track.name}
              </div>
            ))}
          </div>
          <div className="relative flex-grow">
            <div
              className="absolute top-0 h-full w-0.5 bg-accent z-10"
              style={{ left: `${playheadPosition}px` }}
            ></div>
            <div className="space-y-2">
              {tracks.map(track => (
                <Track key={track.id} track={track} setTracks={setTracks} timelineChannel={timelineChannel} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline; 