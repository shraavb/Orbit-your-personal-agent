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

    // Audio amplitude analysis is DISABLED - causes audio playback issues
    // Using timeline-only lip-sync for now
    console.log('[AnimatedCharacter] Using timeline-only lip-sync (audio analysis disabled)');

    // Animation loop - runs at 60fps
    const animate = () => {
      if (!audioElement || audioElement.paused || audioElement.ended) {
        setCurrentViseme('neutral');
        return;
      }

      const currentTime = audioElement.currentTime;

      // Get current viseme from timeline
      let targetViseme: VisemeType = 'neutral';
      if (visemeTimeline.length > 0) {
        targetViseme = getCurrentViseme(visemeTimeline, currentTime);
      }

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
      setCurrentViseme('neutral');
    };

    audioElement.addEventListener('ended', handleEnded);

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioElement.removeEventListener('ended', handleEnded);
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
