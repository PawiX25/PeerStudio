import React, { useRef } from 'react';

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
          const leftPx = clip.left * pixelsPerSecond;
          const widthPx = clip.duration * pixelsPerSecond;
          const leftPercent = (leftPx / totalWidth) * 100;
          const widthPercent = (widthPx / totalWidth) * 100;
          
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
  pixelsPerSecond,
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-auto pointer-events-none">
      {isPreviewOpen && tracks.length > 0 && (
        <div className="relative">
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

const TimelineRuler = ({ noPadding = false, widthPx = 6000, pixelsPerSecond = 100 }) => {
  const totalSeconds = Math.ceil(widthPx / pixelsPerSecond);
  const totalWidth = widthPx;

  const markers = [];
  
  let majorMarkInterval = 5; // in seconds
  let minorMarkInterval = 1; // in seconds
  let subMarkInterval = 0.25; // 1/4 second

  if (pixelsPerSecond > 400) {
    majorMarkInterval = 1;
    minorMarkInterval = 0.5;
    subMarkInterval = 0.125; // 1/8th note
  } else if (pixelsPerSecond > 150) {
    majorMarkInterval = 2;
    minorMarkInterval = 1;
    subMarkInterval = 0.25;
  } else if (pixelsPerSecond < 50) {
    majorMarkInterval = 10;
    minorMarkInterval = 5;
    subMarkInterval = 1;
  }

  for (let i = 0; i <= totalSeconds * (1/subMarkInterval); i++) {
    const timeInSeconds = i * subMarkInterval;
    const isMajor = timeInSeconds % majorMarkInterval === 0;
    const isMinor = timeInSeconds % minorMarkInterval === 0;

    const positionPx = timeInSeconds * pixelsPerSecond;

    if (positionPx > totalWidth) break;

    if (isMajor) {
      markers.push(
        <div key={timeInSeconds} className="absolute h-6 border-l border-bg-light" style={{ left: `${positionPx}px` }}>
          <span className="absolute -top-1 text-xs text-text-secondary">{timeInSeconds}</span>
        </div>
      );
    } else if (isMinor) {
      markers.push(<div key={timeInSeconds} className="absolute h-4 border-l border-opacity-50 border-bg-light" style={{ left: `${positionPx}px` }}></div>);
    } else { // sub marks
      markers.push(<div key={timeInSeconds} className="absolute h-2 border-l border-opacity-25 border-bg-light" style={{ left: `${positionPx}px` }}></div>);
    }
  }

  return (
    <div className="relative h-8 bg-bg-medium border-b border-bg-light" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
      <div className={`${noPadding ? '' : 'p-4'} h-full w-full`}>
        {markers}
      </div>
    </div>
  );
};

export default TimelineRuler;