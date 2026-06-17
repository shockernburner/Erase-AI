export default function MarketSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Market</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">07 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[60vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          A large, fast-growing security market
        </h2>
        <div className="mt-[6vh] grid grid-cols-[1.1fr_0.9fr] gap-[5vw] items-end">
          <div>
            <div className="flex items-end gap-[3vw] h-[34vh]">
              <div className="flex flex-col items-center justify-end h-full">
                <span className="font-mono text-[1.3vw] text-muted mb-[1vh]">$25.35B</span>
                <div className="w-[7vw] rounded-t-[0.4vw] bg-primary/40" style={{ height: "27%" }} />
                <span className="font-mono text-[1.05vw] text-muted mt-[1.2vh]">2024</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[2.4vw] h-[2.4vw] text-primary mb-[6vh]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <div className="flex flex-col items-center justify-end h-full">
                <span className="font-mono text-[1.3vw] text-primary mb-[1vh]">$93.75B</span>
                <div className="w-[7vw] rounded-t-[0.4vw] bg-primary" style={{ height: "100%" }} />
                <span className="font-mono text-[1.05vw] text-muted mt-[1.2vh]">2030</span>
              </div>
            </div>
            <p className="mt-[3vh] font-mono text-[1.05vw] text-muted">AI in cybersecurity · 24.4% CAGR · Grand View Research</p>
          </div>
          <div className="flex flex-col gap-[4vh]">
            <div className="border-l-2 border-primary/50 pl-[1.5vw]">
              <p className="font-display text-[3vw] font-bold text-text leading-none">24.4%</p>
              <p className="mt-[1vh] font-body text-[1.4vw] text-muted">CAGR for AI in cybersecurity through 2030.</p>
            </div>
            <div className="border-l-2 border-primary/50 pl-[1.5vw]">
              <p className="font-display text-[3vw] font-bold text-text leading-none">$9.33B</p>
              <p className="mt-[1vh] font-body text-[1.4vw] text-muted">Data loss prevention market by 2030 (Grand View Research).</p>
            </div>
          </div>
        </div>
        <p className="mt-[5vh] max-w-[66vw] font-body text-[1.55vw] leading-snug text-text/90">
          Every company adopting AI becomes a buyer of AI-data governance.
        </p>
      </div>
    </div>
  );
}
