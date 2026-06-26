export default function MarketSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute -top-[15vh] -right-[10vw] w-[45vw] h-[45vw] glow-cyan" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              市场
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">07 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[6vh] max-w-[68vw]">
          一个庞大且高速增长的安全市场
        </h2>

        <div className="grid grid-cols-[1.3fr_1fr] gap-[5vw] flex-1 items-center">
          <div>
            <div className="flex items-end gap-[2.5vw]">
              <div>
                <p className="font-mono text-muted text-[1.5vw] mb-[1vh]">
                  2024 年
                </p>
                <p className="font-mono font-bold text-text text-[5vw] leading-none">
                  $25.35B
                </p>
              </div>
              <span className="text-accent text-[3vw] font-bold pb-[1vh]">→</span>
              <div>
                <p className="font-mono text-muted text-[1.5vw] mb-[1vh]">
                  2030 年
                </p>
                <p className="font-mono font-bold text-accent text-[6.5vw] leading-none">
                  $93.75B
                </p>
              </div>
            </div>
            <p className="font-mono text-muted text-[1.4vw] mt-[3vh] tracking-wide">
              AI 安全市场 · 24.4% 年复合增长率 · Grand View Research
            </p>
          </div>

          <div className="flex flex-col gap-[4vh] border-l border-line pl-[4vw]">
            <div>
              <p className="font-mono font-bold text-accent text-[3.4vw] leading-none mb-[1.2vh]">
                24.4%
              </p>
              <p className="text-muted text-[1.5vw] leading-relaxed">
                至 2030 年 AI 安全市场的年复合增长率。
              </p>
            </div>
            <div>
              <p className="font-mono font-bold text-accent text-[3.4vw] leading-none mb-[1.2vh]">
                $9.33B
              </p>
              <p className="text-muted text-[1.5vw] leading-relaxed">
                至 2030 年数据防泄露（DLP）市场规模（Grand View Research）。
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-[3vh] mt-[2vh]">
          <p className="text-text text-[2vw] leading-snug">
            每一家采用 AI 的公司，都会成为
            <span className="text-accent">AI 数据治理的买家</span>。
          </p>
        </div>
      </div>
    </div>
  );
}
