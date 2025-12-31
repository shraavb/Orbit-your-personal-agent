import { useState, useEffect, useMemo } from 'react';
import { CharacterAlignment } from '../api/client';
import {
  VisemeType,
  createVisemeTimeline,
  getCurrentViseme,
  smoothVisemeTimeline,
  VisemeEvent
} from '../utils/visemeMapping';

// Import Neptune SVG images
import neptuneNeutral from '../assets/neptune/neptune-neutral.svg';
import neptuneA from '../assets/neptune/neptune-a.svg';
import neptuneE from '../assets/neptune/neptune-e.svg';
import neptuneI from '../assets/neptune/neptune-i.svg';
import neptuneO from '../assets/neptune/neptune-o.svg';
import neptuneU from '../assets/neptune/neptune-u.svg';
import neptuneM from '../assets/neptune/neptune-m.svg';
import neptuneF from '../assets/neptune/neptune-f.svg';
import neptuneL from '../assets/neptune/neptune-l.svg';
import neptuneTH from '../assets/neptune/neptune-th.svg';
import neptuneW from '../assets/neptune/neptune-w.svg';
import neptuneSH from '../assets/neptune/neptune-sh_ch.svg';
import neptuneR from '../assets/neptune/neptune-r.svg';
import neptuneIdle from '../assets/neptune/neptune-idle.svg';

export type CharacterState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AnimatedCharacterProps {
  state: CharacterState;
  audioElement: HTMLAudioElement | null;
  alignment?: CharacterAlignment;
  className?: string;
}

const VISEME_IMAGE_MAP: Record<VisemeType, string> = {
  neutral: neptuneNeutral,
  a: neptuneA,
  e: neptuneE,
  i: neptuneI,
  o: neptuneO,
  u: neptuneU,
  m: neptuneM,
  f: neptuneF,
  l: neptuneL,
  th: neptuneTH,
  w: neptuneW,
  sh: neptuneSH,
  r: neptuneR,
};

