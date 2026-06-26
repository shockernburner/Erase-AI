export default function HowItWorksSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              工作原理
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">05 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[6vh]">
          从敲下键盘到安全发送
        </h2>

        <div className="grid grid-cols-4 gap-[2vw] flex-1">
          <div className="flex flex-col">
            <span className="font-mono text-accent text-[2vw] font-bold mb-[1.5vh]">
              01
            </span>
            <div className="w-full h-[0.35vh] bg-line mb-[2.5vh] relative">
              <div className="absolute left-0 top-0 h-full w-1/4 bg-accent" />
            </div>
            <h3 className="text-text text-[2.2vw] font-bold mb-[1.5vh]">拦截</h3>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              在输入或上传的瞬间捕获提示文本与附件。
            </p>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-accent text-[2vw] font-bold mb-[1.5vh]">
              02
            </span>
            <div className="w-full h-[0.35vh] bg-line mb-[2.5vh] relative">
              <div className="absolute left-0 top-0 h-full w-2/4 bg-accent" />
            </div>
            <h3 className="text-text text-[2.2vw] font-bold mb-[1.5vh]">检查</h3>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              在设备端检测文本、文件、图像（OCR）与压缩包。
            </p>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-accent text-[2vw] font-bold mb-[1.5vh]">
              03
            </span>
            <div className="w-full h-[0.35vh] bg-line mb-[2.5vh] relative">
              <div className="absolute left-0 top-0 h-full w-3/4 bg-accent" />
            </div>
            <h3 className="text-text text-[2.2vw] font-bold mb-[1.5vh]">判定</h3>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              每一项内容标记为安全、注意或危险，并给出明确理由。
            </p>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-accent text-[2vw] font-bold mb-[1.5vh]">
              04
            </span>
            <div className="w-full h-[0.35vh] bg-line mb-[2.5vh] relative">
              <div className="absolute left-0 top-0 h-full w-full bg-accent" />
            </div>
            <h3 className="text-text text-[2.2vw] font-bold mb-[1.5vh]">处置</h3>
            <p className="text-muted text-[1.5vw] leading-relaxed">
              在任何内容外流之前，脱敏、取消或安全发送。
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-[3vh] mt-[3vh] flex items-center gap-[1.5vw]">
          <span className="font-mono text-muted text-[1.4vw] tracking-wide">
            支持格式
          </span>
          <span className="font-mono text-text text-[1.5vw]">
            CSV · PDF · DOCX · 图像 / OCR · .zip / .tar / .gz
          </span>
        </div>
      </div>
    </div>
  );
}
