export default function FeaturesSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Content Intelligence</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          Scan, score, and rewrite — automatically
        </h2>
        <div className="grid grid-cols-2 gap-[2.5vw] max-w-[82vw]">
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">Content Scanning</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Multi-dimensional risk analysis across 10+ categories including toxicity, PII exposure, defamation, bias, and hate speech.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Real-time risk scoring (0-100)</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Category-level threat breakdown</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Inline highlighting of flagged content</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">AI Rewriting</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Intelligent sanitization transforms risky prompts into safe versions while fully preserving the original intent and meaning.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Context-aware rewrites</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Before/after comparison view</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">One-click accept or manual edit</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">Trend Monitoring</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Track safety scores over time with 30-day rolling averages, risk trend alerts, and real-time notification system.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">30-day safety score dashboard</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Risk spike alerts and notifications</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Category-level trend analysis</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1vw] border border-primary/25 bg-gradient-to-b from-primary/8 to-transparent p-[2.2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[2.8vw] h-[2.8vw] rounded-[0.5vw] bg-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-primary">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="font-display text-[1.6vw] font-bold text-text">Personal Mode</h3>
            </div>
            <p className="font-body text-[1.2vw] text-muted leading-relaxed mb-[2vh]">
              Individual users scan posts and prompts before sharing — protecting personal data across social media and AI platforms.
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Post and profile scanning</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">Privacy risk history tracking</span>
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary" />
                <span className="font-body text-[1.1vw] text-text/80">$5/month — unlimited scans</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
