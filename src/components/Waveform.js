import React, { useRef, useEffect } from 'react';

const Waveform = ({ buffer }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (buffer && canvasRef.current) {
      draw(buffer, canvasRef.current);
    }
  }, [buffer]);

  const draw = (buffer, canvas) => {
    const channelData = buffer.getChannelData(0);
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    context.lineWidth = 1;

    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    context.beginPath();
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      context.moveTo(i, (1 + min) * amp);
      context.lineTo(i, (1 + max) * amp);
    }
    context.stroke();
  };

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default Waveform; 