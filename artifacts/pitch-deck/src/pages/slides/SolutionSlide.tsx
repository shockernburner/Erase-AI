export default function SolutionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_40%,rgba(6,182,212,0.25),transparent_50%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.15),transparent_45%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">The Solution</p>
        <h2 className="font-display text-[4.2vw] leading-[1.05] font-bold tracking-tight text-text max-w-[60vw] mb-[2vh]">
          Your governance layer for responsible AI
        </h2>
        <p className="font-body text-[1.6vw] text-muted max-w-[50vw] mb-[5vh] leading-relaxed">
          EraseAI is a full-stack platform that detects, audits, and surgically removes unwanted data from AI training datasets -- with version control and verifiable proof.
        </p>
        <div className="flex items-center gap-[1.5vw] max-w-[82vw]">
          <div className="flex-1 text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.5vh]">Detect</h4>
            <p className="font-body text-[1.2vw] text-muted">PII, bias, toxicity, duplicates</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary/50 shrink-0">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="flex-1 text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.5vh]">Analyze</h4>
            <p className="font-body text-[1.2vw] text-muted">Profile columns, audit for bias</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary/50 shrink-0">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="flex-1 text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.5vh]">Erase</h4>
            <p className="font-body text-[1.2vw] text-muted">Delete or redact with versioning</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary/50 shrink-0">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="flex-1 text-center p-[2vw] rounded-[0.8vw] border border-primary/30 bg-primary/5">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw] text-primary">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.5vh]">Verify</h4>
            <p className="font-body text-[1.2vw] text-muted">Forget Score proves removal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
