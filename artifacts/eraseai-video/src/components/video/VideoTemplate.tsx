import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1_Intro } from '@/components/scenes/Scene1_Intro';
import { Scene2_FreeTier } from '@/components/scenes/Scene2_FreeTier';
import { Scene3_ProTier } from '@/components/scenes/Scene3_ProTier';
import { Scene4_BusinessTier } from '@/components/scenes/Scene4_BusinessTier';
import { Scene5_EnterpriseTier } from '@/components/scenes/Scene5_EnterpriseTier';
import { Scene6_Outro } from '@/components/scenes/Scene6_Outro';

const SCENE_DURATIONS = {
  intro: 7000,
  free: 10000,
  pro: 12000,
  business: 12000,
  enterprise: 15000,
  outro: 9000,
};

const TOTAL_MS = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

function Timeline({ scene, totalScenes }: { scene: number; totalScenes: number }) {
  const elapsed = Object.values(SCENE_DURATIONS).slice(0, scene).reduce((a, b) => a + b, 0);
  const progress = elapsed / TOTAL_MS;

  return (
    <div className="absolute bottom-0 left-0 w-full h-1 z-50" style={{ background: 'rgba(255,255,255,0.1)' }}>
      <motion.div
        className="h-full"
        style={{ background: '#06B6D4' }}
        animate={{ width: `${Math.min(progress * 100 + (100 / totalScenes), 100)}%` }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
    </div>
  );
}

function Background({ currentScene }: { currentScene: number }) {
  return (
    <motion.div
      className="absolute inset-0 z-0 overflow-hidden"
      animate={{
        background: currentScene % 2 === 0
          ? 'radial-gradient(circle at 50% 50%, #0a0a0f 0%, #050508 100%)'
          : 'radial-gradient(circle at 50% 50%, #0f121a 0%, #000000 100%)'
      }}
      transition={{ duration: 3 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.03,
          mixBlendMode: 'overlay',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'
        }}
      />

      <motion.div
        animate={{
          x: currentScene === 0 ? '80vw' : currentScene === 5 ? '10vw' : '50vw',
          y: currentScene === 3 ? '80vh' : '20vh',
          scale: currentScene === 2 ? 2 : 1,
          opacity: currentScene === 4 ? 0.1 : 0.4
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          width: '24rem',
          height: '24rem',
          background: 'rgba(6, 182, 212, 0.2)',
          filter: 'blur(120px)',
          borderRadius: '9999px',
        }}
      />

      <motion.div
        animate={{
          x: currentScene <= 2 ? '-10vw' : '70vw',
          y: currentScene >= 4 ? '10vh' : '60vh',
          scale: currentScene === 5 ? 1.5 : 0.8,
          opacity: 0.2
        }}
        transition={{ duration: 5, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          width: '20rem',
          height: '20rem',
          background: 'rgba(6, 182, 212, 0.15)',
          filter: 'blur(100px)',
          borderRadius: '9999px',
        }}
      />
    </motion.div>
  );
}

export default function VideoTemplate() {
  const { currentScene, totalScenes } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: '#050508' }}>
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-full max-w-[177.78vh] overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <Background currentScene={currentScene} />

          <AnimatePresence mode="popLayout">
            {currentScene === 0 && <Scene1_Intro key="intro" />}
            {currentScene === 1 && <Scene2_FreeTier key="free" />}
            {currentScene === 2 && <Scene3_ProTier key="pro" />}
            {currentScene === 3 && <Scene4_BusinessTier key="business" />}
            {currentScene === 4 && <Scene5_EnterpriseTier key="enterprise" />}
            {currentScene === 5 && <Scene6_Outro key="outro" />}
          </AnimatePresence>

          <Timeline scene={currentScene} totalScenes={totalScenes} />
        </div>
      </div>
    </div>
  );
}
