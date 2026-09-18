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
        <h2 className="mt-[5vh] max-w-[68vw] font-display text-[4.4vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          A prompt-layer firewall for public AI
        </h2>
        <div className="mt-[6vh] grid grid-cols-2 gap-[2.5vw] max-w-[82vw]">
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.2vw]">
            <p className="font-display text-[1.9vw] font-semibold text-primary">Browser extension</p>
            <p className="mt-[1.4vh] font-body text-[1.45vw] leading-snug text-text/90">Intercepts prompts and attachments in ChatGPT, Claude, Gemini before Send.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.2vw]">
            <p className="font-display text-[1.9vw] font-semibold text-primary">Android firewall</p>
            <p className="mt-[1.4vh] font-body text-[1.45vw] leading-snug text-text/90">Same send-gate on phone AI apps — Cancel, Sanitize, or Send Anyway.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.2vw]">
            <p className="font-display text-[1.9vw] font-semibold text-primary">Risk before disclosure</p>
            <p className="mt-[1.4vh] font-body text-[1.45vw] leading-snug text-text/90">Flags PII, secrets, credentials, and high-risk content at the moment of send.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2.2vw]">
            <p className="font-display text-[1.9vw] font-semibold text-primary">Path to Team / Enterprise</p>
            <p className="mt-[1.4vh] font-body text-[1.45vw] leading-snug text-text/90">Individual install → shared policies, admin, audit — then SSO and SIEM.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
