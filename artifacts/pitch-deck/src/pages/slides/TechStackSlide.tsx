export default function TechStackSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_60%,rgba(6,182,212,0.3),transparent_45%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Built With</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          Modern, production-ready stack
        </h2>
        <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[3vh] max-w-[75vw]">
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-blue-500/15 flex items-center justify-center shrink-0">
              <span className="font-display text-[1.2vw] font-bold text-blue-400">TS</span>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">TypeScript Monorepo</h4>
              <p className="font-body text-[1.2vw] text-muted">pnpm workspaces with end-to-end type safety across frontend, backend, and shared libraries</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-green-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-green-400">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">React + Vite</h4>
              <p className="font-body text-[1.2vw] text-muted">Fast frontend with React Query, Framer Motion, and Tailwind CSS dark-mode UI</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-yellow-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-yellow-400">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">Express 5 API</h4>
              <p className="font-body text-[1.2vw] text-muted">OpenAPI-first backend with Zod validation, session auth, and bcrypt security</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-purple-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-purple-400">
                <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">PostgreSQL + Drizzle</h4>
              <p className="font-body text-[1.2vw] text-muted">Type-safe ORM with migration support for datasets, versions, and audit logs</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-cyan-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-cyan-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">Auth + Payments</h4>
              <p className="font-body text-[1.2vw] text-muted">Session-based auth with Google/Apple OAuth, and Airwallex payment integration</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-red-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.4vw] h-[1.4vw] text-red-400">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-[1.5vw] font-bold text-text">PapaParse + Profiler</h4>
              <p className="font-body text-[1.2vw] text-muted">Lossless CSV parsing with column profiling, statistical analysis, and bias detection</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
