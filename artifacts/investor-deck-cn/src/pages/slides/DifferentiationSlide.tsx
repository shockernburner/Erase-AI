export default function DifferentiationSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              差异化优势
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">06 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[5vh] max-w-[70vw]">
          专为传统工具遗漏的那一层而生
        </h2>

        <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[3.5vh] flex-1 content-start">
          <div className="bg-panel/50 border border-line rounded-[0.8vw] p-[2.5vw]">
            <p className="text-accent text-[2vw] font-bold mb-[1.2vh]">
              浏览器原生
            </p>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              无需网络代理、无需改动模型、无需终端 agent。
            </p>
          </div>
          <div className="bg-panel/50 border border-line rounded-[0.8vw] p-[2.5vw]">
            <p className="text-accent text-[2vw] font-bold mb-[1.2vh]">
              深入附件
            </p>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              图像 OCR 与递归压缩包扫描，不止是纯文本。
            </p>
          </div>
          <div className="bg-panel/50 border border-line rounded-[0.8vw] p-[2.5vw]">
            <p className="text-accent text-[2vw] font-bold mb-[1.2vh]">
              隐私优先设计
            </p>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              检测在设备端运行，检查过程本身从不暴露数据。
            </p>
          </div>
          <div className="bg-panel/50 border border-line rounded-[0.8vw] p-[2.5vw]">
            <p className="text-accent text-[2vw] font-bold mb-[1.2vh]">
              覆盖多个大模型
            </p>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              一次安装即覆盖 ChatGPT、Claude、Gemini 与 Replit。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[2.5vh] mt-[3vh]">
          <p className="text-muted text-[1.5vw] leading-snug">
            对比那些部署在网络层、而非提示层的传统 DLP / CASB / 仅面向企业的 AI
            网关。
          </p>
        </div>
      </div>
    </div>
  );
}
