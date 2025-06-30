import React from 'react';

const Sidebar = ({ onAddTrack, tracks }) => {

  const Channel = ({ name, color }) => (
    <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-bg-light cursor-pointer">
      <div className={`w-4 h-4 rounded-full ${color}`}></div>
      <span>{name}</span>
    </div>
  );

  return (
    <div className="w-64 bg-bg-medium p-5 border-r border-bg-light flex flex-col gap-8">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-4">Channel Rack</h3>
        <div className="flex flex-col gap-2">
          {tracks.map(track => (
            <Channel key={track.id} name={track.name} color="bg-accent" />
          ))}
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