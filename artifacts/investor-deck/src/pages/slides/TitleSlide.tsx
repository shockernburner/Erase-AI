const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-55"
        alt="Abstract firewall intercepting data streams"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/85 via-transparent to-transparent" />
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
        <div className="max-w-[74vw]">
          <div className="flex items-center gap-[0.8vw] mb-[2.5vh]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1.05vw] uppercase tracking-[0.35em] text-primary">Seed Round · 2026</span>
          </div>
          <h1 className="font-display text-[6.4vw] leading-[0.92] font-bold tracking-tighter text-text">
            The AI firewall
          </h1>
          <h1 className="font-display text-[6.4vw] leading-[0.92] font-bold tracking-tighter text-primary">
            for the prompt layer
          </h1>
          <p className="mt-[3.5vh] max-w-[56vw] text-[1.7vw] leading-snug text-muted font-body" style={{ textWrap: "balance" }}>
            Stop secrets from reaching ChatGPT, Claude, and Gemini — then sell team policy and enterprise audit on top.
          </p>
        </div>
        <div className="flex items-center gap-[2vw]">
          <span className="font-mono text-[1.25vw] text-muted">eraseai.ai</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-mono text-[1.25vw] text-muted">Vantward Solutions</span>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <span className="font-mono text-[1.25vw] text-muted">Singapore</span>
        </div>
      </div>
    </div>
  );
}
