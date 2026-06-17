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
        <h2 className="mt-[5vh] max-w-[64vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Land with individuals, expand to the enterprise
        </h2>
        <div className="mt-[7vh] grid grid-cols-4 gap-[2vw]">
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2vw] flex flex-col">
            <span className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-muted">Free</span>
            <p className="mt-[2vh] font-display text-[2.6vw] font-bold text-text leading-none">$0</p>
            <p className="mt-[2.5vh] font-body text-[1.35vw] leading-snug text-muted">Core firewall for every user.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2vw] flex flex-col">
            <span className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-muted">Personal</span>
            <p className="mt-[2vh] font-display text-[2.6vw] font-bold text-text leading-none">$5<span className="text-[1.3vw] text-muted font-normal">/mo</span></p>
            <p className="mt-[2.5vh] font-body text-[1.35vw] leading-snug text-muted">Full protection for one user.</p>
          </div>
          <div className="rounded-[1vw] bg-primary/10 border border-primary/40 p-[2vw] flex flex-col">
            <span className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Pro</span>
            <p className="mt-[2vh] font-display text-[2.6vw] font-bold text-text leading-none">$20<span className="text-[1.3vw] text-muted font-normal">/mo</span></p>
            <p className="mt-[2.5vh] font-body text-[1.35vw] leading-snug text-text/90">Advanced detection and policies.</p>
          </div>
          <div className="rounded-[1vw] bg-white/[0.03] border border-white/10 p-[2vw] flex flex-col">
            <span className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-muted">Enterprise</span>
            <p className="mt-[2vh] font-display text-[2.6vw] font-bold text-text leading-none">Custom</p>
            <p className="mt-[2.5vh] font-body text-[1.35vw] leading-snug text-muted">SAML SSO, audit logs, admin console.</p>
          </div>
        </div>
        <p className="mt-[7vh] max-w-[68vw] font-body text-[1.55vw] leading-snug text-text/90">
          Bottom-up adoption via the browser extension converts into team and enterprise seats.
        </p>
      </div>
    </div>
  );
}
