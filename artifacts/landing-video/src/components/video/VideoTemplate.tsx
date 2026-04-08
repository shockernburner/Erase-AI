import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';
import { Scene9 } from './video_scenes/Scene9';

const SCENE_DURATIONS = {
  ambient: 10000,
  logoReveal: 5000,
  problem: 5000,
  governance: 5000,
  scanning: 13000,
  rewriting: 10000,
  firewall: 17000,
  devTools: 10000,
  closing: 10000,
};

const orbPositions = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.15 },
  { x: '20vw', y: '25vh', scale: 1.8, opacity: 0.2 },
  { x: '70vw', y: '60vh', scale: 1.2, opacity: 0.15 },
  { x: '30vw', y: '50vh', scale: 2, opacity: 0.18 },
  { x: '60vw', y: '20vh', scale: 1.5, opacity: 0.12 },
  { x: '15vw', y: '70vh', scale: 2.2, opacity: 0.2 },
  { x: '80vw', y: '30vh', scale: 1.8, opacity: 0.15 },
  { x: '40vw', y: '80vh', scale: 1, opacity: 0.1 },
  { x: '50vw', y: '45vh', scale: 3, opacity: 0.08 },
];

const accentLinePositions = [
  { left: '25%', width: '50%', top: '52%', opacity: 0.6 },
  { left: '5%', width: '90%', top: '48%', opacity: 0.8 },
  { left: '55%', width: '25%', top: '88%', opacity: 0.4 },
  { left: '10%', width: '80%', top: '30%', opacity: 0.5 },
  { left: '35%', width: '30%', top: '65%', opacity: 0.7 },
  { left: '20%', width: '60%', top: '42%', opacity: 0.5 },
  { left: '40%', width: '20%', top: '55%', opacity: 0.9 },
  { left: '15%', width: '70%', top: '75%', opacity: 0.3 },
  { left: '30%', width: '40%', top: '35%', opacity: 0.6 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0e1a]">
      <div className="absolute inset-0">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }}
          animate={{
            x: ['-10%', '60%', '20%'],
            y: ['10%', '50%', '30%'],
            scale: [1, 1.3, 0.9],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-3xl right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
          animate={{
            x: ['10%', '-40%', '5%'],
            y: ['-10%', '-50%', '-20%'],
            opacity: [0.06, 0.12, 0.06],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="absolute w-40 h-40 rounded-full bg-[#06B6D4]/40 blur-xl"
        animate={orbPositions[currentScene]}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute h-[2px] bg-[#06B6D4]"
        animate={accentLinePositions[currentScene]}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="ambient" />}
        {currentScene === 1 && <Scene2 key="logoReveal" />}
        {currentScene === 2 && <Scene3 key="problem" />}
        {currentScene === 3 && <Scene4 key="governance" />}
        {currentScene === 4 && <Scene5 key="scanning" />}
        {currentScene === 5 && <Scene6 key="rewriting" />}
        {currentScene === 6 && <Scene7 key="firewall" />}
        {currentScene === 7 && <Scene8 key="devTools" />}
        {currentScene === 8 && <Scene9 key="closing" />}
      </AnimatePresence>
    </div>
  );
}
