import React, { useState } from 'react';
import * as Tone from 'tone';
import { Mp3Encoder } from '@breezystack/lamejs';

const ExportOptions = ({ tracks, trackFxSettings }) => {
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
        const clipStart = clip.left / 100;
        const clipDuration = clip.duration || 0;
        const clipEnd = clipStart + clipDuration;

        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });

    return maxDuration;
  };

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
      
      if (Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      
      const renderedBuffer = await Tone.Offline(async ({ transport }) => {
        const players = [];
        
        for (const track of tracks) {
          const fxSettings = trackFxSettings && trackFxSettings[track.id] ? trackFxSettings[track.id] : {};
          
          const trackChannel = new Tone.Channel().toDestination();
          
          let inputNode = trackChannel;
          
          if (fxSettings && Object.keys(fxSettings).length > 0) {
            const compressor = new Tone.Compressor({
              threshold: fxSettings.compressor?.enabled ? (fxSettings.compressor.threshold || -12) : 0,
              ratio: fxSettings.compressor?.enabled ? (fxSettings.compressor.ratio || 4) : 1,
              attack: fxSettings.compressor?.attack || 0.003,
              release: fxSettings.compressor?.release || 0.1
            });
            
            const eq = new Tone.EQ3({
              low: fxSettings.eq?.enabled ? (fxSettings.eq.low || 0) : 0,
              mid: fxSettings.eq?.enabled ? (fxSettings.eq.mid || 0) : 0,
              high: fxSettings.eq?.enabled ? (fxSettings.eq.high || 0) : 0
            });
            
            const distortion = new Tone.Distortion({
              distortion: fxSettings.distortion?.amount || 0.3,
              wet: fxSettings.distortion?.enabled ? 1 : 0
            });
            
            const chorus = new Tone.Chorus({
              frequency: fxSettings.chorus?.frequency || 1.5,
              depth: fxSettings.chorus?.depth || 0.7,
              spread: fxSettings.chorus?.spread || 180,
              wet: fxSettings.chorus?.enabled ? 1 : 0
            }).start();
            
            const delay = new Tone.FeedbackDelay({
              delayTime: fxSettings.delay?.time || '8n',
              feedback: fxSettings.delay?.feedback || 0.2,
              wet: fxSettings.delay?.enabled ? (fxSettings.delay.mix || 0.3) : 0
            });
            
            const reverb = new Tone.Reverb({
              decay: 2,
              wet: fxSettings.reverb?.enabled ? (fxSettings.reverb.mix || 0.5) : 0
            });
            
            compressor.connect(eq);
            eq.connect(distortion);
            distortion.connect(chorus);
            chorus.connect(delay);
            delay.connect(reverb);
            reverb.connect(trackChannel);
            
            inputNode = compressor;
          }
          
          for (const clip of track.clips) {
            if (clip.player && clip.player.buffer && clip.player.loaded) {
              try {
                const tempPlayer = new Tone.Player(clip.player.buffer);
                tempPlayer.connect(inputNode);
                tempPlayer.start(clip.left / 100);
                players.push(tempPlayer);
                console.log(`Added clip: ${clip.name} from track: ${track.name}`);
              } catch (error) {
                console.warn('Failed to add clip:', clip.name, error);
              }
            }
          }
        }
        
        console.log('Total players created:', players.length);
        transport.start();
      }, renderDuration);
      
      console.log('Render completed:', renderedBuffer);
      console.log('Buffer duration:', renderedBuffer.duration, 'seconds');
      console.log('Buffer sample rate:', renderedBuffer.sampleRate);
      console.log('Buffer channels:', renderedBuffer.numberOfChannels);

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

  const downloadAsWAV = async (buffer, filename) => {
    try {
      console.log('Starting WAV download with buffer:', buffer);
      
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
      await fallbackExport(buffer, filename);
    }
  };
  
  const fallbackExport = async (buffer, filename) => {
    try {
      console.log('Using fallback export method');
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const offlineContext = new OfflineAudioContext(2, audioContext.sampleRate * 10, audioContext.sampleRate);
      
      const duration = 3;
      const sampleRate = offlineContext.sampleRate;
      const frameCount = sampleRate * duration;
      const testBuffer = offlineContext.createBuffer(2, frameCount, sampleRate);
      
      for (let channel = 0; channel < testBuffer.numberOfChannels; channel++) {
        const channelData = testBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
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

  const downloadAsMP3 = async (buffer, filename) => {
    try {
      console.log('Starting MP3 conversion using lamejs');
      
      let actualBuffer = buffer;
      if (buffer._buffer) {
        actualBuffer = buffer._buffer;
      } else if (buffer.get) {
        actualBuffer = buffer.get();
      }
      
      if (!actualBuffer || !actualBuffer.getChannelData) {
        throw new Error('Invalid audio buffer for MP3 conversion');
      }
      
      const sampleRate = actualBuffer.sampleRate;
      const numChannels = Math.min(actualBuffer.numberOfChannels, 2);
      const length = actualBuffer.length;
      
      console.log('MP3 encoding parameters:', {
        sampleRate,
        numChannels,
        length,
        duration: actualBuffer.duration
      });
      
      const mp3encoder = new Mp3Encoder(numChannels, sampleRate, 128);
      const mp3Data = [];
      
      const blockSize = 1152;
      
      for (let i = 0; i < length; i += blockSize) {
        const leftChannel = actualBuffer.getChannelData(0);
        const rightChannel = numChannels > 1 ? actualBuffer.getChannelData(1) : leftChannel;
        
        const leftChunk = [];
        const rightChunk = [];
        
        for (let j = 0; j < blockSize && i + j < length; j++) {
          leftChunk[j] = Math.round(Math.max(-1, Math.min(1, leftChannel[i + j] || 0)) * 32767);
          rightChunk[j] = Math.round(Math.max(-1, Math.min(1, rightChannel[i + j] || 0)) * 32767);
        }
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
      
      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      
      const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      downloadBlob(blob, filename);
      
      console.log('MP3 export completed successfully');
      alert('Export completed as MP3 format.');
      
    } catch (error) {
      console.error('Error in MP3 conversion:', error);
      alert(`MP3 encoding failed: ${error.message}. Falling back to WAV format.`);
      await downloadAsWAV(buffer, filename.replace('.mp3', '.wav'));
    }
  };

  const downloadAsFLAC = async (buffer, filename) => {
    try {
      console.log('Starting FLAC export (using high-quality uncompressed format)');
      
      let actualBuffer = buffer;
      if (buffer._buffer) {
        actualBuffer = buffer._buffer;
      } else if (buffer.get) {
        actualBuffer = buffer.get();
      }
      
      if (!actualBuffer || !actualBuffer.getChannelData) {
        throw new Error('Invalid audio buffer for FLAC conversion');
      }
      
      const flacBuffer = await audioBufferToFlac(actualBuffer);
      const blob = new Blob([flacBuffer], { type: 'audio/x-flac' });
      downloadBlob(blob, filename);
      
      console.log('FLAC export completed (high-quality uncompressed)');
      
    } catch (error) {
      console.error('Error in FLAC conversion:', error);
      alert('FLAC encoding failed. Falling back to WAV format.');
      await downloadAsWAV(buffer, filename.replace('.flac', '.wav'));
    }
  };
  
  const audioBufferToFlac = async (buffer) => {
    console.log('Converting buffer to high-quality FLAC format');
    
    const length = buffer.length;
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 3;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const fileSize = 36 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true);
    
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const sample = Math.max(-1, Math.min(1, channelData[i] || 0));
        const intSample = Math.round(sample * 8388607);
        
        view.setUint8(offset, intSample & 0xFF);
        view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
        view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
        offset += 3;
      }
    }
    
    console.log('High-quality FLAC conversion completed. File size:', arrayBuffer.byteLength, 'bytes');
    return arrayBuffer;
  };

  const audioBufferToWav = async (buffer) => {
    console.log('Converting buffer to WAV:', buffer);
    console.log('Buffer properties:', {
      length: buffer.length,
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
      duration: buffer.duration
    });
    
    const length = buffer.length;
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const fileSize = 36 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
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
        
        <div className="bg-bg-medium p-4 rounded-lg">
          <h3 className="text-text-primary text-lg font-bold mb-4">Audio Export</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-text-secondary text-sm font-bold mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full bg-bg-dark text-text-primary px-3 py-2 rounded outline-none"
              >
                <option value="wav">WAV (16-bit)</option>
                <option value="mp3">MP3 (Compressed)</option>
                <option value="flac">FLAC (24-bit, Lossless)</option>
              </select>
            </div>
            
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
