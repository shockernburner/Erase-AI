const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        alt="Abstract neural network visualization"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[7vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[3.5vw] h-[3.5vw] rounded-[0.6vw] bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[2vw] h-[2vw] text-bg">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <line x1="4" y1="10" x2="20" y2="14" />
            </svg>
          </div>
          <span className="font-display text-[1.8vw] font-bold tracking-tight text-text">EraseAI</span>
        </div>
        <div className="max-w-[65vw]">
          <h1 className="font-display text-[6.5vw] leading-[0.92] font-bold tracking-tighter text-text">
            Make AI Forget
          </h1>
          <h1 className="font-display text-[6.5vw] leading-[0.92] font-bold tracking-tighter text-primary">
            What It Should
          </h1>
          <h1 className="font-display text-[6.5vw] leading-[0.92] font-bold tracking-tighter text-text">
            Never Learn
          </h1>
          <p className="mt-[3vh] max-w-[50vw] text-[1.8vw] leading-snug text-muted font-body">
            The AI Data Governance Platform — real-time firewall, content scanning, dataset sanitization, and developer API for privacy, fairness, and compliance.
          </p>
        </div>
        <div className="flex items-center gap-[2vw]">
          <span className="font-body text-[1.3vw] text-muted">eraseai.ai</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-body text-[1.3vw] text-muted">Singapore</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-body text-[1.3vw] text-muted">Agent 4 Buildathon 2026</span>
        </div>
      </div>
    </div>
  );
}
