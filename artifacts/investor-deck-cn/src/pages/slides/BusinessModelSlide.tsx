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
          个人自己付费，组织为所有人付费
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
              Chrome 本机检查免费，无需账户；Android 试用。
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
              个人付费：一键清理、附件检查、Android 保护。
            </p>
          </div>
          <div className="flex flex-col justify-between bg-primary/10 border-2 border-accent rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-accent text-[1.6vw] font-bold mb-[1vh]">
                团队版
              </p>
              <p className="font-mono font-bold text-accent text-[3.2vw] leading-none mb-[2.5vh]">
                $9<span className="text-[1.6vw] text-muted">/人/月</span>
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              组织付费：3–10 人，公司规则、管理仪表板、审计。
            </p>
          </div>
          <div className="flex flex-col justify-between bg-panel/40 border border-line rounded-[0.8vw] p-[2vw]">
            <div>
              <p className="text-muted text-[1.6vw] font-medium mb-[1vh]">
                企业版
              </p>
              <p className="font-mono font-bold text-text text-[3.2vw] leading-none mb-[2.5vh]">
                联系我们
              </p>
            </div>
            <p className="text-muted text-[1.45vw] leading-relaxed">
              组织付费：集中部署、单点登录、SIEM、私有部署、SLA。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[3vh] mt-[3vh]">
          <p className="text-text text-[1.9vw] leading-snug">
            通过免费浏览器扩展<span className="text-accent">自下而上</span>
            普及；组织付费后，成员升级为团队版与企业版。开发者 API：$19/月。
          </p>
        </div>
      </div>
    </div>
  );
}