export default function AnimatedCharacter({
  state,
  audioElement,
  alignment,
  className = '',
}: AnimatedCharacterProps) {
  const [currentViseme, setCurrentViseme] = useState<VisemeType>('neutral');
  const [isIdleAnimating, setIsIdleAnimating] = useState(false);

  // Create viseme timeline from alignment data
  const visemeTimeline = useMemo<VisemeEvent[]>(() => {
    if (!alignment) {
      console.log('[AnimatedCharacter] No alignment data received');
      return [];
    }
    console.log('[AnimatedCharacter] Creating viseme timeline from alignment:', {
      characters: alignment.characters.length,
      startTimes: alignment.character_start_times_seconds.length,
      endTimes: alignment.character_end_times_seconds.length,
      sampleChars: alignment.characters.slice(0, 10).join(''),
    });
    const timeline = createVisemeTimeline(
      alignment.characters,
      alignment.character_start_times_seconds,
      alignment.character_end_times_seconds
    );
    console.log('[AnimatedCharacter] Raw viseme timeline created:', timeline.slice(0, 5));

    // Apply minimal smoothing to reduce jitter while maintaining sync
    const smoothed = smoothVisemeTimeline(timeline, 0.03);
    console.log('[AnimatedCharacter] Smoothed viseme timeline:', smoothed.slice(0, 5));
    return smoothed;
  }, [alignment]);

  // Synchronize lip-sync with audio playback using requestAnimationFrame
  useEffect(() => {
    if (!audioElement || state !== 'speaking') {
      console.log('[AnimatedCharacter] Lip-sync conditions not met:', {
        hasAudio: !!audioElement,
        state,
      });
      setCurrentViseme('neutral');
      return;
    }

    console.log('[AnimatedCharacter] Setting up 60fps lip-sync animation');

    let animationFrameId: number;
    let lastViseme: VisemeType = 'neutral';
    // These are typed but currently unused (audio analysis disabled)
    const audioContext: AudioContext | null = null;
    const analyser: AnalyserNode | null = null;
    const dataArray: Uint8Array | null = null;

    // Try to create AudioContext for amplitude analysis
    // DISABLED FOR NOW - causes audio playback issues
    // We'll use timeline-only lip-sync
    try {
      // audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // analyser = audioContext.createAnalyser();
      // analyser.fftSize = 256;
      // const bufferLength = analyser.frequencyBinCount;
      // dataArray = new Uint8Array(bufferLength);

      // // Check if audio element already has a source node
      // // @ts-ignore - checking for existing source
      // if (!audioElement.sourceNode) {
      //   const source = audioContext.createMediaElementSource(audioElement);
      //   source.connect(analyser);
      //   analyser.connect(audioContext.destination);
      //   // @ts-ignore - store reference to prevent duplicate sources
      //   audioElement.sourceNode = source;
      // }
      console.log('[AnimatedCharacter] Audio amplitude analysis disabled, using timeline-only lip-sync');
    } catch (err) {
      console.warn('[AnimatedCharacter] Could not create AudioContext, using fallback:', err);
      // Will use timeline-only mode
    }

    // Animation loop - runs at 60fps
    const animate = () => {
      if (!audioElement || audioElement.paused || audioElement.ended) {
        setCurrentViseme('neutral');
        return;
      }

      const currentTime = audioElement.currentTime;

      // Get current viseme from timeline if available
      let targetViseme: VisemeType = 'neutral';
      if (visemeTimeline.length > 0) {
        targetViseme = getCurrentViseme(visemeTimeline, currentTime);
      }

      // Analyze audio amplitude for more natural movement (if available)
      let volume = 0.5; // Default moderate volume
      if (analyser && dataArray) {
        try {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          volume = average / 255; // Normalize to 0-1
        } catch (err) {
          // Ignore errors, use default volume
        }
      }

      // If no timeline data, use pure amplitude-based animation
      if (visemeTimeline.length === 0) {
        if (volume > 0.4) {
          targetViseme = 'a'; // Wide open for loud sounds
        } else if (volume > 0.25) {
          targetViseme = 'o'; // Medium open
        } else if (volume > 0.15) {
          targetViseme = 'e'; // Slight smile
        } else if (volume > 0.05) {
          targetViseme = 'i'; // Small opening
        } else {
          targetViseme = 'neutral'; // Closed
        }
      } else if (analyser && dataArray) {
        // Hybrid: Use timeline viseme but enhance with volume
        // Boost open visemes when volume is high
        if (volume > 0.4 && targetViseme === 'neutral') {
          targetViseme = 'e'; // Override closed mouth during loud speech
        } else if (volume < 0.05) {
          // Force closed mouth during silence
          targetViseme = 'neutral';
        }
      }
      // else: just use timeline data as-is (no amplitude enhancement)

      // Only update if viseme changed (reduces re-renders)
      if (targetViseme !== lastViseme) {
        setCurrentViseme(targetViseme);
        lastViseme = targetViseme;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup on ended
    const handleEnded = () => {
      console.log('[AnimatedCharacter] Audio ended, stopping animation');
      cancelAnimationFrame(animationFrameId);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      setCurrentViseme('neutral');
    };

    audioElement.addEventListener('ended', handleEnded);

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioElement.removeEventListener('ended', handleEnded);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, [audioElement, state, visemeTimeline]);

  // Idle breathing animation (toggles every 2 seconds)
  useEffect(() => {
    if (state !== 'idle') {
      setIsIdleAnimating(false);
      return;
    }

    const interval = setInterval(() => {
      setIsIdleAnimating(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [state]);

  // Determine which image to display
  const currentImage = useMemo(() => {
    if (state === 'speaking') {
      return VISEME_IMAGE_MAP[currentViseme];
    } else if (state === 'idle') {
      return isIdleAnimating ? neptuneIdle : neptuneNeutral;
    }
    return neptuneNeutral;
  }, [state, currentViseme, isIdleAnimating]);

  // State-specific CSS animations
  const stateClassName = {
    idle: 'animate-float',
    listening: 'animate-pulse-slow',
    thinking: 'animate-bounce-subtle',
    speaking: '',
  }[state];

  return (
    <div className={`relative ${className}`}>
      {/* Container for shadow - keeps shadow stable */}
      <div className="drop-shadow-2xl">
        <img
          src={currentImage}
          alt="Neptune character"
          className={`w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain ${stateClassName}`}
          style={{
            imageRendering: 'auto',
            transition: 'opacity 20ms ease-in-out'
          }}
        />
      </div>

      {/* Preload all SVG images for instant switching */}
      <div style={{ display: 'none' }}>
        <img src={neptuneNeutral} alt="" />
        <img src={neptuneA} alt="" />
        <img src={neptuneE} alt="" />
        <img src={neptuneI} alt="" />
        <img src={neptuneO} alt="" />
        <img src={neptuneU} alt="" />
        <img src={neptuneM} alt="" />
        <img src={neptuneF} alt="" />
        <img src={neptuneL} alt="" />
        <img src={neptuneTH} alt="" />
        <img src={neptuneW} alt="" />
        <img src={neptuneSH} alt="" />
        <img src={neptuneR} alt="" />
        <img src={neptuneIdle} alt="" />
      </div>

      {/* Listening indicator (bouncing dots) */}
      {state === 'listening' && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 'calc(-1rem + 2%)' }}>
          <div className="flex gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full animate-bounce"
                 style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full animate-bounce"
                 style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full animate-bounce"
                 style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
