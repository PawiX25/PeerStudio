import React, { useState, useEffect, useRef } from 'react';
import Track from './Track';
import TimelineRuler, { TimelinePreviewContainer } from './TimelineRuler';
import * as Tone from 'tone';
import ContextMenu from './ContextMenu';

const Timeline = ({ tracks, setTracks, timelineChannel, onClipDrop, onAudioImport, onAddTrack }) => {
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
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    let rafId;
    let isUserScrolling = false;
    let userScrollTimeout;

    const pixelsPerSecond = 100;

    // Track user scrolling to avoid conflicts with auto-scroll
    const handleUserScroll = () => {
      isUserScrolling = true;
      clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 1000); // Stop auto-scroll for 1 second after user scrolling
    };

    const updateRuler = (scrollLeft) => {
      if (rulerRef.current) {
        rulerRef.current.style.transform = `translateX(-${scrollLeft}px)`;
      }
    };

    const updatePlayhead = () => {
      const positionSeconds = Tone.Transport.seconds;
      const newPosition = positionSeconds * pixelsPerSecond;

      setPlayheadPosition(newPosition);

      // Only auto-scroll during playback if user isn't manually scrolling
      if (scrollContainerRef.current && 
          Tone.Transport.state === 'started') {
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

    // Add scroll listener
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
      scrollContainer.addEventListener('scroll', () => updateRuler(scrollContainer.scrollLeft));
    }

    // kick off the animation loop
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
    const updateHeight = () => {
      if (scrollContainerRef.current) {
        setContentHeight(scrollContainerRef.current.scrollHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [tracks]);

  // Track music playing state to prevent dragging during playback
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
  }, [tracks, playheadPosition]);

  const handleDragStart = (e, trackId) => {
    // Prevent track reordering during playback
    if (isMusicPlaying) {
      e.preventDefault();
      return;
    }
    
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
    // Add a specific identifier for track drags
    e.dataTransfer.setData('application/x-track-id', trackId);
    
    // Create a more visible drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(2deg)';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is a clip drag rather than track reorder
    const clipId = e.dataTransfer.types.includes('application/x-clip-id');
    if (clipId) return;

    // Optimize by only updating if index actually changed
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're actually leaving the target area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const isTrackDrag = e.dataTransfer.types.includes('application/x-track-id');
    
    // Only process track reordering drags
    if (isTrackDrag && draggedId && draggedId !== '') {
      const draggedIndex = tracks.findIndex(t => t.id === draggedId);
      if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
        // Use requestAnimationFrame for smoother state updates
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

  // Playhead dragging functionality
  const handlePlayheadMouseDown = (e) => {
    if (isMusicPlaying) return; // Don't allow dragging during playback
    
    setIsDraggingPlayhead(true);
    const startX = e.clientX;
    const startScrollLeft = scrollContainerRef.current.scrollLeft;
    const pixelsPerSecond = 100;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const newPosition = Math.max(0, playheadPosition + deltaX);
      const newTimeSeconds = newPosition / pixelsPerSecond;
      
      // Update Tone.js transport position
      Tone.Transport.seconds = newTimeSeconds;
      setPlayheadPosition(newPosition);
    };
    
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle clicking on timeline to move playhead
  const handleTimelineClick = (e) => {
    if (isMusicPlaying || isDraggingPlayhead) return;
    
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const pixelsPerSecond = 100;
    const newTimeSeconds = clickX / pixelsPerSecond;
    
    Tone.Transport.seconds = Math.max(0, newTimeSeconds);
  };

  // File drop handlers for timeline
  const handleTimelineFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow file drops, not track/clip drags
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

    // Import the first audio file
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

  const showContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div className="flex flex-col h-full bg-bg-dark overflow-hidden">
      {/* Timeline Ruler */}
      <div className="flex-shrink-0 relative" style={{ height: `${rulerAreaHeight}px` }}>
        <div className="overflow-hidden relative h-8">
          <div ref={rulerRef} className="will-change-transform">
            <TimelineRuler widthPx={timelineWidth} />
          </div>
        </div>
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
      
      {/* Timeline Content - Scrollable area */}
      <div 
        ref={scrollContainerRef} 
        className={`flex-1 overflow-auto relative min-h-0 ${
          isDroppingFiles ? 'bg-green-500 bg-opacity-20 border-2 border-green-500 border-dashed' : ''
        }`}
        onClick={handleTimelineClick}
        onDragOver={handleTimelineFileDragOver}
        onDragLeave={handleTimelineFileDragLeave}
        onDrop={handleTimelineFileDrop}
      >
        {/* Playhead with draggable handle */}
        <div
          className="absolute top-0 w-0.5 bg-accent z-10 pointer-events-none"
          style={{ left: `${playheadPosition}px`, height: `${contentHeight}px` }}
        >
          {/* Draggable playhead handle */}
          <div
            className={`absolute top-0 w-4 h-6 bg-accent rounded-b-md shadow-lg pointer-events-auto ${
              isMusicPlaying ? 'cursor-not-allowed opacity-50' : isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-grab'
            } transition-opacity hover:bg-accent-hover`}
            style={{ left: '-7px' }}
            onMouseDown={handlePlayheadMouseDown}
            title={isMusicPlaying ? 'Stop playback to move playhead' : 'Drag to move playhead or click timeline'}
          >
            {/* Visual grip lines */}
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <div className="w-1 h-0.5 bg-white opacity-70 mb-0.5"></div>
              <div className="w-1 h-0.5 bg-white opacity-70 mb-0.5"></div>
              <div className="w-1 h-0.5 bg-white opacity-70"></div>
            </div>
          </div>
        </div>
        
        {/* Tracks Container */}
        <div
          className="space-y-2 p-4 min-h-full"
          style={{ width: `${timelineWidth}px` }}
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              showContextMenu(e);
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddTrack={onAddTrack}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default Timeline; 