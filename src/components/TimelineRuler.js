import React from 'react';

const TimelineRuler = ({ noPadding = false }) => {
  const pixelsPerSecond = 100;
  const totalSeconds = 60 * 5; // 5 minutes
  const totalWidth = totalSeconds * pixelsPerSecond;
  const majorMarkInterval = 5; // seconds
  const minorMarkInterval = 1; // seconds

  const markers = [];
  for (let i = 0; i <= totalSeconds; i++) {
    const isMajor = i % majorMarkInterval === 0;
    const isMinor = i % minorMarkInterval === 0;
    const isBeat = i % 1 === 0;

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