import React, { useRef, useEffect } from 'react';

const Waveform = ({ buffer }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (buffer && canvasRef.current) {
      draw(buffer, canvasRef.current);
    }
  }, [buffer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      if (buffer) {
        draw(buffer, canvas);
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [buffer]);

  const draw = (buffer, canvas) => {
    const channelData = buffer.getChannelData(0);
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    context.clearRect(0, 0, width, height);
    
    // Use better colors that contrast with the clip background
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 0.5;

    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;
    const centerY = height / 2;

    // Draw filled waveform for better visibility
    context.beginPath();
    context.moveTo(0, centerY);
    
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step && (i * step) + j < channelData.length; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      const maxY = centerY + (max * amp * 0.9);
      
      context.lineTo(i, maxY);
    }
    
    // Complete the top line
    for (let i = width - 1; i >= 0; i--) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step && (i * step) + j < channelData.length; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      const minY = centerY + (min * amp * 0.9);
      context.lineTo(i, minY);
    }
    
    context.closePath();
    context.fill();
    
    // Draw center line for reference
    context.beginPath();
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.lineWidth = 1;
    context.moveTo(0, centerY);
    context.lineTo(width, centerY);
    context.stroke();
  };

  return <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />;
};

export default Waveform; 