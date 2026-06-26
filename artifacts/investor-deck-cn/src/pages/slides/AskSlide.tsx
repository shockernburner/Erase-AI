export default function AskSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -bottom-[20vh] -right-[8vw] w-[50vw] h-[50vw] glow-cyan" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              融资需求
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">11 / 12</span>
        </div>

        <div className="grid grid-cols-[1fr_1.1fr] gap-[6vw] flex-1 items-center">
          <div>
            <p className="font-mono text-muted text-[1.8vw] tracking-[0.2em] mb-[1.5vh]">
              融资
            </p>
            <p className="font-mono font-bold text-accent text-[10vw] leading-none mb-[2vh]">
              $2.5M
            </p>
            <p className="text-text text-[3vw] font-bold">种子轮</p>
          </div>

          <div className="flex flex-col gap-[3.5vh] border-l border-line pl-[5vw]">
            <div>
              <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.2vh]">
                资金用途
              </p>
              <p className="text-text text-[1.9vw] leading-snug">
                工程研发（企业控制台 + 检测能力）、安全研究，以及市场拓展。
              </p>
            </div>
            <div>
              <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.2vh]">
                里程碑
              </p>
              <p className="text-text text-[1.9vw] leading-snug">
                将试点转化为付费企业客户，并在资金周期内实现早期 ARR。
              </p>
            </div>
            <div>
              <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.2vh]">
                示意回报
              </p>
              <p className="text-text text-[1.9vw] leading-snug">
                以种子轮切入一个以约 24% 年复合增长率迈向 900
                亿美元以上的赛道。
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-[2.5vh]">
          <p className="text-muted text-[1.5vw] leading-snug">
            回报情景仅为示意，不构成保证。
          </p>
        </div>
      </div>
    </div>
  );
}
