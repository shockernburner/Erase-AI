export default function WhyNowSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -bottom-[25vh] -left-[10vw] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[70px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Why Now</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">03 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[62vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Three forces converging in 2025–2026
        </h2>
        <div className="mt-[8vh] grid grid-cols-3 gap-[3vw]">
          <div>
            <span className="font-mono text-[1.4vw] text-primary">01</span>
            <div className="mt-[1.5vh] h-[0.2vh] w-[4vw] bg-primary/60" />
            <p className="mt-[2.5vh] font-display text-[2vw] font-semibold leading-tight text-text">GenAI went mainstream</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-muted">Now embedded in every knowledge-worker team and workflow.</p>
          </div>
          <div>
            <span className="font-mono text-[1.4vw] text-primary">02</span>
            <div className="mt-[1.5vh] h-[0.2vh] w-[4vw] bg-primary/60" />
            <p className="mt-[2.5vh] font-display text-[2vw] font-semibold leading-tight text-text">Regulation is tightening</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-muted">EU AI Act GPAI obligations live since Aug 2025; GDPR penalties unchanged.</p>
          </div>
          <div>
            <span className="font-mono text-[1.4vw] text-primary">03</span>
            <div className="mt-[1.5vh] h-[0.2vh] w-[4vw] bg-primary/60" />
            <p className="mt-[2.5vh] font-display text-[2vw] font-semibold leading-tight text-text">Breaches cost more</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-muted">Average breach now USD 4.88M globally — IBM, 2024, up 10% year over year.</p>
          </div>
        </div>
        <p className="mt-[8vh] max-w-[62vw] font-body text-[1.6vw] leading-snug text-text/90">
          The browser and prompt layer is an unguarded gap legacy tools were never built for.
        </p>
      </div>
    </div>
  );
}
