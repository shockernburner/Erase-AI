export default function TractionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute top-0 right-0 w-[40vw] h-full bg-gradient-to-l from-primary/8 to-transparent" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Traction</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">10 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[64vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Working product, pilots, and a path to revenue
        </h2>
        <div className="mt-[7vh] grid grid-cols-2 gap-x-[5vw] gap-y-[5vh] max-w-[80vw]">
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Status</p>
            <p className="mt-[1.5vh] font-body text-[1.65vw] leading-snug text-text/90">Pre-revenue with a working product and active pilots.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Motion</p>
            <p className="mt-[1.5vh] font-body text-[1.65vw] leading-snug text-text/90">Free extension → paid individual → team → enterprise.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Roadmap</p>
            <p className="mt-[1.5vh] font-body text-[1.65vw] leading-snug text-text/90">Enterprise admin console, SIEM/log integrations, expanded model coverage, custom policies.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Distribution</p>
            <p className="mt-[1.5vh] font-body text-[1.65vw] leading-snug text-text/90">Developer- and security-team-led adoption.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
