const base = import.meta.env.BASE_URL;

export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        alt="Abstract firewall intercepting data streams"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/70" />
      <div className="relative flex h-full flex-col justify-between px-[7vw] py-[7vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[3.4vw] h-[3.4vw] rounded-[0.6vw] bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[1.9vw] h-[1.9vw] text-bg">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <line x1="4" y1="10" x2="20" y2="14" />
            </svg>
          </div>
          <span className="font-display text-[1.8vw] font-bold tracking-tight text-text">EraseAI</span>
        </div>
        <div className="max-w-[76vw]">
          <h1 className="font-display text-[5.2vw] leading-[0.98] font-bold tracking-tighter text-text" style={{ textWrap: "balance" }}>
            Stop the leak before Send.
          </h1>
          <h1 className="font-display text-[5.2vw] leading-[0.98] font-bold tracking-tighter text-primary" style={{ textWrap: "balance" }}>
            Sell the control plane after.
          </h1>
          <p className="mt-[3.5vh] font-body text-[1.6vw] leading-snug text-muted max-w-[58vw]">
            Prompt-layer AI firewall → Team policy → Enterprise audit.
          </p>
        </div>
        <div className="flex items-center gap-[2vw]">
          <span className="font-mono text-[1.3vw] text-text">Vantward Solutions</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-mono text-[1.3vw] text-muted">Singapore</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-mono text-[1.3vw] text-primary">eraseai.ai</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-mono text-[1.3vw] text-primary">director@vantward.com</span>
        </div>
      </div>
    </div>
  );
}
