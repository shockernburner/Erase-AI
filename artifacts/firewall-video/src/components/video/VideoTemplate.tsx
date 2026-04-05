import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3Reveal } from './scenes/Scene3Reveal';
import { Scene4Browser } from './scenes/Scene4Browser';
import { Scene5Code } from './scenes/Scene5Code';
import { Scene6Sanitize } from './scenes/Scene6Sanitize';
import { Scene7Api } from './scenes/Scene7Api';
import { Scene8Cta } from './scenes/Scene8Cta';

const SCENE_DURATIONS = {
  hook: 3000,
  problem: 4500,
  reveal: 3500,
  browser: 6000,
  code: 6500,
  sanitize: 5500,
  api: 4500,
  cta: 4500,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '5vw 5vw',
        }}
      />

      <motion.div
        className="absolute w-[45vw] h-[45vw] rounded-full blur-[120px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent)' }}
        animate={{
          x: ['-15vw', '40vw', '10vw', '60vw', '30vw', '-5vw', '50vw', '20vw'][currentScene],
          y: ['-10vh', '15vh', '40vh', '5vh', '30vh', '50vh', '10vh', '25vh'][currentScene],
          scale: [1, 1.3, 0.9, 1.2, 1.1, 0.8, 1.4, 1][currentScene],
          opacity: [0.3, 0.4, 0.5, 0.3, 0.35, 0.25, 0.4, 0.5][currentScene],
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute w-[35vw] h-[35vw] rounded-full blur-[100px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent)' }}
        animate={{
          x: ['70vw', '10vw', '60vw', '20vw', '50vw', '70vw', '15vw', '45vw'][currentScene],
          y: ['50vh', '70vh', '10vh', '60vh', '20vh', '40vh', '60vh', '35vh'][currentScene],
          scale: [1.1, 0.8, 1.4, 1, 1.2, 1.3, 0.9, 1.1][currentScene],
          opacity: [0.2, 0.3, 0.2, 0.35, 0.25, 0.15, 0.3, 0.2][currentScene],
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1Hook key="hook" />}
          {currentScene === 1 && <Scene2Problem key="problem" />}
          {currentScene === 2 && <Scene3Reveal key="reveal" />}
          {currentScene === 3 && <Scene4Browser key="browser" />}
          {currentScene === 4 && <Scene5Code key="code" />}
          {currentScene === 5 && <Scene6Sanitize key="sanitize" />}
          {currentScene === 6 && <Scene7Api key="api" />}
          {currentScene === 7 && <Scene8Cta key="cta" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
