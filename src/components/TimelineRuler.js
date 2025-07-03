import React, { useRef, useState } from 'react';

const TimelinePreview = ({
  tracks,
  totalWidth,
  viewportWidth,
  scrollLeft,
  onPreviewNavigate,
  pixelsPerSecond,
}) => {
  const previewRef = useRef(null);

  const handleNavigation = (e) => {
    if (!previewRef.current) return;
    const previewRect = previewRef.current.getBoundingClientRect();
    const clickX = e.clientX - previewRect.left;

    const newScrollLeft = (clickX / previewRect.width) * totalWidth - viewportWidth / 2;

    onPreviewNavigate(Math.max(0, Math.min(newScrollLeft, totalWidth - viewportWidth)));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleNavigation(e);

    const handleMouseMove = (moveE) => {
      handleNavigation(moveE);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const previewHeight = Math.max(40, tracks.length * 5);

  return (
    <div
      ref={previewRef}
      className="relative bg-bg-light h-12 w-full cursor-pointer"
      style={{ height: `${previewHeight}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Clips */}
      {tracks.map((track, trackIndex) =>
        track.clips.map((clip) => {
          const leftPercent = (clip.left / totalWidth) * 100;
          const widthPercent = ((clip.duration * pixelsPerSecond) / totalWidth) * 100;
          return (
            <div
              key={clip.id}
              className={`absolute ${clip.color || 'bg-accent'} opacity-70 rounded-sm`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: `${(trackIndex / tracks.length) * previewHeight + 2}px`,
                height: `${Math.max(2, (1 / tracks.length) * previewHeight - 2)}px`,
              }}
            ></div>
          );
        })
      )}

      {/* Viewport Window */}
      <div
        className="absolute top-0 h-full bg-white bg-opacity-25 border-2 border-white rounded pointer-events-none"
        style={{
          left: `${(scrollLeft / totalWidth) * 100}%`,
          width: `${(viewportWidth / totalWidth) * 100}%`,
        }}
      ></div>
    </div>
  );
};

export const TimelinePreviewContainer = ({
  widthPx,
  tracks,
  scrollLeft,
  viewportWidth,
  onPreviewNavigate,
  isPreviewOpen,
  onToggle,
}) => {
  const pixelsPerSecond = 100;

  return (
    <div className="absolute top-0 left-0 w-full h-auto pointer-events-none">
      {tracks.length > 0 && (
        <button
          onClick={() => onToggle(!isPreviewOpen)}
          className="absolute top-1 right-2 z-20 px-2 py-1 text-xs bg-bg-light rounded text-text-secondary hover:bg-bg-light-hover pointer-events-auto"
          title={isPreviewOpen ? 'Hide timeline preview' : 'Show timeline preview'}
        >
          {isPreviewOpen ? 'Hide' : 'Show'}
        </button>
      )}

      {isPreviewOpen && tracks.length > 0 && (
        <div className="relative pt-8">
          <div className="w-full h-auto mt-2 pointer-events-auto bg-bg-medium p-2 rounded-b-lg">
            <TimelinePreview
              tracks={tracks}
              totalWidth={widthPx}
              viewportWidth={viewportWidth}
              scrollLeft={scrollLeft}
              onPreviewNavigate={onPreviewNavigate}
              pixelsPerSecond={pixelsPerSecond}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const TimelineRuler = ({ noPadding = false, widthPx = 6000 }) => {
  const pixelsPerSecond = 100;
  const totalSeconds = Math.ceil(widthPx / pixelsPerSecond);
  const totalWidth = widthPx;
  const majorMarkInterval = 5; // seconds
  const minorMarkInterval = 1; // seconds

  const markers = [];
  for (let i = 0; i <= totalSeconds; i++) {
    const isMajor = i % majorMarkInterval === 0;
    const isMinor = i % minorMarkInterval === 0;

    if (isMajor) {
      markers.push(
        <div key={i} className="absolute h-6 border-l border-bg-light" style={{ left: `${i * pixelsPerSecond}px` }}>
          <span className="absolute -top-1 text-xs text-text-secondary">{i}</span>
        </div>
      );
    } else if (isMinor) {
      markers.push(<div key={i} className="absolute h-4 border-l border-opacity-50 border-bg-light" style={{ left: `${i * pixelsPerSecond}px` }}></div>);
    }
  }

  return (
    <div className="relative h-8 bg-bg-medium" style={{ width: `${totalWidth}px` }}>
      <div className={`${noPadding ? '' : 'p-4'} h-full`}>
        {markers}
      </div>
    </div>
  );
};

export default TimelineRuler;