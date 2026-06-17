export default function SolutionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute top-0 right-0 w-[40vw] h-full bg-gradient-to-l from-primary/8 to-transparent" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">The Solution</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">04 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[64vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          A real-time firewall for AI prompts
        </h2>
        <div className="mt-[7vh] grid grid-cols-2 gap-[3vw] max-w-[80vw]">
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.5vw]">
            <p className="font-display text-[2vw] font-semibold text-primary">Browser-native</p>
            <p className="mt-[1.5vh] font-body text-[1.5vw] leading-snug text-text/90">Intercepts prompts and attachments in real time on ChatGPT, Claude, Gemini and Replit.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.5vw]">
            <p className="font-display text-[2vw] font-semibold text-primary">On-device detection</p>
            <p className="mt-[1.5vh] font-body text-[1.5vw] leading-snug text-text/90">Finds PII, secrets and sensitive content before data ever leaves the browser.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.5vw]">
            <p className="font-display text-[2vw] font-semibold text-primary">Per-item verdict</p>
            <p className="mt-[1.5vh] font-body text-[1.5vw] leading-snug text-text/90">Every piece of content is rated Safe, Caution or Danger.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.5vw]">
            <p className="font-display text-[2vw] font-semibold text-primary">One-click control</p>
            <p className="mt-[1.5vh] font-body text-[1.5vw] leading-snug text-text/90">Sanitize, Cancel, or Send Anyway — the user stays in control.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
