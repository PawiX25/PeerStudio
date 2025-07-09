import React, { useRef, useState } from 'react';
import * as Tone from 'tone';
import Clip from './Clip';
import generateId from '../utils/generateId';
import ContextMenu from './ContextMenu';
import Modal from './Modal';

const clipColors = [
  'bg-orange-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-pink-400',
];

const Track = ({ track, setTracks, onClipDrop, onClipContextMenu, scrollContainerRef, timelineWidth, setTimelineWidth, pixelsPerSecond, soloedTrackId, toggleSoloTrack, soloedClipId, toggleSoloClip }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newName, setNewName] = useState(track.name);

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
          left: 0, // in seconds
          color: randomColor,
        };
        setTracks((prevTracks) =>
          prevTracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
          )
        );
        player.sync().start(0);
      });
    }
  };

  const showContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const renameTrack = () => {
    setNewName(track.name);
    setRenameModalOpen(true);
  };

  const deleteTrack = () => {
    setDeleteModalOpen(true);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (newName && newName.trim() !== '' && newName !== track.name) {
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, name: newName.trim() } : t))
      );
    }
    setRenameModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    const trackToDelete = track;
    if (trackToDelete && trackToDelete.clips) {
      trackToDelete.clips.forEach(clip => {
        if (clip.player) {
          clip.player.stop();
          clip.player.dispose();
        }
      });
    }
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    setDeleteModalOpen(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    
    if (scrollContainerRef && scrollContainerRef.current) {
        const cursorOffset = parseFloat(e.dataTransfer.getData('cursorOffset')) || 0;
        const timelineRect = scrollContainerRef.current.getBoundingClientRect();
        let newLeftPx = e.clientX - timelineRect.left + scrollContainerRef.current.scrollLeft - cursorOffset;
        if (newLeftPx < 0) newLeftPx = 0;

        const newLeftSeconds = newLeftPx / pixelsPerSecond;
        onClipDrop(clipId, sourceTrackId, track.id, newLeftSeconds);
    }
  };

  const isLabelObscured = track.clips.some((clip) => (clip.left * pixelsPerSecond) < 150);

  const importAudio = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  const exportTrackAudio = async () => {
    if (track.clips.length === 0) {
      alert('No clips to export in this track.');
      return;
    }

    const totalDuration =
      track.clips.reduce(
        (max, clip) => Math.max(max, clip.left + clip.duration),
        0
      ) + 1;

    try {
      const renderedBuffer = await Tone.Offline(async ({ transport }) => {
        const channel = new Tone.Channel().toDestination();
        track.clips.forEach((clip) => {
          const tempPlayer = new Tone.Player(clip.player.buffer).connect(channel);
          tempPlayer.start(clip.left);
        });
        transport.start();
      }, totalDuration);

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
    } catch (err) {
      console.error('Export failed', err);
      alert('Error exporting track audio.');
    }
  };

  const audioBufferToWav = async (buffer) => {
    const len = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + len * 2);
    const view = new DataView(arrayBuffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + len * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels || 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, len * 2, true);

    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s * 0x7fff, true);
      offset += 2;
    }

    return arrayBuffer;
  };

  const exportAudio = () => exportTrackAudio();

  const handleSolo = () => {
    toggleSoloTrack(track.id);
    closeContextMenu();
  }

  return (
    <div
      className={`relative h-24 bg-bg-medium rounded-lg border-2 ${
        soloedTrackId === track.id 
          ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' 
          : isDragOver 
            ? 'border-accent' 
            : 'border-transparent hover:border-accent/50'
      }`}
      onContextMenu={showContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Modal isOpen={isRenameModalOpen} onClose={() => setRenameModalOpen(false)}>
        <form onSubmit={handleRenameSubmit}>
          <h3 className="text-lg font-bold mb-4">Rename Track</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-bg-dark text-text-primary px-3 py-2 rounded-md outline-none border border-bg-light focus:border-accent"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="px-4 py-2 rounded-md bg-bg-light hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover"
            >
              Rename
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <h3 className="text-lg font-bold mb-2">Delete Track</h3>
        <p className="text-text-secondary mb-5">
          Are you sure you want to delete the track "{track.name}"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="px-4 py-2 rounded-md bg-bg-light hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </button>
        </div>
      </Modal>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onImportAudio={importAudio}
          onExportAudio={exportAudio}
          onRename={renameTrack}
          onDelete={deleteTrack}
          onSolo={handleSolo}
          isSoloed={soloedTrackId === track.id}
          onClose={closeContextMenu}
        />
      )}
      {!isLabelObscured && (
        <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
          <span className="text-text-secondary font-bold opacity-70">
            {track.name}
          </span>
          {soloedTrackId === track.id && (
            <span className="text-yellow-400 text-xs font-bold bg-yellow-400/20 px-2 py-0.5 rounded">
              SOLO
            </span>
          )}
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
          trackId={track.id}
          onContextMenu={(e) => onClipContextMenu(e, 'clip', clip)}
          scrollContainerRef={scrollContainerRef}
          timelineWidth={timelineWidth}
          setTimelineWidth={setTimelineWidth}
          pixelsPerSecond={pixelsPerSecond}
          soloedClipId={soloedClipId}
          toggleSoloClip={toggleSoloClip}
        />
      ))}
    </div>
  );
};

export default Track; 