
import React, { useState } from 'react';

const Channel = ({ name, color }) => (
  <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-bg-light cursor-pointer">
    <div className={`w-4 h-4 rounded-full ${color}`}></div>
    <span>{name}</span>
  </div>
);

const Sidebar = ({ onAddTrack, tracks, setTracks }) => {
  const [draggedTrackId, setDraggedTrackId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

  return (
    <div className="w-64 bg-bg-medium p-5 border-r border-bg-light flex flex-col gap-8">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-4">Channel Rack</h3>
        <div className="flex flex-col">
          {tracks.map((track, index) => (
            <div key={track.id}>
              {dragOverIndex === index && draggedTrackId !== track.id && (
                <div className="h-1 bg-accent rounded-md mb-2 opacity-75"></div>
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, track.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`mb-2 cursor-move transition-opacity ${
                  draggedTrackId === track.id ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <Channel name={track.name} color="bg-accent" />
              </div>
            </div>
          ))}
          {dragOverIndex === tracks.length && (
            <div className="h-1 bg-accent rounded-md opacity-75"></div>
          )}
        </div>
        <button
          onClick={onAddTrack}
          className="w-full mt-4 bg-bg-light hover:bg-gray-600 text-text-primary font-bold py-2 px-4 rounded"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 