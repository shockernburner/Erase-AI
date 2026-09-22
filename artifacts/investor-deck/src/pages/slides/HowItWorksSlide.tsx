export default function HowItWorksSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-x-0 top-1/2 h-[0.15vh] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">How It Works</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">05 / 13</span>
        </div>
        <h2 className="mt-[5vh] max-w-[60vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          From keystroke to safe send
        </h2>
        <div className="mt-[9vh] grid grid-cols-4 gap-[2vw]">
          <div className="relative">
            <span className="font-mono text-[1.2vw] text-primary">STEP 01</span>
            <p className="mt-[2vh] font-display text-[2.1vw] font-semibold text-text">Intercept</p>
            <p className="mt-[1.5vh] font-body text-[1.4vw] leading-snug text-muted">Capture prompt text and attachments as they're typed or uploaded.</p>
          </div>
          <div className="relative">
            <span className="font-mono text-[1.2vw] text-primary">STEP 02</span>
            <p className="mt-[2vh] font-display text-[2.1vw] font-semibold text-text">Inspect</p>
            <p className="mt-[1.5vh] font-body text-[1.4vw] leading-snug text-muted">On-device detection across text, files, images (OCR) and archives.</p>
          </div>
          <div className="relative">
            <span className="font-mono text-[1.2vw] text-primary">STEP 03</span>
            <p className="mt-[2vh] font-display text-[2.1vw] font-semibold text-text">Verdict</p>
            <p className="mt-[1.5vh] font-body text-[1.4vw] leading-snug text-muted">Each item rated Safe, Caution or Danger with a clear reason.</p>
          </div>
          <div className="relative">
            <span className="font-mono text-[1.2vw] text-primary">STEP 04</span>
            <p className="mt-[2vh] font-display text-[2.1vw] font-semibold text-text">Act</p>
            <p className="mt-[1.5vh] font-body text-[1.4vw] leading-snug text-muted">Sanitize, cancel, or send safely — before anything leaves.</p>
          </div>
        </div>
        <div className="mt-[7vh] flex items-center gap-[1.2vw]">
          <span className="font-mono text-[1.3vw] text-muted">CSV</span>
          <span className="font-mono text-[1.3vw] text-primary">·</span>
          <span className="font-mono text-[1.3vw] text-muted">PDF</span>
          <span className="font-mono text-[1.3vw] text-primary">·</span>
          <span className="font-mono text-[1.3vw] text-muted">DOCX</span>
          <span className="font-mono text-[1.3vw] text-primary">·</span>
          <span className="font-mono text-[1.3vw] text-muted">Images / OCR</span>
          <span className="font-mono text-[1.3vw] text-primary">·</span>
          <span className="font-mono text-[1.3vw] text-muted">.zip / .tar / .gz</span>
        </div>
      </div>
    </div>
  );
}
