export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute -top-[20vh] -right-[10vw] w-[55vw] h-[55vw] glow-cyan" />
      <div className="absolute top-0 left-0 w-[0.5vw] h-full bg-primary" />

      <div className="relative h-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-[0.5vw] bg-primary flex items-center justify-center">
              <div className="w-[1.2vw] h-[1.2vw] rounded-[0.2vw] border-[0.25vw] border-bg" />
            </div>
            <span className="font-mono text-text text-[2vw] font-bold tracking-tight">
              EraseAI
            </span>
          </div>
          <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
            种子轮 · 2026
          </span>
        </div>

        <div className="max-w-[78vw]">
          <div className="flex items-center gap-[1.2vw] mb-[3vh]">
            <div className="w-[5vw] h-[0.3vh] bg-accent" />
            <span className="font-mono text-muted text-[1.5vw] tracking-[0.2em]">
              企业 AI 数据治理
            </span>
          </div>
          <h1 className="font-display font-black text-text text-[7vw] leading-[1.05] tracking-tight">
            面向企业数据的
            <span className="block text-accent">AI 防火墙</span>
          </h1>
          <p
            className="mt-[4vh] text-muted text-[2.1vw] leading-relaxed max-w-[62vw]"
            style={{ textWrap: "pretty" }}
          >
            在机密数据离开浏览器、抵达 ChatGPT、Claude、Gemini 或 Replit
            之前，就将其拦截。
          </p>
        </div>

        <div className="flex items-center gap-[2vw] font-mono text-muted text-[1.5vw]">
          <span className="text-accent">eraseai.ai</span>
          <span className="text-line">·</span>
          <span>Vantward Solutions</span>
          <span className="text-line">·</span>
          <span>新加坡</span>
        </div>
      </div>
    </div>
  );
}
