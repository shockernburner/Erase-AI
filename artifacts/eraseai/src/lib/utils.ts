import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "text-success bg-success/10 border-success/20";
  if (score >= 0.4) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  return "text-destructive bg-destructive/10 border-destructive/20";
}
