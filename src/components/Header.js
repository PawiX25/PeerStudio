import React, { useState } from 'react';

const Header = ({
  isRecording,
  onRecord,
  onPlay,
  onPause,
  onStop,
  peerId,
  remotePeerId,
  onRemotePeerIdChange,
  onConnect,
  isConnected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomChange,
  zoomLevel,
  isMetronomeOn,
  onMetronomeToggle,
  time
}) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    if (!peerId) return;
    
    try {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = peerId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleZoomIn = () => onZoomChange(prev => Math.min(4, prev * 1.25));
  const handleZoomOut = () => onZoomChange(prev => Math.max(0.25, prev * 0.8));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-bg-medium h-16 flex items-center justify-between px-6 border-b border-bg-light">
      <div className="text-xl font-bold text-accent">PeerStudio</div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Your ID:</span>
          <span className="font-mono text-text-primary allow-text-selection" title="Click to select">{peerId || '...'}</span>
          {peerId && (
            <button
              onClick={copyToClipboard}
              className="ml-1 p-1 rounded hover:bg-bg-light transition-colors text-text-secondary hover:text-text-primary"
              title={copied ? 'Copied!' : 'Copy ID'}
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => onRemotePeerIdChange(e.target.value)}
            placeholder="Remote ID"
            className="bg-bg-light text-text-primary px-2 py-1 rounded outline-none w-32"
          />
          <button
            onClick={onConnect}
            className={`py-1 px-3 rounded font-bold ${isConnected ? 'bg-green-600 text-bg-dark' : 'bg-bg-light hover:bg-accent text-text-primary'}`}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleZoomOut}
            className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors bg-bg-light hover:bg-accent text-text-primary"
            title="Zoom Out (-)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
            </svg>
          </button>
          <button 
            onClick={() => onZoomChange(1)}
            className="font-mono text-sm text-text-secondary w-12 text-center p-2 rounded hover:bg-bg-light transition-colors"
            title="Reset Zoom (100%)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button 
            onClick={handleZoomIn}
            className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors bg-bg-light hover:bg-accent text-text-primary"
            title="Zoom In (+)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6"></path>
            </svg>
          </button>
        </div>
        <div className="w-px h-8 bg-bg-light"></div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${
              canUndo ? 'bg-bg-light hover:bg-accent text-text-primary' : 'bg-bg-dark text-text-secondary cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${
              canRedo ? 'bg-bg-light hover:bg-accent text-text-primary' : 'bg-bg-dark text-text-secondary cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
        <div className="w-px h-8 bg-bg-light"></div>
        <div className="bg-bg-dark px-3 py-1 rounded-lg">
          <span className="font-mono text-lg text-accent">{formatTime(time)}</span>
        </div>
        <div className="w-px h-8 bg-bg-light"></div>
        <button
          onClick={onMetronomeToggle}
          className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors ${
            isMetronomeOn ? 'bg-accent text-bg-dark' : 'bg-bg-light hover:bg-accent text-text-primary'
          }`}
          title={isMetronomeOn ? 'Turn off metronome' : 'Turn on metronome'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a1 1 0 01-1-1V2a1 1 0 112 0v15a1 1 0 01-1 1z" />
            <path d="M5.5 7.5L10 2l4.5 5.5L10 13l-4.5-5.5z" />
          </svg>
        </button>
        <div className="w-px h-8 bg-bg-light"></div>
        <button onClick={onPlay} className="bg-bg-light hover:bg-green-600 text-text-primary font-bold p-3 rounded-full w-12 h-12 flex items-center justify-center transition-colors">
          <div className="w-0 h-0 border-l-[20px] border-l-green-500 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
        </button>
        <button onClick={onPause} className="bg-bg-light hover:bg-yellow-600 text-text-primary font-bold p-3 rounded-full w-12 h-12 flex items-center justify-center transition-colors">
          <div className="flex gap-1">
            <div className="w-1.5 h-6 bg-yellow-500 rounded-sm"></div>
            <div className="w-1.5 h-6 bg-yellow-500 rounded-sm"></div>
          </div>
        </button>
        <button onClick={onStop} className="bg-bg-light hover:bg-gray-600 text-text-primary font-bold p-3 rounded-full w-12 h-12 flex items-center justify-center transition-colors">
          <div className="w-5 h-5 bg-gray-400 rounded-sm"></div>
        </button>
        <button
          onClick={onRecord}
          className={`w-12 h-12 flex items-center justify-center rounded-full p-3 transition-colors ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-bg-light hover:bg-red-700'
          }`}
        >
          <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-bg-dark"></div>
        </button>
      </div>
    </header>
  );
};

export default Header;