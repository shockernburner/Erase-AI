export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.2),transparent_55%)]" />
      <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.3),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.2),transparent_40%)]" />
      <div className="relative flex h-full flex-col items-center justify-center px-[7vw] py-[7vh] text-center">
        <div className="w-[5vw] h-[5vw] rounded-[1vw] bg-primary flex items-center justify-center mb-[4vh]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[3vw] h-[3vw] text-bg">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <line x1="4" y1="10" x2="20" y2="14" />
          </svg>
        </div>
        <h2 className="font-display text-[5.5vw] leading-[0.95] font-bold tracking-tighter text-text mb-[2vh]">
          EraseAI
        </h2>
        <p className="font-body text-[2.2vw] text-primary font-semibold mb-[4vh]">
          Make AI forget what it should never learn
        </p>
        <div className="w-[8vw] h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent mb-[4vh]" />
        <p className="font-body text-[1.5vw] text-muted max-w-[50vw] leading-relaxed mb-[5vh]">
          AI Firewall. Content Scanning. Dataset Sanitizer. Developer API. Personal Mode. Trend Monitoring. Full compliance stack.
        </p>
        <div className="flex items-center gap-[3vw]">
          <span className="font-body text-[1.3vw] text-text/70">eraseai.ai</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-body text-[1.3vw] text-text/70">director@futureonward.com</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-body text-[1.3vw] text-text/70">Singapore</span>
        </div>
      </div>
    </div>
  );
}
