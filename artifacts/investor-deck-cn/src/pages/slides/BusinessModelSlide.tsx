export default function BusinessModelSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              商业模式
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">08 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[6vh] max-w-[68vw]">
          从个人切入，向企业扩张
        </h2>

        <div className="grid grid-cols-4 gap-[2vw] flex-1 items-stretch">
          <div className="flex flex-col justify-between bg-panel/40 border border-line rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-muted text-[1.6vw] font-medium mb-[1vh]">
                免费版
              </p>
              <p className="font-mono font-bold text-text text-[3.2vw] leading-none mb-[2.5vh]">
                $0
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              面向每位用户的核心防火墙。
            </p>
          </div>
          <div className="flex flex-col justify-between bg-panel/40 border border-line rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-muted text-[1.6vw] font-medium mb-[1vh]">
                个人版
              </p>
              <p className="font-mono font-bold text-text text-[3.2vw] leading-none mb-[2.5vh]">
                $5<span className="text-[1.6vw] text-muted">/月</span>
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              单用户的完整保护。
            </p>
          </div>
          <div className="flex flex-col justify-between bg-primary/10 border-2 border-accent rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-accent text-[1.6vw] font-bold mb-[1vh]">
                专业版
              </p>
              <p className="font-mono font-bold text-accent text-[3.2vw] leading-none mb-[2.5vh]">
                $20<span className="text-[1.6vw] text-muted">/月</span>
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              高级检测与策略。
            </p>
          </div>
          <div className="flex flex-col justify-between bg-panel/40 border border-line rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-muted text-[1.6vw] font-medium mb-[1vh]">
                企业版
              </p>
              <p className="font-mono font-bold text-text text-[3.2vw] leading-none mb-[2.5vh]">
                定制
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              SAML 单点登录、审计日志、管理控制台。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[3vh] mt-[3vh]">
          <p className="text-text text-[1.9vw] leading-snug">
            通过浏览器扩展<span className="text-accent">自下而上</span>
            普及，转化为团队与企业席位。
          </p>
        </div>
      </div>
    </div>
  );
}
