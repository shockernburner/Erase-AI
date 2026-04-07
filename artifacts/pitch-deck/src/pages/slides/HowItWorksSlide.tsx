export default function HowItWorksSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_50%_80%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Developer Tools & Dataset Sanitizer</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          Integrate governance into your pipeline
        </h2>
        <div className="flex gap-[3vw] max-w-[84vw]">
          <div className="flex-[1.3] flex flex-col gap-[2vh]">
            <div className="rounded-[0.8vw] border border-purple-500/20 bg-black/30 p-[2vw] font-body">
              <div className="flex items-center gap-[0.6vw] mb-[1.5vh]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-purple-400">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                <span className="text-[1vw] text-purple-400 uppercase tracking-wider font-semibold">eraseai-sdk</span>
              </div>
              <div className="space-y-[0.8vh] text-[1.1vw]">
                <p className="text-purple-400">import <span className="text-text/70">{"{ EraseClient }"}</span> from <span className="text-green-400">'@eraseai/sdk'</span>;</p>
                <p className="text-purple-400">const <span className="text-text/90">client</span> = new <span className="text-primary">EraseClient</span>(API_KEY);</p>
                <p className="text-text/40">// Scan content for risks</p>
                <p className="text-purple-400">const <span className="text-text/90">report</span> = await client.<span className="text-primary">analyze</span>(content);</p>
                <p className="text-text/40">// Sanitize datasets at scale</p>
                <p className="text-purple-400">const <span className="text-text/90">clean</span> = await client.<span className="text-primary">sanitize</span>(dataset);</p>
              </div>
            </div>
            <div className="rounded-[0.8vw] border border-primary/20 bg-primary/5 p-[1.5vw]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-[1.3vw] font-bold text-text">Dataset Sanitization</p>
                  <p className="font-body text-[1vw] text-muted">Processing 10,000 rows</p>
                </div>
                <span className="font-display text-[2vw] font-bold text-green-400">87%</span>
              </div>
              <div className="mt-[1vh] h-[0.4vw] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-primary" style={{ width: '87%' }} />
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-[1.5vh]">
            <div className="flex items-center gap-[1vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.5vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-purple-500/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-purple-400">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <div>
                <h4 className="font-display text-[1.3vw] font-bold text-text">API Keys & Tokens</h4>
                <p className="font-body text-[0.9vw] text-muted">Secure key management with role-based access</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.5vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-primary/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-primary">
                  <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div>
                <h4 className="font-display text-[1.3vw] font-bold text-text">Batch Processing</h4>
                <p className="font-body text-[0.9vw] text-muted">CSV, JSON, TXT — up to 250K rows per dataset</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.5vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-green-500/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-green-400">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <h4 className="font-display text-[1.3vw] font-bold text-text">Webhooks</h4>
                <p className="font-body text-[0.9vw] text-muted">Real-time event notifications for your pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.5vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-orange-500/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-orange-400">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" /><path d="M12 8v8" /><path d="M8 16a4 4 0 0 0 8 0" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div>
                <h4 className="font-display text-[1.3vw] font-bold text-text">ML Pipeline Feedback</h4>
                <p className="font-body text-[0.9vw] text-muted">Actionable recommendations with code snippets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
