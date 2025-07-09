import * as Tone from 'tone';

export const debugAudioRouting = () => {
  console.group('🎵 Audio Routing Debug');
  
  console.log('Audio Context State:', Tone.context.state);
  console.log('Sample Rate:', Tone.context.sampleRate);
  console.log('Current Time:', Tone.context.currentTime);
  console.log('Latency:', Tone.context.baseLatency);
  
  console.log('Transport State:', Tone.Transport.state);
  console.log('Transport Position:', Tone.Transport.position);
  console.log('BPM:', Tone.Transport.bpm.value);
  
  console.log('Master Volume:', Tone.Destination.volume.value);
  console.log('Master Mute:', Tone.Destination.mute);
  
  console.groupEnd();
};

export const logEffectsChain = (trackId, channel, effectNodes) => {
  console.group(`🎛️ Effects Chain for Track ${trackId}`);
  
  if (!channel) {
    console.error('No channel found for track!');
    console.groupEnd();
    return;
  }
  
  console.log('Channel Volume:', channel.volume.value);
  console.log('Channel Mute:', channel.mute);
  console.log('Channel Pan:', channel.pan.value);
  
  if (effectNodes) {
    Object.entries(effectNodes).forEach(([name, node]) => {
      if (node) {
        console.log(`${name}:`, {
          wet: node.wet?.value,
          disposed: node.disposed,
          connected: !node.disposed
        });
      }
    });
  }
  
  console.groupEnd();
};

export const checkForAudioLeaks = () => {
  const activeNodes = Tone.context.destination.numberOfInputs;
  console.log('Active connections to destination:', activeNodes);
  
  if (activeNodes > 10) {
    console.warn('⚠️ High number of connections to destination. Possible audio node leak!');
  }
};

export const testAudioFlow = async (channel) => {
  console.group('🔊 Testing Audio Flow');
  
  if (!channel) {
    console.error('No channel provided!');
    console.groupEnd();
    return;
  }
  
  try {
    const testOsc = new Tone.Oscillator(440, 'sine');
    testOsc.volume.value = -20;
    
    testOsc.connect(channel);
    
    console.log('Playing 440Hz test tone for 0.5 seconds...');
    testOsc.start();
    
    setTimeout(() => {
      testOsc.stop();
      testOsc.dispose();
      console.log('Test tone stopped');
      console.groupEnd();
    }, 500);
    
  } catch (error) {
    console.error('Error testing audio flow:', error);
    console.groupEnd();
  }
};
