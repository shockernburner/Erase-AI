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
        <h2 className="mt-[5vh] max-w-[68vw] font-display text-[4.2vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Shipping the wedge. Converting to seats.
        </h2>
        <div className="mt-[6.5vh] grid grid-cols-2 gap-x-[5vw] gap-y-[4.5vh] max-w-[82vw]">
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Product</p>
            <p className="mt-[1.5vh] font-body text-[1.55vw] leading-snug text-text/90">Live browser firewall + Android app + billing (Stripe / Play). Pre-revenue, active pilots.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Motion</p>
            <p className="mt-[1.5vh] font-body text-[1.55vw] leading-snug text-text/90">Free / trial install → Personal or API → Team ($99) → Enterprise custom.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Next 12 months</p>
            <p className="mt-[1.5vh] font-body text-[1.55vw] leading-snug text-text/90">Team admin, shared policies, audit export / SIEM hooks, convert pilots to paid logos.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Buyer</p>
            <p className="mt-[1.5vh] font-body text-[1.55vw] leading-snug text-text/90">Security- and eng-led adoption inside SaaS and professional-services teams.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
