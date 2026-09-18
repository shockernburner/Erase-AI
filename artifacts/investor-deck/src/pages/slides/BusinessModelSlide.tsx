export default function BusinessModelSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-primary/8 to-transparent" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Business Model</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">08 / 12</span>
        </div>
        <h2 className="mt-[4.5vh] max-w-[70vw] font-display text-[4.2vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Land free. Monetize Team. Expand Enterprise.
        </h2>
        <div className="mt-[5.5vh] grid grid-cols-4 gap-[1.8vw]">
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[1.8vw] flex flex-col">
            <span className="font-mono text-[1.05vw] uppercase tracking-[0.2em] text-muted">Trial / Free</span>
            <p className="mt-[1.8vh] font-display text-[2.4vw] font-bold text-text leading-none">$0</p>
            <p className="mt-[2vh] font-body text-[1.25vw] leading-snug text-muted">7-day trial · browser + Android firewall wedge.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[1.8vw] flex flex-col">
            <span className="font-mono text-[1.05vw] uppercase tracking-[0.2em] text-muted">Personal</span>
            <p className="mt-[1.8vh] font-display text-[2.4vw] font-bold text-text leading-none">$5<span className="text-[1.2vw] text-muted font-normal">/mo</span></p>
            <p className="mt-[2vh] font-body text-[1.25vw] leading-snug text-muted">Acquisition seat · full individual protection.</p>
          </div>
          <div className="rounded-[1vw] bg-primary/10 border border-primary/40 p-[1.8vw] flex flex-col">
            <span className="font-mono text-[1.05vw] uppercase tracking-[0.2em] text-primary">Team</span>
            <p className="mt-[1.8vh] font-display text-[2.4vw] font-bold text-text leading-none">$99<span className="text-[1.2vw] text-muted font-normal">/mo</span></p>
            <p className="mt-[2vh] font-body text-[1.25vw] leading-snug text-text/90">Primary revenue · 10 seats, shared policy, admin.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[1.8vw] flex flex-col">
            <span className="font-mono text-[1.05vw] uppercase tracking-[0.2em] text-muted">Enterprise</span>
            <p className="mt-[1.8vh] font-display text-[2.4vw] font-bold text-text leading-none">Custom</p>
            <p className="mt-[2vh] font-body text-[1.25vw] leading-snug text-muted">SSO · audit · SIEM · private / VPC.</p>
          </div>
        </div>
        <div className="mt-[4vh] flex items-center gap-[2.5vw]">
          <p className="font-mono text-[1.2vw] text-muted">
            Developer API <span className="text-text">$19/mo</span> — embed scanning in products
          </p>
          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-primary" />
          <p className="font-mono text-[1.2vw] text-muted">
            Live pricing on eraseai.ai · Stripe + Google Play
          </p>
        </div>
        <p className="mt-[3vh] max-w-[72vw] font-body text-[1.45vw] leading-snug text-text/90">
          Bottom-up install converts into Team seats; Enterprise is the upsell once policy and audit matter.
        </p>
      </div>
    </div>
  );
}
