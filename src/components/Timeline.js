import React, { useState, useEffect, useRef } from 'react';
import Track from './Track';
import TimelineRuler, { TimelinePreviewContainer } from './TimelineRuler';
import * as Tone from 'tone';
import ContextMenu from './ContextMenu';
import Modal from './Modal';

const Timeline = ({ tracks, setTracks, timelineChannel, onClipDrop, onAudioImport, onAddTrack, isSidebarCollapsed }) => {
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [draggedTrackId, setDraggedTrackId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isDroppingFiles, setIsDroppingFiles] = useState(false);
  const scrollContainerRef = useRef(null);
  const rulerRef = useRef(null);
  const [timelineWidth, setTimelineWidth] = useState(6000);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const pixelsPerSecondConst = 100;
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clipForModal, setClipForModal] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let rafId;
    let isUserScrolling = false;
    let userScrollTimeout;

    const pixelsPerSecond = 100;

    const handleUserScroll = () => {
      isUserScrolling = true;
      clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 1000);
    };

    const updateRuler = (scrollLeft) => {
      if (rulerRef.current) {
        rulerRef.current.style.transform = `translateX(-${scrollLeft}px)`;
      }
    };

    const updatePlayhead = () => {
      const positionSeconds = Tone.Transport.seconds;
      const newPosition = positionSeconds * pixelsPerSecond;

      if (!isDraggingPlayhead) {
        setPlayheadPosition(newPosition);
      }

      if (scrollContainerRef.current && 
          Tone.Transport.state === 'started' && !isDraggingPlayhead) {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        const targetScroll = Math.max(0, newPosition - containerWidth / 2);
        const currentScroll = scrollContainerRef.current.scrollLeft;
        const smoothFactor = 0.08;
        const newScroll = currentScroll + (targetScroll - currentScroll) * smoothFactor;
        scrollContainerRef.current.scrollLeft = newScroll;
        updateRuler(scrollContainerRef.current.scrollLeft);
      }

      rafId = requestAnimationFrame(updatePlayhead);
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
      scrollContainer.addEventListener('scroll', () => updateRuler(scrollContainer.scrollLeft));
    }

    rafId = requestAnimationFrame(updatePlayhead);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(userScrollTimeout);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleUserScroll);
      }
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setScrollLeft(container.scrollLeft);
      setViewportWidth(container.offsetWidth);
    };

    updateDimensions();

    container.addEventListener('scroll', updateDimensions, { passive: true });
    window.addEventListener('resize', updateDimensions);

    return () => {
      container.removeEventListener('scroll', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width } = entries[0].contentRect;
      setViewportWidth(width);
      setContentHeight(container.scrollHeight);
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      setContentHeight(scrollContainerRef.current.scrollHeight);
    }
  }, [tracks, isSidebarCollapsed]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.classList.add('no-scrollbar');
    const timeout = setTimeout(() => {
      container.classList.remove('no-scrollbar');
    }, 550);

    return () => {
      clearTimeout(timeout);
      container.classList.remove('no-scrollbar');
    };
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const checkTransportState = () => {
      setIsMusicPlaying(Tone.Transport.state === 'started');
    };

    checkTransportState();
    const interval = setInterval(checkTransportState, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const calcWidth = () => {
      let maxClipEnd = 0;
      tracks.forEach(track => {
        track.clips.forEach(clip => {
          const clipEnd = clip.left + clip.duration * pixelsPerSecondConst;
          if (clipEnd > maxClipEnd) maxClipEnd = clipEnd;
        });
      });

      const viewportW = scrollContainerRef.current ? scrollContainerRef.current.offsetWidth : 0;
      const buffer = 1000;
      const needed = Math.max(viewportW, maxClipEnd + buffer, playheadPosition + buffer);
      setTimelineWidth(needed);
    };

    calcWidth();
  }, [tracks, playheadPosition, viewportWidth]);

  const handleDragStart = (e, trackId) => {
    if (isMusicPlaying) {
      e.preventDefault();
      return;
    }
    
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
    e.dataTransfer.setData('application/x-track-id', trackId);
    
    const dragImage = e.target.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(2deg)';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    const clipId = e.dataTransfer.types.includes('application/x-clip-id');
    if (clipId) return;

    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const isTrackDrag = e.dataTransfer.types.includes('application/x-track-id');
    
    if (isTrackDrag && draggedId && draggedId !== '') {
      const draggedIndex = tracks.findIndex(t => t.id === draggedId);
      if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
        requestAnimationFrame(() => {
          const newTracks = [...tracks];
          const [draggedTrack] = newTracks.splice(draggedIndex, 1);
          newTracks.splice(dropIndex, 0, draggedTrack);
          setTracks(newTracks);
        });
      }
    }
    
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };

  const handlePlayheadMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);

    const wasPlaying = Tone.Transport.state === 'started';
    if (wasPlaying) {
      Tone.Transport.pause();
    }
    
    Tone.Destination.mute = true;

    const startX = e.clientX;
    const startPosition = playheadPosition;
    const pixelsPerSecond = 100;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const newPosition = Math.max(0, startPosition + deltaX);
      const newTimeSeconds = newPosition / pixelsPerSecond;
      
      Tone.Transport.seconds = newTimeSeconds;
      setPlayheadPosition(newPosition);
    };
    
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      
      Tone.Destination.mute = false;
      
      if (wasPlaying) {
        Tone.Transport.start();
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineClick = (e) => {
    if (isDraggingPlayhead) return;
    
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const pixelsPerSecond = 100;
    const newTimeSeconds = clickX / pixelsPerSecond;
    
    Tone.Transport.seconds = Math.max(0, newTimeSeconds);
  };

  const handleTimelineFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasFiles = e.dataTransfer.types.includes('Files');
    if (hasFiles && !isMusicPlaying) {
      setIsDroppingFiles(true);
    }
  };

  const handleTimelineFileDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingFiles(false);
  };

  const handleTimelineFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingFiles(false);

    const isClipDrag = e.dataTransfer.types.includes('application/x-clip-id');
    if (isClipDrag) {
      return;
    }

    if (isMusicPlaying) {
      alert('Please stop the music before importing audio files.');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      alert('No valid audio files found. Please drop audio files only.');
      return;
    }

    if (onAudioImport) {
      try {
        await onAudioImport(audioFiles[0]);
        if (audioFiles.length > 1) {
          alert(`Found ${audioFiles.length} audio files. Imported the first one: ${audioFiles[0].name}`);
        }
      } catch (error) {
        console.error('Error importing dropped file:', error);
        alert('Error importing audio file. Please try again.');
      }
    }
  };

  const handlePreviewNavigate = (newScrollLeft) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = newScrollLeft;
    }
  };

  const rulerAreaHeight = 32 + (isPreviewOpen && tracks.length > 0 ? 88 : 0);

  const showContextMenu = (e, type, data) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'clip') {
      setSelectedClip(data);
    } else {
      setSelectedClip(null);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, type });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedClip(null);
  };

  const handleDeleteClip = () => {
    if (!selectedClip) return;
    setClipForModal(selectedClip);
    setDeleteModalOpen(true);
    closeContextMenu();
  };

  const handleRenameClip = () => {
    if (!selectedClip) return;
    setClipForModal(selectedClip);
    setNewName(selectedClip.name);
    setRenameModalOpen(true);
    closeContextMenu();
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (newName && newName.trim() !== '' && clipForModal) {
      setTracks(prevTracks =>
        prevTracks.map(track => ({
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipForModal.id ? { ...clip, name: newName.trim() } : clip
          ),
        }))
      );
    }
    setRenameModalOpen(false);
    setClipForModal(null);
  };

  const handleDeleteConfirm = () => {
    if (!clipForModal) return;
    setTracks(prevTracks =>
      prevTracks.map(track => {
        if (track.clips.find(c => c.id === clipForModal.id)) {
          const clipToRemove = track.clips.find(c => c.id === clipForModal.id);
          if (clipToRemove && clipToRemove.player) {
            clipToRemove.player.stop();
            clipToRemove.player.dispose();
          }
          return {
            ...track,
            clips: track.clips.filter(c => c.id !== clipForModal.id),
          };
        }
        return track;
      })
    );
    setDeleteModalOpen(false);
    setClipForModal(null);
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark overflow-hidden">
      <div className="flex-shrink-0 relative z-20 w-full bg-bg-medium" style={{ height: `${rulerAreaHeight}px` }}>
        <div className="sticky top-0 left-0 right-0 overflow-hidden relative h-8 bg-bg-medium border-b border-bg-light w-full z-30 shadow-sm">
          <div ref={rulerRef} className="will-change-transform w-full h-full">
            <TimelineRuler widthPx={timelineWidth} />
          </div>
          {tracks.length > 0 && (
            <button
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="absolute top-1/2 right-4 -translate-y-1/2 z-40 px-2 py-1 text-xs bg-bg-light rounded text-text-secondary hover:bg-bg-light-hover pointer-events-auto"
              title={isPreviewOpen ? 'Hide timeline preview' : 'Show timeline preview'}
            >
              {isPreviewOpen ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        <div className="relative w-full">
          <TimelinePreviewContainer
            widthPx={timelineWidth}
            tracks={tracks}
            scrollLeft={scrollLeft}
            viewportWidth={viewportWidth}
            onPreviewNavigate={handlePreviewNavigate}
            isPreviewOpen={isPreviewOpen}
            onToggle={setIsPreviewOpen}
          />
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef} 
        className={`flex-1 overflow-auto relative min-h-0 mt-0 ${
          isDroppingFiles ? 'bg-green-500 bg-opacity-20 border-2 border-green-500 border-dashed' : ''
        }`}
        onClick={handleTimelineClick}
        onDragOver={handleTimelineFileDragOver}
        onDragLeave={handleTimelineFileDragLeave}
        onDrop={handleTimelineFileDrop}
      >
        <div
          className="absolute top-0 w-0.5 bg-accent z-10 pointer-events-none"
          style={{ left: `${playheadPosition}px`, height: `${contentHeight}px` }}
        >
          <div
            className={`absolute top-0 w-4 h-6 bg-accent rounded-b-md shadow-lg pointer-events-auto ${
              isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-grab'
            } hover:bg-accent-hover`}
            style={{ left: '-7px' }}
            onMouseDown={handlePlayheadMouseDown}
            title={'Drag to move playhead or click timeline'}
          >
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <div className="w-1 h-0.5 bg-white opacity-70 mb-0.5"></div>
              <div className="w-1 h-0.5 bg-white opacity-70 mb-0.5"></div>
              <div className="w-1 h-0.5 bg-white opacity-70"></div>
            </div>
          </div>
        </div>
        
        <div
          className="space-y-2 p-4 min-h-full"
          style={{ width: `${timelineWidth}px` }}
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              showContextMenu(e, 'timeline');
            }
          }}
        >
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary select-none">
              <div className="text-center">
                <p className="text-lg mb-2 select-none">No tracks yet</p>
                <p className="text-sm select-none">Add a track from the sidebar or create clips using the instruments below</p>
              </div>
            </div>
          ) : (
            tracks.map((track, index) => (
              <div key={track.id}>
                {draggedTrackId && dragOverIndex === index && draggedTrackId !== track.id && (
                  <div className="h-2 bg-accent rounded-md mb-2 opacity-75"></div>
                )}
                <div
                  draggable={!isMusicPlaying}
                  onDragStart={(e) => handleDragStart(e, track.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-opacity ${
                    isMusicPlaying 
                      ? 'cursor-not-allowed opacity-75' 
                      : 'cursor-move'
                  } ${
                    draggedTrackId === track.id ? 'opacity-50' : 'opacity-100'
                  }`}
                  title={isMusicPlaying ? 'Stop playback to reorder tracks' : 'Drag to reorder tracks'}
                >
                  <Track
                    track={track}
                    setTracks={setTracks}
                    timelineChannel={timelineChannel}
                    onClipDrop={onClipDrop}
                    trackId={track.id}
                    onClipContextMenu={showContextMenu}
                    scrollContainerRef={scrollContainerRef}
                    timelineWidth={timelineWidth}
                    setTimelineWidth={setTimelineWidth}
                  />
                </div>
              </div>
            ))
          )}
          {draggedTrackId && dragOverIndex === tracks.length && (
            <div className="h-2 bg-accent rounded-md opacity-75"></div>
          )}
        </div>
      </div>
      <Modal isOpen={isRenameModalOpen} onClose={() => setRenameModalOpen(false)}>
        <form onSubmit={handleRenameSubmit}>
          <h3 className="text-lg font-bold mb-4">Rename Clip</h3>
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
        <h3 className="text-lg font-bold mb-2">Delete Clip</h3>
        <p className="text-text-secondary mb-5">
          Are you sure you want to delete the clip "{clipForModal?.name}"? This action cannot be undone.
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
          onAddTrack={contextMenu.type === 'timeline' ? onAddTrack : null}
          onRename={contextMenu.type === 'clip' ? handleRenameClip : null}
          onDelete={contextMenu.type === 'clip' ? handleDeleteClip : null}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default Timeline; 