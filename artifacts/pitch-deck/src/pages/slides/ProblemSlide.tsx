const base = import.meta.env.BASE_URL;

export default function ProblemSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}problem-bg.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        alt="Data dissolving visualization"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/60" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">The Problem</p>
        <h2 className="font-display text-[4.5vw] leading-[1] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          AI models learn things they shouldn't
        </h2>
        <div className="grid grid-cols-3 gap-[2.5vw] max-w-[80vw]">
          <div className="border border-primary/20 rounded-[0.8vw] bg-primary/5 p-[2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-red-500/15 flex items-center justify-center mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.6vw] h-[1.6vw] text-red-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="font-display text-[1.6vw] font-bold text-text mb-[1vh]">Privacy Violations</h3>
            <p className="font-body text-[1.3vw] leading-relaxed text-muted">
              Models trained on personal data face GDPR "right to be forgotten" mandates with no easy compliance path.
            </p>
          </div>
          <div className="border border-primary/20 rounded-[0.8vw] bg-primary/5 p-[2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-orange-500/15 flex items-center justify-center mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.6vw] h-[1.6vw] text-orange-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="font-display text-[1.6vw] font-bold text-text mb-[1vh]">Hidden Bias</h3>
            <p className="font-body text-[1.3vw] leading-relaxed text-muted">
              Gender, racial, and proxy biases silently embedded in training data produce discriminatory AI outputs.
            </p>
          </div>
          <div className="border border-primary/20 rounded-[0.8vw] bg-primary/5 p-[2vw]">
            <div className="w-[3vw] h-[3vw] rounded-[0.5vw] bg-rose-500/15 flex items-center justify-center mb-[1.5vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.6vw] h-[1.6vw] text-rose-400">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-display text-[1.6vw] font-bold text-text mb-[1vh]">Toxic Content</h3>
            <p className="font-body text-[1.3vw] leading-relaxed text-muted">
              Harmful language and low-quality data degrade model safety with no auditing tools available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
