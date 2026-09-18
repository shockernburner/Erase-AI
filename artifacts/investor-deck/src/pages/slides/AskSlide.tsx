export default function AskSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -bottom-[20vh] right-[5vw] w-[45vw] h-[45vw] rounded-full bg-primary/10 blur-[70px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">The Ask</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">11 / 12</span>
        </div>
        <div className="mt-[5.5vh]">
          <span className="font-mono text-[1.2vw] uppercase tracking-[0.3em] text-muted">Raising</span>
          <h2 className="mt-[2vh] font-display text-[8.5vw] leading-none font-bold tracking-tighter text-primary">$2.5M</h2>
          <p className="mt-[2vh] font-display text-[3vw] font-semibold text-text">Seed · prompt-layer AI firewall</p>
        </div>
        <div className="mt-[6vh] grid grid-cols-3 gap-[3vw] max-w-[84vw]">
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Use of Funds</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-text/90">Team/Enterprise console, detection hardening, GTM to convert pilots into paid seats.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Milestones</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-text/90">Paying Team logos, early ARR, Enterprise design partners with SSO / audit requirements.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-mono text-[1.1vw] uppercase tracking-[0.2em] text-primary">Category</p>
            <p className="mt-[1.5vh] font-body text-[1.45vw] leading-snug text-text/90">AI DLP at the interaction layer inside a ~24% CAGR AI-cybersecurity market.</p>
          </div>
        </div>
        <p className="mt-auto font-mono text-[1.05vw] text-muted">Market figures are third-party research; return scenarios are illustrative, not guaranteed.</p>
      </div>
    </div>
  );
}
