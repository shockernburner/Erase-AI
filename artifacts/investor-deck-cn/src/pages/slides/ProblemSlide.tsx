export default function ProblemSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[5vh]">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[3vw] h-[0.35vh] bg-accent" />
            <span className="font-mono text-accent text-[1.4vw] tracking-[0.3em] uppercase">
              问题
            </span>
          </div>
          <span className="font-mono text-muted text-[1.4vw]">02 / 12</span>
        </div>

        <h2 className="font-display font-bold text-text text-[4.4vw] leading-tight mb-[5vh] max-w-[70vw]">
          每一次提问，敏感数据都在外流
        </h2>

        <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[4vh]">
          <div className="border-t border-line pt-[2.5vh]">
            <p className="text-text text-[2vw] font-medium leading-snug mb-[1.2vh]">
              员工每天把源代码、客户记录和密钥粘贴进 AI 聊天工具。
            </p>
            <p className="text-muted text-[1.4vw] leading-relaxed">
              Cyberhaven：粘贴进 ChatGPT 的数据中，有相当一部分属于机密信息。
            </p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="text-text text-[2vw] font-medium leading-snug mb-[1.2vh]">
              影子 AI 发生在浏览器内部，IT 无法监管。
            </p>
            <p className="text-muted text-[1.4vw] leading-relaxed">
              没有任何代理或终端 agent 能看到提示层。
            </p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="text-text text-[2vw] font-medium leading-snug mb-[1.2vh]">
              数据一旦发出便无法收回——可能被记录、留存，或用于训练。
            </p>
            <p className="text-muted text-[1.4vw] leading-relaxed">泄露不可逆。</p>
          </div>
          <div className="border-t border-line pt-[2.5vh]">
            <p className="text-text text-[2vw] font-medium leading-snug mb-[1.2vh]">
              传统 DLP 与网络代理从看不到 LLM 提示层。
            </p>
            <p className="text-muted text-[1.4vw] leading-relaxed">
              它们为文件和邮件而生，而非生成式 AI。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
