import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  intro: 6000,
  enterprise: 16000,
  analytics: 10000,
  personal: 12000,
  developer: 14000,
  closing: 6000,
};

const accentPositions = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.15 },
  { x: '8vw', y: '15vh', scale: 1.5, opacity: 0.2 },
  { x: '75vw', y: '50vh', scale: 1.8, opacity: 0.12 },
  { x: '30vw', y: '60vh', scale: 1.2, opacity: 0.18 },
  { x: '20vw', y: '25vh', scale: 1, opacity: 0.15 },
  { x: '60vw', y: '35vh', scale: 2, opacity: 0.1 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#050811' }}>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")` }} />
        <motion.div
          className="absolute w-[70vw] h-[70vw] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent)' }}
          animate={{ x: ['-20%', '30%', '-10%'], y: ['-10%', '20%', '-30%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[50vw] h-[50vw] rounded-full blur-[100px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent)' }}
          animate={{ x: ['10%', '-30%', '20%'], y: ['10%', '-40%', '10%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw',
        }}
        animate={{
          opacity: currentScene >= 1 && currentScene <= 4 ? 0.3 : 0.05,
          scale: currentScene >= 1 && currentScene <= 4 ? 1.1 : 1,
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute w-40 h-40 rounded-full blur-[60px]"
        style={{ background: 'rgba(6,182,212,0.3)' }}
        animate={accentPositions[currentScene] || accentPositions[0]}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #06B6D4, transparent)' }}
        animate={{
          left: ['20%', '5%', '40%', '10%', '60%', '30%'][currentScene],
          width: ['60%', '90%', '30%', '50%', '40%', '50%'][currentScene],
          top: ['50%', '8%', '85%', '40%', '15%', '60%'][currentScene],
          opacity: [0.3, 0.6, 0.4, 0.5, 0.6, 0.3][currentScene],
        }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="intro" />}
        {currentScene === 1 && <Scene2 key="enterprise" />}
        {currentScene === 2 && <Scene3 key="analytics" />}
        {currentScene === 3 && <Scene4 key="personal" />}
        {currentScene === 4 && <Scene5 key="developer" />}
        {currentScene === 5 && <Scene6 key="closing" />}
      </AnimatePresence>
    </div>
  );
}
