export default function DifferentiationSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -top-[20vh] right-[5vw] w-[40vw] h-[40vw] rounded-full bg-primary/8 blur-[70px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Differentiation</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">06 / 12</span>
        </div>
        <h2 className="mt-[5vh] max-w-[68vw] font-display text-[4.4vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Built for the layer legacy DLP misses
        </h2>
        <div className="mt-[6.5vh] grid grid-cols-2 gap-[3vw] max-w-[80vw]">
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-display text-[2vw] font-semibold text-primary">Prompt-native</p>
            <p className="mt-[1.2vh] font-body text-[1.5vw] leading-snug text-text/90">Sits at Send in the browser and on Android — not only on the network.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-display text-[2vw] font-semibold text-primary">Attachment-deep</p>
            <p className="mt-[1.2vh] font-body text-[1.5vw] leading-snug text-text/90">Text, files, OCR, and archives — not just the chat box string.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-display text-[2vw] font-semibold text-primary">Multi-LLM coverage</p>
            <p className="mt-[1.2vh] font-body text-[1.5vw] leading-snug text-text/90">ChatGPT, Claude, Gemini, and more — one control point for shadow AI.</p>
          </div>
          <div className="border-t border-white/10 pt-[2.5vh]">
            <p className="font-display text-[2vw] font-semibold text-primary">Land-and-expand</p>
            <p className="mt-[1.2vh] font-body text-[1.5vw] leading-snug text-text/90">User install first; Team policy and Enterprise audit follow.</p>
          </div>
        </div>
        <p className="mt-[6vh] max-w-[70vw] font-mono text-[1.25vw] leading-relaxed text-muted">
          Versus network DLP / CASB / “block ChatGPT” gateways — we govern use, not forbid it.
        </p>
      </div>
    </div>
  );
}
