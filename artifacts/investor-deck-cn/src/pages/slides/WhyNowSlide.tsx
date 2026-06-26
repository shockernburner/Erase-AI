export default function WhyNowSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute -bottom-[20vh] -left-[8vw] w-[40vw] h-[40vw] glow-cyan" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              为何此刻
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">03 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[6vh] max-w-[72vw]">
          2025–2026，三股力量正在汇聚
        </h2>

        <div className="grid grid-cols-3 gap-[3vw] flex-1">
          <div className="flex flex-col">
            <span className="font-mono text-accent text-[2.4vw] font-bold mb-[2vh]">
              01
            </span>
            <h3 className="text-text text-[2.4vw] font-bold leading-snug mb-[1.8vh]">
              生成式 AI 全面普及
            </h3>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              已嵌入每一个知识工作团队与工作流。
            </p>
          </div>
          <div className="flex flex-col border-l border-line pl-[3vw]">
            <span className="font-mono text-accent text-[2.4vw] font-bold mb-[2vh]">
              02
            </span>
            <h3 className="text-text text-[2.4vw] font-bold leading-snug mb-[1.8vh]">
              监管日益收紧
            </h3>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              欧盟《AI 法案》通用 AI 义务自 2025 年 8 月生效；GDPR
              处罚力度不变。
            </p>
          </div>
          <div className="flex flex-col border-l border-line pl-[3vw]">
            <span className="font-mono text-accent text-[2.4vw] font-bold mb-[2vh]">
              03
            </span>
            <h3 className="text-text text-[2.4vw] font-bold leading-snug mb-[1.8vh]">
              数据泄露成本攀升
            </h3>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              全球单次泄露平均成本已达 488 万美元——IBM，2024 年，同比上升 10%。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[3vh] mt-[2vh]">
          <p className="text-text text-[2vw] leading-snug">
            浏览器与提示层，是传统工具
            <span className="text-accent">从未设防的缺口</span>。
          </p>
        </div>
      </div>
    </div>
  );
}
