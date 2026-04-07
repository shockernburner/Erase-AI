export default function SolutionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_40%,rgba(6,182,212,0.25),transparent_50%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.15),transparent_45%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">The Platform</p>
        <h2 className="font-display text-[4.2vw] leading-[1.05] font-bold tracking-tight text-text max-w-[60vw] mb-[2vh]">
          A complete AI data governance layer
        </h2>
        <p className="font-body text-[1.5vw] text-muted max-w-[50vw] mb-[5vh] leading-relaxed">
          EraseAI sits between users and AI models — scanning content, blocking threats, sanitizing data, and providing verifiable proof of compliance.
        </p>
        <div className="grid grid-cols-4 gap-[1.5vw] max-w-[84vw]">
          <div className="text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h4 className="font-display text-[1.4vw] font-bold text-text mb-[0.5vh]">Content Scanning</h4>
            <p className="font-body text-[1.1vw] text-muted">Real-time risk detection across PII, toxicity, bias, and defamation</p>
          </div>
          <div className="text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
            <h4 className="font-display text-[1.4vw] font-bold text-text mb-[0.5vh]">AI Firewall</h4>
            <p className="font-body text-[1.1vw] text-muted">Block prompt injections, jailbreaks, and data exfiltration attempts</p>
          </div>
          <div className="text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h4 className="font-display text-[1.4vw] font-bold text-text mb-[0.5vh]">AI Rewriting</h4>
            <p className="font-body text-[1.1vw] text-muted">Automatically sanitize risky prompts while preserving user intent</p>
          </div>
          <div className="text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <h4 className="font-display text-[1.4vw] font-bold text-text mb-[0.5vh]">Dataset Sanitizer</h4>
            <p className="font-body text-[1.1vw] text-muted">Upload, scan, fix, verify, and export clean training datasets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
