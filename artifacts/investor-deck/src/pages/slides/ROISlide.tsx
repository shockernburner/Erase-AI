export default function ROISlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -top-[15vh] -left-[10vw] w-[45vw] h-[45vw] rounded-full bg-primary/8 blur-[70px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Unit Economics</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">09 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[60vw] font-display text-[4.4vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          The economics of prevention
        </h2>
        <div className="mt-[3vh]">
          <span className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Illustrative · projection-based · pre-revenue</span>
        </div>
        <div className="mt-[5vh] grid grid-cols-3 gap-[3vw] items-start">
          <div>
            <p className="font-display text-[4.2vw] font-bold text-primary leading-none">$4.88M</p>
            <p className="mt-[2vh] font-body text-[1.4vw] leading-snug text-text/90">Average breach cost (IBM, 2024) — one prevented leak can fund years of seats.</p>
          </div>
          <div>
            <p className="font-display text-[4.2vw] font-bold text-text leading-none">$99</p>
            <p className="mt-[2vh] font-body text-[1.4vw] leading-snug text-text/90">Team plan / month (10 seats). Security budget, not consumer spend.</p>
          </div>
          <div>
            <p className="font-display text-[4.2vw] font-bold text-text leading-none">Land → Expand</p>
            <p className="mt-[2vh] font-body text-[1.4vw] leading-snug text-text/90">Personal/API seats land; Team and Enterprise expand ACV.</p>
          </div>
        </div>
        <p className="mt-auto font-mono text-[1.05vw] text-muted">
          Figures are illustrative projections, not historical results.
        </p>
      </div>
    </div>
  );
}
