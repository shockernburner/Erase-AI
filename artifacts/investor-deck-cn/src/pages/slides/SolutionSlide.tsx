const base = import.meta.env.BASE_URL;

export default function SolutionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full grid grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col px-[6vw] py-[7vh]">
          <div className="flex items-center justify-between mb-[5vh] pr-[2vw]">
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[3vw] h-[0.35vh] bg-accent" />
              <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
                解决方案
              </span>
            </div>
            <span className="font-mono text-muted text-[1.4vw]">04 / 12</span>
          </div>

          <h2 className="font-display font-bold text-text text-[3.9vw] leading-tight mb-[5vh] max-w-[40vw]">
            面向 AI 提示的实时防火墙
          </h2>

          <div className="grid grid-cols-2 gap-x-[2.5vw] gap-y-[3.5vh]">
            <div>
              <p className="text-accent text-[1.9vw] font-bold mb-[1vh]">
                浏览器原生
              </p>
              <p className="text-muted text-[1.45vw] leading-relaxed">
                在 ChatGPT、Claude、Gemini 与 Replit 上实时拦截提示与附件。
              </p>
            </div>
            <div>
              <p className="text-accent text-[1.9vw] font-bold mb-[1vh]">
                设备端检测
              </p>
              <p className="text-muted text-[1.45vw] leading-relaxed">
                在数据离开浏览器之前，识别个人信息、密钥与敏感内容。
              </p>
            </div>
            <div>
              <p className="text-accent text-[1.9vw] font-bold mb-[1vh]">
                逐项判定
              </p>
              <p className="text-muted text-[1.45vw] leading-relaxed">
                每一段内容都被标记为 安全、注意 或 危险。
              </p>
            </div>
            <div>
              <p className="text-accent text-[1.9vw] font-bold mb-[1vh]">
                一键处置
              </p>
              <p className="text-muted text-[1.45vw] leading-relaxed">
                脱敏、取消，或仍然发送——决定权始终在用户手中。
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-panel/40 border-l border-line p-[3vw]">
          <div className="absolute inset-0 glow-cyan opacity-50" />
          <div className="relative w-full rounded-[1vw] overflow-hidden border border-line shadow-2xl">
            <img
              src={`${base}eraseai-site.png`}
              crossOrigin="anonymous"
              alt="EraseAI 官网 eraseai.ai"
              className="w-full h-auto block"
            />
          </div>
          <span className="absolute bottom-[3vh] right-[3vw] font-mono text-accent text-[1.3vw]">
            eraseai.ai
          </span>
        </div>
      </div>
    </div>
  );
}
