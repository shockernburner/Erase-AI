import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VideoCanvas,
  VideoPausedContext,
  useVideoPlayer,
  type VideoAspectRatio,
} from '@/lib/video';

import { Hook } from './video_scenes/Hook';
import { WhyNow } from './video_scenes/WhyNow';
import { Problem } from './video_scenes/Problem';
import { Solution } from './video_scenes/Solution';
import { Market } from './video_scenes/Market';
import { BusinessModel } from './video_scenes/BusinessModel';
import { TheAsk } from './video_scenes/TheAsk';
import { Close } from './video_scenes/Close';

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

export const SCENE_DURATIONS = {
  hook: 4000,
  whynow: 3500,
  problem: 3500,
  solution: 4500,
  market: 3500,
  business: 4000,
  ask: 3500,
  close: 3500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Hook,
  whynow: WhyNow,
  problem: Problem,
  solution: Solution,
  market: Market,
  business: BusinessModel,
  ask: TheAsk,
  close: Close,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
    }
    audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        aspectRatio={VIDEO_ASPECT_RATIO}
        style={{ backgroundColor: '#0a0e1a' }}
        className="font-display overflow-hidden"
      >
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <motion.div className="absolute w-[80vw] h-[80vw] rounded-full opacity-10 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }}
          animate={{
            x: ['-20%', '20%', '-10%'],
            y: ['-10%', '30%', '10%'],
            scale: [1, 1.2, 0.9]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.div className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[80px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }}
          animate={{
            x: ['10%', '-20%', '5%'],
            y: ['10%', '-30%', '-10%']
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />

        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-cyber.png)` }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music_2.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}