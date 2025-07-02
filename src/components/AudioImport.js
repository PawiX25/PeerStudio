import React, { useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';

const AudioImport = ({ onImport }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastImported, setLastImported] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const checkTransportState = () => {
      setIsMusicPlaying(Tone.Transport.state === 'started');
    };

    // Check initial state
    checkTransportState();

    // Poll for transport state changes
    const interval = setInterval(checkTransportState, 100);

    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (isMusicPlaying) {
      alert('Please stop the music before importing audio files.');
      event.target.value = '';
      return;
    }

    setIsLoading(true);
    try {
      await onImport(file);
      setLastImported(file.name);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing audio file. Please try a different file.');
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Handle file imports (both upload and drag-drop)
  const processFile = async (file) => {
    if (isMusicPlaying) {
      alert('Please stop the music before importing audio files.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select a valid audio file.');
      return;
    }

    setIsLoading(true);
    try {
      await onImport(file);
      setLastImported(file.name);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing audio file. Please try a different file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isMusicPlaying) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

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

    // Process first audio file (could be extended to handle multiple files)
    await processFile(audioFiles[0]);

    if (audioFiles.length > 1) {
      alert(`Found ${audioFiles.length} audio files. Imported the first one: ${audioFiles[0].name}`);
    }
  };

  return (
    <div className="bg-bg-medium p-6 rounded-lg">
      {/* Instructions */}
      <div className="mb-6 p-4 bg-bg-dark rounded border border-accent">
        <h3 className="text-text-primary mb-3 text-lg font-bold">Audio File Import</h3>
        <p className="text-text-secondary mb-3">
          Import audio files directly to your timeline. Supported formats include:
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <span className="text-accent font-bold">WAV</span>
          <span className="text-accent font-bold">MP3</span>
          <span className="text-accent font-bold">FLAC</span>
          <span className="text-accent font-bold">OGG</span>
          <span className="text-accent font-bold">AAC</span>
          <span className="text-accent font-bold">M4A</span>
        </div>
        <p className="text-text-secondary text-sm">
          Files will be automatically added to a new track on your timeline and can be moved, trimmed, and arranged as needed.
        </p>
      </div>

      {/* Upload Area */}
      <div className="text-center">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 mb-4 transition-colors ${
            isMusicPlaying 
              ? 'border-red-500 bg-red-500 bg-opacity-10 cursor-not-allowed' 
              : isDragging
              ? 'border-green-500 bg-green-500 bg-opacity-20 scale-105'
              : 'border-accent hover:bg-bg-light cursor-pointer'
          }`}
          onClick={() => {
            if (!isMusicPlaying) {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-3"></div>
              <p className="text-text-primary">Importing audio file...</p>
            </div>
          ) : isMusicPlaying ? (
            <div className="flex flex-col items-center">
              <svg 
                className="w-12 h-12 text-red-500 mb-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" 
                />
              </svg>
              <p className="text-red-400 text-lg font-bold mb-2">
                Import Disabled During Playback
              </p>
              <p className="text-red-300 text-sm">
                Stop the music to import audio files
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg 
                className="w-12 h-12 text-accent mb-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
              <p className="text-text-primary text-lg font-bold mb-2">
                {isDragging ? '🎵 Drop your audio file here!' : 'Drop audio files here or click to browse'}
              </p>
              <p className="text-text-secondary text-sm">
                {isDragging ? 'Release to import' : 'Drag and drop files or click to select from your computer'}
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isLoading || isMusicPlaying}
        />
      </div>

      {/* Last Imported */}
      {lastImported && (
        <div className="mt-6 p-3 bg-green-600 bg-opacity-20 border border-green-600 rounded">
          <p className="text-green-400 text-sm">
            ✓ Successfully imported: <span className="font-bold">{lastImported}</span>
          </p>
          <p className="text-green-300 text-xs mt-1">
            Check your timeline to see the imported audio track.
          </p>
        </div>
      )}

      {/* Tips - Hide when there are imported tracks to prevent cutoff */}
      {!lastImported && (
        <div className="mt-6 p-4 bg-bg-dark rounded">
          <h4 className="text-text-primary font-bold mb-2">Tips:</h4>
          <ul className="text-text-secondary text-sm space-y-1">
            <li>• Imported files are automatically added to a new "Audio Import" track</li>
            <li>• You can drag and drop clips between tracks to organize your project</li>
            <li>• Use the timeline controls to play, pause, and navigate your audio</li>
            <li>• Multiple audio files can be imported and will be added sequentially</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AudioImport;
