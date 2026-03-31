export default function FeaturesSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Key Features</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          Three engines, one platform
        </h2>
        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">Dataset Unlearning</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Upload CSV, JSON, or TXT datasets. Delete or redact rows by keyword with full version control.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Immutable version history</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Side-by-side Before/After diffs</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Forget Score verification</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">Intelligence Engine</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Automated scanning for PII, bias, toxic content, duplicates, and quality issues with one-click fixes.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Column-level profiling</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Bias auditing (proxy, imbalance, skew)</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Auto-fix recommendations</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" /><path d="M12 8v8" /><path d="M8 16a4 4 0 0 0 8 0" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">ML Feedback</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Actionable ML pipeline recommendations with Python code snippets for preprocessing, training, and evaluation.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Priority-ranked suggestions</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Exportable (Markdown / JSON)</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Category-filtered view</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
