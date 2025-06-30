import React from 'react';

const Header = ({ isRecording, onRecord, onPlay, onStop }) => {
  return (
    <header className="bg-bg-medium h-16 flex items-center justify-between px-6 border-b border-bg-light">
      <div className="text-xl font-bold text-accent">PeerStudio</div>
      <div className="flex items-center gap-4">
        <button onClick={onPlay} className="bg-accent hover:bg-accent-hover text-bg-dark font-bold p-2 rounded-full w-10 h-10 flex items-center justify-center">
          ▶
        </button>
        <button onClick={onStop} className="bg-bg-light hover:bg-gray-600 text-text-primary font-bold p-2 rounded-full w-10 h-10 flex items-center justify-center">
          ■
        </button>
        <button
          onClick={onRecord}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-bg-light hover:bg-red-700'
          }`}
        >
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-bg-dark"></div>
        </button>
      </div>
    </header>
  );
};

export default Header; 