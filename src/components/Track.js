import React, { useRef, useState } from 'react';
import * as Tone from 'tone';
import Clip from './Clip';
import generateId from '../utils/generateId';

const clipColors = [
  'bg-orange-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-pink-400',
];

const Track = ({ track, setTracks, timelineChannel, onClipMove, onClipDrop }) => {
const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const player = new Tone.Player(url, () => {
        const randomColor = clipColors[Math.floor(Math.random() * clipColors.length)];
        const newClip = {
          id: generateId(),
          name: file.name,
          player,
          duration: player.buffer.duration,
          left: 0,
          color: randomColor,
        };
        setTracks((prevTracks) =>
          prevTracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
          )
        );
        player.connect(timelineChannel.current);
        player.sync().start(0);
      });
    }
  };

  const handleContextMenu = async (event) => {
    event.preventDefault();
    
    // If track has no clips, offer to add audio files
    if (track.clips.length === 0) {
      fileInputRef.current.click();
      return;
    }
    
    // Export/download track audio
    try {
      await exportTrackAudio();
    } catch (error) {
      console.error('Error exporting track:', error);
      alert('Error exporting track audio. Please try again.');
    }
  };
  
  const exportTrackAudio = async () => {
    if (track.clips.length === 0) {
      alert('No clips to export in this track.');
      return;
    }
    
    // Calculate total duration needed
    const totalDuration = track.clips.reduce((max, clip) => {
      return Math.max(max, (clip.left / 100) + clip.duration);
    }, 0) + 1; // Add 1 second buffer
    
    // Render the track audio offline
    const renderedBuffer = await Tone.Offline(async ({ transport }) => {
      const trackChannel = new Tone.Channel().toDestination();
      
      // Create temporary players for each clip
      track.clips.forEach(clip => {
        const tempPlayer = new Tone.Player(clip.player.buffer).connect(trackChannel);
        tempPlayer.start(clip.left / 100); // Convert pixels to seconds
      });
      
      transport.start();
    }, totalDuration);
    
    // Convert to WAV and download
    const wavBuffer = await audioBufferToWav(renderedBuffer._buffer || renderedBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${track.name.replace(/[^a-z0-9]/gi, '_')}_export.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Convert AudioBuffer to WAV format
  const audioBufferToWav = async (buffer) => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  };

  const handleClipUpdate = (clipId, updates) => {
    setTracks((prevTracks) =>
      prevTracks.map((t) => {
        if (t.id === track.id) {
          const newClips = t.clips.map((c) =>
            c.id === clipId ? { ...c, ...updates } : c
          );
          return { ...t, clips: newClips };
        }
        return t;
      })
    );
  };

  const handleClipPositionChange = (clipId, newLeft) => {
    if (onClipMove) {
      onClipMove(track.name, clipId, newLeft);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only update state if it actually changed to avoid unnecessary re-renders
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're actually leaving the track area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const clipId = e.dataTransfer.getData('clipId');
    const sourceTrackId = e.dataTransfer.getData('sourceTrackId');
    const clipLeft = parseFloat(e.dataTransfer.getData('clipLeft')) || 0;
    
    // Use requestAnimationFrame for smoother drop handling
    requestAnimationFrame(() => {
      onClipDrop(clipId, sourceTrackId, track.id, clipLeft);
    });
  };

  const isLabelObscured = track.clips.some((clip) => clip.left < 50);

  return (
    <div
      className={`relative h-24 bg-bg-medium rounded-lg border-2 ${isDragOver ? 'border-accent' : 'border-transparent hover:border-accent/50'}`}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!isLabelObscured && (
        <div className="absolute top-2 left-3 text-text-secondary font-bold z-10 pointer-events-none opacity-70">
          {track.name}
        </div>
      )}
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {track.clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          onUpdate={handleClipUpdate}
          onPositionChange={handleClipPositionChange}
          trackId={track.id}
        />
      ))}
    </div>
  );
};

export default Track; 