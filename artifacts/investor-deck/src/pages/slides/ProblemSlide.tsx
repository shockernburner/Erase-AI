export default function ProblemSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -top-[20vh] -right-[10vw] w-[45vw] h-[45vw] rounded-full bg-primary/10 blur-[60px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">The Problem</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">02 / 13</span>
        </div>
        <h2 className="mt-[5vh] max-w-[60vw] font-display text-[4.6vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Sensitive data leaves with every prompt
        </h2>
        <div className="mt-[7vh] grid grid-cols-2 gap-x-[4vw] gap-y-[5vh] max-w-[78vw]">
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-body text-[1.7vw] leading-snug text-text">Employees paste source code, customer records and secrets into AI chatbots daily.</p>
            <p className="mt-[1.5vh] font-mono text-[1vw] text-muted">Cyberhaven: a meaningful share of data pasted into ChatGPT is confidential.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-body text-[1.7vw] leading-snug text-text">Shadow AI happens inside the browser, outside IT visibility.</p>
            <p className="mt-[1.5vh] font-mono text-[1vw] text-muted">No proxy or endpoint agent sees the prompt layer.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-body text-[1.7vw] leading-snug text-text">Once sent, the data is gone — it can be logged, retained, or used for training.</p>
            <p className="mt-[1.5vh] font-mono text-[1vw] text-muted">Disclosure is irreversible.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-body text-[1.7vw] leading-snug text-text">Legacy DLP and network proxies never see the LLM prompt layer.</p>
            <p className="mt-[1.5vh] font-mono text-[1vw] text-muted">Built for files and email, not generative AI.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
