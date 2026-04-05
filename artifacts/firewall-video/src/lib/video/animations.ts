import type { Transition, Variants } from 'framer-motion';

export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 15 } as Transition,
  gentle: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
  stiff: { type: 'spring', stiffness: 600, damping: 40 } as Transition,
  poppy: { type: 'spring', stiffness: 500, damping: 22 } as Transition,
} as const;

export const easings = {
  easeOut: { ease: [0.16, 1, 0.3, 1] } as Transition,
  circOut: { ease: 'circOut' } as Transition,
  easeInOut: { ease: [0.4, 0, 0.2, 1] } as Transition,
} as const;

export const sceneTransitions = {
  fadeBlur: {
    initial: { opacity: 0, filter: 'blur(20px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(20px)' },
    transition: { duration: 0.6, ease: 'circOut' },
  },
  scaleFade: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
    transition: { duration: 0.6, ease: 'circOut' },
  },
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.5, ease: 'circOut' },
  },
} as const;

export const charVariants: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -40, transformPerspective: 800 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transformPerspective: 800,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

export const charContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

export const staggerConfigs = {
  fast: { staggerChildren: 0.05, delayChildren: 0 },
  medium: { staggerChildren: 0.1, delayChildren: 0.1 },
  slow: { staggerChildren: 0.2, delayChildren: 0.2 },
} as const;

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: staggerConfigs.medium,
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'circOut' },
  },
};

export function staggerDelay(index: number, baseDelay: number = 0.1): number {
  return index * baseDelay;
}

export function withDelay(transition: Transition, delay: number): Transition {
  return { ...transition, delay };
}
