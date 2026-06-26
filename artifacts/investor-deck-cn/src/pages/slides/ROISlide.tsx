export default function ROISlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[4vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              单位经济模型
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">09 / 12</span>
        </div>

        <div className="flex items-center gap-[1.5vw] mb-[5vh]">
          <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight">
            防患于未然的经济账
          </h2>
          <span className="font-mono text-muted text-[1.3vw] border border-line rounded-full px-[1.2vw] py-[0.6vh] whitespace-nowrap">
            示意 · 基于预测 · 尚未产生收入
          </span>
        </div>

        <div className="grid grid-cols-3 gap-[3vw] flex-1 content-center">
          <div className="flex flex-col">
            <p className="font-mono font-bold text-accent text-[5vw] leading-none mb-[2.5vh]">
              $4.88M
            </p>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              阻止一次泄露可避免的平均成本（IBM，2024）。
            </p>
          </div>
          <div className="flex flex-col border-l border-line pl-[3vw]">
            <p className="font-mono font-bold text-accent text-[5vw] leading-none mb-[2.5vh]">
              500
            </p>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              对一个 500 人组织而言，Pro 席位仅是该成本的极小部分。
            </p>
          </div>
          <div className="flex flex-col border-l border-line pl-[3vw]">
            <p className="font-mono font-bold text-accent text-[5vw] leading-none mb-[2.5vh]">
              数年
            </p>
            <p className="text-muted text-[1.6vw] leading-relaxed">
              即便保守估算，避免一次事故即可覆盖多年的部署费用。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[2.5vh] mt-[2vh]">
          <p className="text-muted text-[1.5vw] leading-snug">
            上述数字为示意性预测，并非历史业绩。
          </p>
        </div>
      </div>
    </div>
  );
}
