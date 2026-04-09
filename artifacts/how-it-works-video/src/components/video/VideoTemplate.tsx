import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { intro: 4000, dataset: 6000, analytics: 5000, developer: 5000, closing: 4000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)] text-[var(--color-text-primary)]">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-10 blur-[100px]"
          style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
          animate={{ 
            x: ['-20%', '30%', '-10%'], 
            y: ['-10%', '20%', '-30%'],
            scale: [1, 1.2, 0.9] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
        />
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[100px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
          animate={{ 
            x: ['10%', '-30%', '20%'], 
            y: ['10%', '-40%', '10%'] 
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} 
        />
      </div>

      {/* Persistent Grid Pattern */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw',
          transformPerspective: 1000,
        }}
        animate={{
          rotateX: currentScene >= 1 && currentScene <= 3 ? 45 : 0,
          scale: currentScene >= 1 && currentScene <= 3 ? 1.5 : 1,
          y: currentScene >= 1 && currentScene <= 3 ? '20%' : '0%',
          opacity: currentScene === 0 || currentScene === 4 ? 0.05 : 0.2
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Main Content inside AnimatePresence */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="intro" />}
        {currentScene === 1 && <Scene2 key="dataset" />}
        {currentScene === 2 && <Scene3 key="analytics" />}
        {currentScene === 3 && <Scene4 key="developer" />}
        {currentScene === 4 && <Scene5 key="closing" />}
      </AnimatePresence>
    </div>
  );
}
