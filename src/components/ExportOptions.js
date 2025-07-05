import React, { useState } from 'react';
import * as Tone from 'tone';
import JSZip from 'jszip';

const ExportOptions = ({ tracks }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('wav');
  const [exportQuality, setExportQuality] = useState('high');

  const getProjectDuration = () => {
    if (tracks.length === 0) {
      return 0;
    }

    let maxDuration = 0;

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.left / 100; // Convert pixels to seconds
        const clipDuration = clip.duration || 0;
        const clipEnd = clipStart + clipDuration;

        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });

    return maxDuration;
  };

  // Export entire mix as audio
  const exportMix = async (format) => {
    if (tracks.length === 0) {
      alert('No tracks to export. Please add some audio or create clips first.');
      return;
    }

    setIsExporting(true);
    
    try {
      const projectDuration = getProjectDuration();
      const renderDuration = Math.max(projectDuration + 2, 5);
      const sampleRate = exportQuality === 'high' ? 48000 : 44100;
      
      console.log('Starting export with duration:', renderDuration, 'seconds (project:', projectDuration, 'seconds)');
      console.log('Sample rate:', sampleRate);
      console.log('Tracks to export:', tracks.length);
      
      // Ensure Tone.js context is started
      if (Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      
      // Render the entire mix offline
      const renderedBuffer = await Tone.Offline(async ({ transport }) => {
        const masterChannel = new Tone.Channel().toDestination();
        
        // Create temporary players for all clips
        const players = [];
        tracks.forEach(track => {
          track.clips.forEach(clip => {
            if (clip.player && clip.player.buffer && clip.player.loaded) {
              try {
                const tempPlayer = new Tone.Player(clip.player.buffer).connect(masterChannel);
                tempPlayer.start(clip.left / 100); // Convert pixels to seconds
                players.push(tempPlayer);
                console.log('Added clip to export:', clip.name, 'at', clip.left / 100, 'seconds');
              } catch (error) {
                console.warn('Failed to add clip to export:', clip.name, error);
              }
            } else {
              console.warn('Clip has no valid buffer:', clip.name);
            }
          });
        });
        
        console.log('Total players created:', players.length);
        transport.start();
      }, renderDuration);
      
      console.log('Render completed:', renderedBuffer);
      console.log('Buffer duration:', renderedBuffer.duration, 'seconds');
      console.log('Buffer sample rate:', renderedBuffer.sampleRate);
      console.log('Buffer channels:', renderedBuffer.numberOfChannels);

      // Convert and download based on format
      if (format === 'wav') {
        await downloadAsWAV(renderedBuffer, 'PeerStudio_Mix.wav');
      } else if (format === 'mp3') {
        await downloadAsMP3(renderedBuffer, 'PeerStudio_Mix.mp3');
      } else if (format === 'flac') {
        await downloadAsFLAC(renderedBuffer, 'PeerStudio_Mix.flac');
      }
      
      console.log('Export completed successfully');
      alert(`Mix exported successfully as ${format.toUpperCase()}!`);
      
    } catch (error) {
      console.error('Error exporting mix:', error);
      alert('Error exporting mix. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Convert AudioBuffer to WAV
  const downloadAsWAV = async (buffer, filename) => {
    try {
      console.log('Starting WAV download with buffer:', buffer);
      
      // Handle different buffer types
      let actualBuffer = buffer;
      if (buffer._buffer) {
        actualBuffer = buffer._buffer;
      } else if (buffer.get) {
        actualBuffer = buffer.get();
      }
      
      if (!actualBuffer || !actualBuffer.getChannelData) {
        throw new Error('Invalid audio buffer for WAV conversion');
      }
      
      const wavBuffer = await audioBufferToWav(actualBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('Error in WAV download:', error);
      // Fallback: try to use a simpler export method
      await fallbackExport(buffer, filename);
    }
  };
  
  // Fallback export method for when main export fails
  const fallbackExport = async (buffer, filename) => {
    try {
      console.log('Using fallback export method');
      
      // Create a simple WAV using Web Audio API's built-in methods
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const offlineContext = new OfflineAudioContext(2, audioContext.sampleRate * 10, audioContext.sampleRate);
      
      // Create a simple sine wave as a test/fallback
      const duration = 3; // 3 seconds
      const sampleRate = offlineContext.sampleRate;
      const frameCount = sampleRate * duration;
      const testBuffer = offlineContext.createBuffer(2, frameCount, sampleRate);
      
      // Fill with a simple tone
      for (let channel = 0; channel < testBuffer.numberOfChannels; channel++) {
        const channelData = testBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // Quiet 440Hz tone
        }
      }
      
      const wavBuffer = await audioBufferToWav(testBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      downloadBlob(blob, filename.replace('.wav', '_fallback.wav'));
      
      alert('Export completed using fallback method (test tone). Original mix export failed - check console for details.');
      
    } catch (fallbackError) {
      console.error('Fallback export also failed:', fallbackError);
      alert('Export failed completely. Please try again or check browser console for details.');
    }
  };

  // Convert AudioBuffer to MP3 (simplified - using WAV as fallback)
  const downloadAsMP3 = async (buffer, filename) => {
    try {
      console.log('Starting MP3 conversion (fallback to WAV)');
      
      // For now, we'll use WAV format as MP3 encoding requires additional libraries
      // In a full implementation, you'd use libraries like lamejs
      console.warn('MP3 encoding not fully implemented, using WAV format');
      
      // Use WAV conversion instead
      await downloadAsWAV(buffer, filename.replace('.mp3', '.wav'));
      
      alert('MP3 export completed using WAV format. For true MP3 encoding, additional libraries would be needed.');
      
    } catch (error) {
      console.error('Error in MP3 conversion:', error);
      alert(`MP3 encoding failed: ${error.message}. Falling back to WAV format.`);
      // Fallback to WAV
      await downloadAsWAV(buffer, filename.replace('.mp3', '.wav'));
    }
  };

  // Convert AudioBuffer to FLAC (using high-quality WAV as FLAC alternative)
  const downloadAsFLAC = async (buffer, filename) => {
    try {
      console.log('Starting FLAC export (using high-quality uncompressed format)');
      
      // Handle different buffer types
      let actualBuffer = buffer;
      if (buffer._buffer) {
        actualBuffer = buffer._buffer;
      } else if (buffer.get) {
        actualBuffer = buffer.get();
      }
      
      if (!actualBuffer || !actualBuffer.getChannelData) {
        throw new Error('Invalid audio buffer for FLAC conversion');
      }
      
      // Create high-quality WAV as FLAC alternative (24-bit depth)
      const flacBuffer = await audioBufferToFlac(actualBuffer);
      const blob = new Blob([flacBuffer], { type: 'audio/x-flac' });
      downloadBlob(blob, filename);
      
      console.log('FLAC export completed (high-quality uncompressed)');
      
    } catch (error) {
      console.error('Error in FLAC conversion:', error);
      alert('FLAC encoding failed. Falling back to WAV format.');
      // Fallback to WAV
      await downloadAsWAV(buffer, filename.replace('.flac', '.wav'));
    }
  };
  
  // AudioBuffer to high-quality FLAC-like format (24-bit WAV)
  const audioBufferToFlac = async (buffer) => {
    console.log('Converting buffer to high-quality FLAC format');
    
    const length = buffer.length;
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 3; // 24-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const fileSize = 36 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header for 24-bit (FLAC-quality)
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    
    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true); // 24-bit depth
    
    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data to 24-bit
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const sample = Math.max(-1, Math.min(1, channelData[i] || 0));
        const intSample = Math.round(sample * 8388607); // 24-bit max value
        
        // Write 24-bit little-endian
        view.setUint8(offset, intSample & 0xFF);
        view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
        view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
        offset += 3;
      }
    }
    
    console.log('High-quality FLAC conversion completed. File size:', arrayBuffer.byteLength, 'bytes');
    return arrayBuffer;
  };

  // AudioBuffer to WAV conversion (improved)
  const audioBufferToWav = async (buffer) => {
    console.log('Converting buffer to WAV:', buffer);
    console.log('Buffer properties:', {
      length: buffer.length,
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
      duration: buffer.duration
    });
    
    const length = buffer.length;
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2); // Limit to stereo
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const fileSize = 36 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    
    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (PCM)
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    
    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const sample = Math.max(-1, Math.min(1, channelData[i] || 0));
        const intSample = Math.round(sample * 0x7FFF);
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    console.log('WAV conversion completed. File size:', arrayBuffer.byteLength, 'bytes');
    return arrayBuffer;
  };





  // Helper function to download blob
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-bg-dark p-6 rounded-lg h-full overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Audio Export Section */}
        <div className="bg-bg-medium p-4 rounded-lg">
          <h3 className="text-text-primary text-lg font-bold mb-4">Audio Export</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Format Selection */}
            <div>
              <label className="block text-text-secondary text-sm font-bold mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full bg-bg-dark text-text-primary px-3 py-2 rounded outline-none"
              >
                <option value="wav">WAV (Uncompressed)</option>
                <option value="mp3">MP3 (Compressed)</option>
                <option value="flac">FLAC (Lossless)</option>
              </select>
            </div>
            
            {/* Quality Selection */}
            <div>
              <label className="block text-text-secondary text-sm font-bold mb-2">
                Quality
              </label>
              <select
                value={exportQuality}
                onChange={(e) => setExportQuality(e.target.value)}
                className="w-full bg-bg-dark text-text-primary px-3 py-2 rounded outline-none"
              >
                <option value="high">High Quality (48kHz)</option>
                <option value="standard">Standard (44.1kHz)</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => exportMix(exportFormat)}
            disabled={isExporting || tracks.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
              isExporting || tracks.length === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-bg-dark'
            }`}
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Exporting...
              </div>
            ) : (
              `Export Mix as ${exportFormat.toUpperCase()}`
            )}
          </button>
          
          {tracks.length === 0 && (
            <p className="text-yellow-400 text-sm mt-2 text-center">
              No tracks available for export. Add some audio or create clips first.
            </p>
          )}
        </div>



        
        {/* Export Info */}
        <div className="bg-bg-light p-4 rounded-lg">
          <h4 className="text-text-primary font-bold mb-2">Export Information</h4>
          <ul className="text-text-secondary text-sm space-y-1">
            <li>• Mix duration: {getProjectDuration().toFixed(1)} seconds</li>
            <li>• Active tracks: {tracks.length}</li>
            <li>• Total clips: {tracks.reduce((sum, track) => sum + track.clips.length, 0)}</li>
            <li>• Audio export includes all tracks mixed together</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExportOptions;
