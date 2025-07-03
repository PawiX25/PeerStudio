import React, { useState } from 'react';
import LevelMeters from './LevelMeters';
import ContextMenu from './ContextMenu';

const Channel = ({ name, color, onNameChange, isEditing, onEditToggle }) => {
  const [editName, setEditName] = useState(name);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onNameChange(editName);
      onEditToggle();
    } else if (e.key === 'Escape') {
      setEditName(name);
      onEditToggle();
    }
  };
  
  const handleBlur = () => {
    onNameChange(editName);
    onEditToggle();
  };
  
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-bg-light cursor-pointer">
      <div className={`w-4 h-4 rounded-full ${color}`}></div>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          className="bg-bg-dark text-text-primary px-2 py-1 rounded outline-none flex-1 text-sm rename-input"
          style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text' }}
          autoFocus
          maxLength={20}
        />
      ) : (
        <span 
          className="flex-1 truncate"
          onDoubleClick={onEditToggle}
          title={name.length > 15 ? name : 'Double-click to rename'}
        >
          {name}
        </span>
      )}
    </div>
  );
};

const Sidebar = ({ onAddTrack, tracks, setTracks }) => {
  const [draggedTrackId, setDraggedTrackId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [editingClipId, setEditingClipId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const handleDragStart = (e, trackId) => {
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId && draggedId !== '') {
      const draggedIndex = tracks.findIndex(t => t.id === draggedId);
      if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
        const newTracks = [...tracks];
        const [draggedTrack] = newTracks.splice(draggedIndex, 1);
        newTracks.splice(dropIndex, 0, draggedTrack);
        setTracks(newTracks);
      }
    }
    
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTrackId(null);
    setDragOverIndex(null);
  };
  
  const handleTrackRename = (trackId, newName) => {
    if (newName.trim() === '') return;
    
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId 
          ? { ...track, name: newName.trim() }
          : track
      )
    );
  };
  
  const handleEditToggle = (trackId) => {
    setEditingTrackId(editingTrackId === trackId ? null : trackId);
  };
  
  const handleClipRename = (trackId, clipId, newName) => {
    if (newName.trim() === '') return;
    
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId 
          ? {
              ...track, 
              clips: track.clips.map(clip => 
                clip.id === clipId 
                  ? { ...clip, name: newName.trim() }
                  : clip
              )
            }
          : track
      )
    );
  };
  
  const handleClipEditToggle = (clipId) => {
    setEditingClipId(editingClipId === clipId ? null : clipId);
  };
  
  const handleRemoveTrack = (trackId) => {
    setTracks(prevTracks => prevTracks.filter(track => track.id !== trackId));
  };

  const showContextMenu = (event, trackId = null) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      trackId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="w-80 bg-bg-medium border-r border-bg-light flex flex-col overflow-hidden">
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={contextMenu.trackId ? () => handleEditToggle(contextMenu.trackId) : undefined}
          onDelete={contextMenu.trackId ? () => handleRemoveTrack(contextMenu.trackId) : undefined}
          onAddTrack={!contextMenu.trackId ? onAddTrack : undefined}
          onClose={closeContextMenu}
        />
      )}
      {/* Channel Rack Section */}
      <div className="p-5 flex-shrink-0 channel-rack-container">
      </div>
      
      {/* Level Meters Section */}
      <div className="px-5 pb-3 flex-shrink-0 mobile-landscape-hide">
        <h4 className="text-md font-bold text-text-primary mb-2 mobile-landscape-compact">Audio Levels</h4>
        <div className="bg-bg-dark rounded-lg p-3 mobile-landscape-levels">
          <LevelMeters tracks={tracks} compact={true} />
        </div>
      </div>
      
      {/* Scrollable Tracks List */}
      <div
        className="flex-1 overflow-auto scrollbar-thin px-5 pb-5"
        style={{ maxHeight: '60vh' }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            showContextMenu(e, null);
          }
        }}
      >
        <div className="flex flex-col">
          {tracks.map((track, index) => (
            <div key={track.id}>
              {dragOverIndex === index && draggedTrackId !== track.id && (
                <div className="h-1 bg-accent rounded-md mb-2 opacity-75"></div>
              )}
              <div
                onContextMenu={(e) => showContextMenu(e, track.id)}
                draggable
                onDragStart={(e) => {
                  // Only start drag if not clicking on input or editable elements
                  if (e.target.tagName === 'INPUT' || e.target.classList.contains('rename-input')) {
                    e.preventDefault();
                    return;
                  }
                  handleDragStart(e, track.id);
                }}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`mb-2 cursor-move transition-opacity ${
                  draggedTrackId === track.id ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <Channel 
                  name={track.name} 
                  color="bg-accent" 
                  onNameChange={(newName) => handleTrackRename(track.id, newName)}
                  isEditing={editingTrackId === track.id}
                  onEditToggle={() => handleEditToggle(track.id)}
                />
                
                {/* Clips for this track */}
                {track.clips.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {track.clips.map(clip => (
                      <div key={clip.id} className="flex items-center gap-2 py-1 px-2 rounded-md bg-bg-dark hover:bg-bg-light/50">
                        <div className={`w-2 h-2 rounded-full ${clip.color || 'bg-gray-400'}`}></div>
                        {editingClipId === clip.id ? (
                          <input
                            type="text"
                            defaultValue={clip.name}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleClipRename(track.id, clip.id, e.target.value);
                                setEditingClipId(null);
                              } else if (e.key === 'Escape') {
                                setEditingClipId(null);
                              }
                            }}
                            onBlur={(e) => {
                              handleClipRename(track.id, clip.id, e.target.value);
                              setEditingClipId(null);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.preventDefault()}
                            draggable={false}
                            className="bg-bg-medium text-text-primary px-1 py-0.5 rounded text-xs outline-none flex-1 rename-input"
                            style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text' }}
                            autoFocus
                            maxLength={25}
                          />
                        ) : (
                          <span 
                            className="flex-1 text-xs text-text-secondary truncate cursor-pointer hover:text-text-primary"
                            onDoubleClick={() => handleClipEditToggle(clip.id)}
                            title={`${clip.name} - Double-click to rename`}
                          >
                            {clip.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {dragOverIndex === tracks.length && (
            <div className="h-1 bg-accent rounded-md opacity-75"></div>
          )}
          
          {tracks.length === 0 && (
            <p className="text-text-secondary text-center py-8 text-sm">
              No tracks yet. Add a track to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 