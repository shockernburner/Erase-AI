export default function EnterpriseDeploymentSlide() {
  const rows: { component: string; live: string; enterprise: string }[] = [
    { component: "Browser extension", live: "Live", enterprise: "Chrome Enterprise push" },
    { component: "Android firewall", live: "Play internal", enterprise: "MDM deploy" },
    { component: "Team / shared policy", live: "Seed build", enterprise: "Full admin console" },
    { component: "Policy server (on-prem)", live: "—", enterprise: "Customer infra" },
    { component: "Network backstop", live: "—", enterprise: "Egress / DNS rules" },
    { component: "SSO + SIEM audit", live: "—", enterprise: "Enterprise tier" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute -bottom-[15vh] left-[5vw] w-[40vw] h-[40vw] rounded-full bg-primary/8 blur-[70px]" />
      <div className="relative flex h-full flex-col px-[7vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1vw] uppercase tracking-[0.35em] text-primary">Enterprise</span>
          </div>
          <span className="font-mono text-[1vw] text-muted">11 / 13</span>
        </div>
        <h2 className="mt-[4vh] max-w-[72vw] font-display text-[3.8vw] leading-[1.02] font-bold tracking-tight text-text" style={{ textWrap: "balance" }}>
          Endpoint first. Network backstop. Policy on their servers.
        </h2>
        <div className="mt-[4vh] grid grid-cols-[1fr_1.15fr] gap-[3.5vw] max-w-[88vw]">
          <div>
            <p className="font-mono text-[0.95vw] uppercase tracking-[0.2em] text-primary mb-[2vh]">Three layers</p>
            <div className="flex flex-col gap-[2vh]">
              <div className="border-l-2 border-primary/60 pl-[1.2vw]">
                <p className="font-display text-[1.45vw] font-semibold text-text">1 · Endpoint (primary)</p>
                <p className="mt-[0.6vh] font-body text-[1.15vw] leading-snug text-muted">Extension / agent inspects prompt before Send — MDM + SSO.</p>
              </div>
              <div className="border-l-2 border-primary/40 pl-[1.2vw]">
                <p className="font-display text-[1.45vw] font-semibold text-text">2 · Network (backstop)</p>
                <p className="mt-[0.6vh] font-body text-[1.15vw] leading-snug text-muted">Corp WiFi / egress blocks AI unless governed — catches bypass.</p>
              </div>
              <div className="border-l-2 border-primary/40 pl-[1.2vw]">
                <p className="font-display text-[1.45vw] font-semibold text-text">3 · Policy server</p>
                <p className="mt-[0.6vh] font-body text-[1.15vw] leading-snug text-muted">Rules, audit, dashboard on customer on-prem or VPC.</p>
              </div>
            </div>
            <p className="mt-[3vh] font-mono text-[1.05vw] leading-relaxed text-muted max-w-[36vw]">
              HTTPS hides prompts from routers alone — we read at Send, not only at the firewall.
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.95vw] uppercase tracking-[0.2em] text-primary mb-[1.5vh]">Live today vs Enterprise</p>
            <div className="rounded-[0.8vw] border border-white/10 overflow-hidden">
              <div className="grid grid-cols-[1.1fr_0.55fr_0.85fr] bg-white/[0.04] border-b border-white/10 px-[1.2vw] py-[1vh]">
                <span className="font-mono text-[0.85vw] uppercase text-muted">Component</span>
                <span className="font-mono text-[0.85vw] uppercase text-muted">Today</span>
                <span className="font-mono text-[0.85vw] uppercase text-primary">Enterprise</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.component}
                  className="grid grid-cols-[1.1fr_0.55fr_0.85fr] border-b border-white/5 px-[1.2vw] py-[0.9vh] last:border-b-0"
                >
                  <span className="font-body text-[1.05vw] text-text/90">{row.component}</span>
                  <span className="font-mono text-[0.95vw] text-muted">{row.live}</span>
                  <span className="font-body text-[1.05vw] text-text/90">{row.enterprise}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-auto max-w-[80vw] font-body text-[1.35vw] leading-snug text-text/90">
          Pilot today: managed browsers + extension. Seed builds Team console and first design-partner deployments.
        </p>
      </div>
    </div>
  );
}
