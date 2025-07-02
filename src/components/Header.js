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
}) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    if (!peerId) return;
    
    try {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
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