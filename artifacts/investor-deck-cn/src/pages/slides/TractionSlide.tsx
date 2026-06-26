export default function TractionSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              进展
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">10 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[6vh] max-w-[74vw]">
          可用的产品、试点，以及通往收入的路径
        </h2>

        <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[4vh] flex-1 content-start">
          <div className="border-t border-line pt-[2.5vh]">
            <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.5vh]">
              当前状态
            </p>
            <p className="text-text text-[2vw] leading-snug">
              尚未产生收入，但已有可用产品与进行中的试点。
            </p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.5vh]">
              增长路径
            </p>
            <p className="text-text text-[2vw] leading-snug">
              免费扩展 → 付费个人 → 团队 → 企业。
            </p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.5vh]">
              产品路线图
            </p>
            <p className="text-text text-[2vw] leading-snug">
              企业管理控制台、SIEM / 日志集成、扩展模型覆盖、自定义策略。
            </p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="font-mono text-accent text-[1.4vw] tracking-[0.2em] uppercase mb-[1.5vh]">
              分发方式
            </p>
            <p className="text-text text-[2vw] leading-snug">
              由开发者与安全团队主导的普及。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
