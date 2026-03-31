export default function HowItWorksSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_50%_80%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">How It Works</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[6vh]">
          From upload to verified erasure
        </h2>
        <div className="flex items-start gap-[1vw] max-w-[84vw]">
          <div className="flex-1 relative">
            <div className="absolute top-[1.5vw] left-[2.5vw] right-0 h-[2px] bg-gradient-to-r from-primary/40 to-transparent" />
            <div className="relative flex flex-col items-start">
              <div className="w-[3vw] h-[3vw] rounded-full bg-primary text-bg flex items-center justify-center font-display text-[1.4vw] font-bold mb-[1.5vh]">1</div>
              <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.8vh]">Upload</h4>
              <p className="font-body text-[1.1vw] text-muted leading-relaxed pr-[1vw]">Drop your CSV, JSON, or TXT dataset. Auto-detection of format and delimiters.</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-[1.5vw] left-0 right-0 h-[2px] bg-primary/30" />
            <div className="relative flex flex-col items-start">
              <div className="w-[3vw] h-[3vw] rounded-full bg-primary text-bg flex items-center justify-center font-display text-[1.4vw] font-bold mb-[1.5vh]">2</div>
              <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.8vh]">Scan</h4>
              <p className="font-body text-[1.1vw] text-muted leading-relaxed pr-[1vw]">Automated analysis detects PII, bias, toxicity, duplicates, and quality issues.</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-[1.5vw] left-0 right-0 h-[2px] bg-primary/30" />
            <div className="relative flex flex-col items-start">
              <div className="w-[3vw] h-[3vw] rounded-full bg-primary text-bg flex items-center justify-center font-display text-[1.4vw] font-bold mb-[1.5vh]">3</div>
              <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.8vh]">Fix</h4>
              <p className="font-body text-[1.1vw] text-muted leading-relaxed pr-[1vw]">Apply one-click fixes or surgically erase specific data. Every change creates a new version.</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-[1.5vw] left-0 right-0 h-[2px] bg-primary/30" />
            <div className="relative flex flex-col items-start">
              <div className="w-[3vw] h-[3vw] rounded-full bg-primary text-bg flex items-center justify-center font-display text-[1.4vw] font-bold mb-[1.5vh]">4</div>
              <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.8vh]">Verify</h4>
              <p className="font-body text-[1.1vw] text-muted leading-relaxed pr-[1vw]">Forget Score mathematically proves the target knowledge has been removed.</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-[1.5vw] left-0 right-[-1vw] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
            <div className="relative flex flex-col items-start">
              <div className="w-[3vw] h-[3vw] rounded-full bg-primary text-bg flex items-center justify-center font-display text-[1.4vw] font-bold mb-[1.5vh]">5</div>
              <h4 className="font-display text-[1.5vw] font-bold text-text mb-[0.8vh]">Export</h4>
              <p className="font-body text-[1.1vw] text-muted leading-relaxed">Download cleaned data in multiple modes. Full audit trail for compliance.</p>
            </div>
          </div>
        </div>
        <div className="mt-[5vh] flex items-center gap-[3vw]">
          <div className="flex items-center gap-[0.6vw]">
            <span className="w-[0.8vw] h-[0.8vw] rounded-full bg-green-400" />
            <span className="font-body text-[1.2vw] text-muted">Git-like version control for every operation</span>
          </div>
          <div className="flex items-center gap-[0.6vw]">
            <span className="w-[0.8vw] h-[0.8vw] rounded-full bg-green-400" />
            <span className="font-body text-[1.2vw] text-muted">Complete operation audit log</span>
          </div>
          <div className="flex items-center gap-[0.6vw]">
            <span className="w-[0.8vw] h-[0.8vw] rounded-full bg-green-400" />
            <span className="font-body text-[1.2vw] text-muted">Side-by-side diff comparison</span>
          </div>
        </div>
      </div>
    </div>
  );
}
