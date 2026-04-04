import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { 
  hook: 4000, 
  scan: 4500, 
  score: 5000, 
  solution: 5000, 
  outro: 4000 
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020617] text-white">
      {/* Persistent Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          src={`${import.meta.env.BASE_URL}videos/cyber-data.mp4`}
          className="w-full h-full object-cover opacity-30 mix-blend-screen"
          autoPlay 
          muted 
          loop 
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]" />
      </div>

      {/* Persistent Grid Overlay */}
      <div className="absolute inset-0 z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
             backgroundSize: '4vw 4vw'
           }} 
      />

      {/* Midground Shapes */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4), transparent)' }}
        animate={{
          x: ['-20vw', '50vw', '10vw', '80vw', '50vw'][currentScene],
          y: ['-20vh', '10vh', '50vh', '20vh', '50vh'][currentScene],
          scale: [1, 1.5, 0.8, 1.2, 1][currentScene],
          opacity: [0.3, 0.5, 0.2, 0.4, 0.6][currentScene]
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute w-[30vw] h-[30vw] rounded-full blur-[80px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent)' }}
        animate={{
          x: ['80vw', '10vw', '70vw', '20vw', '50vw'][currentScene],
          y: ['60vh', '80vh', '10vh', '70vh', '50vh'][currentScene],
          scale: [1.2, 0.8, 1.5, 1, 1.5][currentScene],
          opacity: [0.2, 0.4, 0.5, 0.3, 0][currentScene]
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent Crosshair */}
      <motion.div className="absolute z-0 w-8 h-8 pointer-events-none"
        animate={{
          x: ['10vw', '85vw', '15vw', '80vw', '50vw'][currentScene],
          y: ['10vh', '15vh', '80vh', '80vh', '50vh'][currentScene],
          rotate: [0, 90, 180, 270, 360][currentScene]
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[var(--color-accent)] opacity-50 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--color-accent)] opacity-50 -translate-y-1/2" />
      </motion.div>

      {/* Foreground Scenes */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="hook" />}
          {currentScene === 1 && <Scene2 key="scan" />}
          {currentScene === 2 && <Scene3 key="score" />}
          {currentScene === 3 && <Scene4 key="solution" />}
          {currentScene === 4 && <Scene5 key="outro" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
