export default function TechStackSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_60%,rgba(6,182,212,0.3),transparent_45%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Trust & Compliance</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          Built for regulated industries
        </h2>
        <div className="flex gap-[3vw] max-w-[84vw]">
          <div className="flex-1">
            <h3 className="font-display text-[1.8vw] font-bold text-text mb-[3vh]">Compliance Roadmap</h3>
            <div className="grid grid-cols-2 gap-[1.5vw]">
              <div className="flex items-center gap-[0.8vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.2vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-primary">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-[1.2vw] font-bold text-text">SOC 2</p>
                  <p className="font-body text-[0.9vw] text-muted">Type II Audit</p>
                </div>
              </div>
              <div className="flex items-center gap-[0.8vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.2vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-primary">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-[1.2vw] font-bold text-text">ISO 27001</p>
                  <p className="font-body text-[0.9vw] text-muted">Info Security</p>
                </div>
              </div>
              <div className="flex items-center gap-[0.8vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.2vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-primary">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-[1.2vw] font-bold text-text">ISO 42001</p>
                  <p className="font-body text-[0.9vw] text-muted">AI Management</p>
                </div>
              </div>
              <div className="flex items-center gap-[0.8vw] bg-primary/5 border border-primary/20 rounded-[0.6vw] p-[1.2vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-primary">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-[1.2vw] font-bold text-text">GDPR</p>
                  <p className="font-body text-[0.9vw] text-muted">Data Protection</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-[1.8vw] font-bold text-text mb-[3vh]">Production Stack</h3>
            <div className="space-y-[1.5vh]">
              <div className="flex items-start gap-[1vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-blue-500/15 flex items-center justify-center shrink-0">
                  <span className="font-display text-[1vw] font-bold text-blue-400">TS</span>
                </div>
                <div>
                  <h4 className="font-display text-[1.3vw] font-bold text-text">TypeScript Monorepo</h4>
                  <p className="font-body text-[1vw] text-muted">pnpm workspaces, end-to-end type safety</p>
                </div>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-green-500/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-green-400">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[1.3vw] font-bold text-text">React + Vite + Express 5</h4>
                  <p className="font-body text-[1vw] text-muted">Fast frontend, OpenAPI backend, Zod validation</p>
                </div>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-purple-500/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-purple-400">
                    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[1.3vw] font-bold text-text">PostgreSQL + Drizzle ORM</h4>
                  <p className="font-body text-[1vw] text-muted">Migrations, audit logs, version control</p>
                </div>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.2vw] h-[1.2vw] text-cyan-400">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[1.3vw] font-bold text-text">Auth + Airwallex Payments</h4>
                  <p className="font-body text-[1vw] text-muted">OAuth (Google/Apple), i18n across 6 languages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
