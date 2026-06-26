export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] glow-cyan" />
      <div className="absolute top-0 left-0 w-[0.5vw] h-full bg-primary" />

      <div className="relative h-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.6vw] h-[2.6vw] rounded-[0.5vw] bg-primary flex items-center justify-center">
            <div className="w-[1.2vw] h-[1.2vw] rounded-[0.2vw] border-[0.25vw] border-bg" />
          </div>
          <span className="font-mono text-text text-[2vw] font-bold tracking-tight">
            EraseAI
          </span>
        </div>

        <div className="max-w-[80vw]">
          <h1 className="font-display font-black text-text text-[6.5vw] leading-[1.08] tracking-tight">
            让你的数据
            <span className="block text-accent">远离公共 AI 大模型</span>
          </h1>
          <p className="mt-[4vh] text-muted text-[2.2vw] leading-relaxed">
            让企业数据不进入公共模型。
          </p>
        </div>

        <div className="flex items-center gap-[2vw] font-mono text-muted text-[1.5vw] flex-wrap">
          <span>Vantward Solutions</span>
          <span className="text-line">·</span>
          <span>新加坡</span>
          <span className="text-line">·</span>
          <span className="text-accent">eraseai.ai</span>
          <span className="text-line">·</span>
          <span className="text-accent">director@vantward.com</span>
        </div>
      </div>
    </div>
  );
}
