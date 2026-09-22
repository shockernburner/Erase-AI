import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  hook: { title: 'Critical Alert', filePath: 'src/components/video/video_scenes/Hook.tsx' },
  whynow: { title: 'Why Now', filePath: 'src/components/video/video_scenes/WhyNow.tsx' },
  problem: { title: 'The Problem', filePath: 'src/components/video/video_scenes/Problem.tsx' },
  solution: { title: 'The Solution', filePath: 'src/components/video/video_scenes/Solution.tsx' },
  market: { title: 'Market', filePath: 'src/components/video/video_scenes/Market.tsx' },
  business: { title: 'Business Model', filePath: 'src/components/video/video_scenes/BusinessModel.tsx' },
  ask: { title: 'The Ask', filePath: 'src/components/video/video_scenes/TheAsk.tsx' },
  close: { title: 'Closing', filePath: 'src/components/video/video_scenes/Close.tsx' },
};

function formatTime(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - startedAt);
    }, PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(interval);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [paused, tick]);

  const progress =
    activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(
    totalDuration,
    activeStartTime + Math.min(elapsed, activeDuration),
  );

  return (
    <>
      <div className="flex flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            onClick={() => onJumpTo(index)}
            className="relative h-3 min-h-[12px] flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/25"
            aria-label={`Jump to scene ${index + 1}: ${SCENE_DETAILS[key]?.title ?? key}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100"
              style={{
                width: `${index === activeIndex ? progress * 100 : 0}%`,
              }}
            />
          </button>
        ))}
      </div>
      <div className="shrink-0 font-mono text-xl tabular-nums text-white/60">
        {activeIndex + 1}/{sceneKeys.length}
      </div>
      <div className="min-w-[11ch] shrink-0 text-right font-mono text-xl tabular-nums text-white/80">
        {formatTime(totalElapsed)} / {formatTime(totalDuration)}
      </div>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed =
    typeof window !== 'undefined' && window.self !== window.top;
  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!paused) return;
    const frozen = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [paused]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (!sensorRef.current?.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collapsed, tapPinned]);

  const handleJumpTo = useCallback(
    (index: number) => {
      jumpTo(index);
      const key = sceneKeys[index];
      const details = SCENE_DETAILS[key];
      if (!details) return;
      window.parent.postMessage(
        {
          type: 'REPLIT_VIDEO_SCENE_SELECTED',
          payload: {
            sceneIndex: index,
            sceneCount: sceneKeys.length,
            sceneTitle: details.title,
            filePath: details.filePath,
            lineNumber: 1,
          },
        },
        '*',
      );
    },
    [jumpTo, sceneKeys],
  );

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  };
  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  };

  if (!isIframed) return <VideoTemplate />;

  const visible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        paused={paused}
        muted={muted}
        onSceneChange={onSceneChange}
      />
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
        }}
      >
        <div className="flex-1" aria-hidden="true" />
        <div
          className={`flex items-center gap-3 bg-black/50 px-5 py-4 backdrop-blur-sm transition-all duration-200 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <button
            onClick={togglePause}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={paused ? 'Play' : 'Pause'}
          >
            {paused ? <Play className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
          </button>
          <button
            onClick={toggleLock}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${
              locked ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
            aria-label="Loop current scene"
            aria-pressed={locked}
          >
            <Repeat className="h-8 w-8" />
          </button>
          <button
            onClick={() => setMuted((value) => !value)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
          </button>
          <div className="w-px self-stretch bg-white/15" aria-hidden="true" />
          <PlaybackStatus
            sceneKeys={sceneKeys}
            activeIndex={activeIndex}
            activeDuration={activeDuration}
            activeStartTime={activeStartTime}
            totalDuration={totalDuration}
            tick={tick}
            paused={paused}
            onJumpTo={handleJumpTo}
          />
          <button
            onClick={() => {
              setCollapsed((value) => !value);
              setHovering(false);
              setTapPinned(false);
            }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Show controls' : 'Hide controls'}
          >
            {collapsed ? (
              <ChevronUp className="h-10 w-10" />
            ) : (
              <ChevronDown className="h-10 w-10" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}