export default function PricingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Pricing</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[55vw] mb-[5vh]">
          From individuals to enterprise
        </h2>
        <div className="flex gap-[1.2vw] max-w-[86vw]">
          <div className="flex-1 rounded-[0.8vw] border border-primary/15 bg-primary/5 p-[1.5vw] flex flex-col">
            <h4 className="font-display text-[1.4vw] font-bold text-text">Free</h4>
            <p className="font-display text-[2.2vw] font-bold text-primary mt-[0.5vh]">$0</p>
            <p className="font-body text-[0.9vw] text-muted mt-[0.5vh] mb-[1.5vh]">per month</p>
            <div className="space-y-[0.8vh] flex-1">
              <p className="font-body text-[0.95vw] text-text/70">10 scans/day</p>
              <p className="font-body text-[0.95vw] text-text/70">Basic risk detection</p>
              <p className="font-body text-[0.95vw] text-text/70">1,000 row datasets</p>
            </div>
          </div>
          <div className="flex-1 rounded-[0.8vw] border-2 border-primary bg-primary/10 p-[1.5vw] flex flex-col relative">
            <div className="absolute top-[-1vh] right-[1vw] bg-primary text-bg px-[0.6vw] py-[0.3vh] rounded-[0.3vw] font-body text-[0.7vw] font-bold uppercase">Popular</div>
            <h4 className="font-display text-[1.4vw] font-bold text-text">Personal</h4>
            <p className="font-display text-[2.2vw] font-bold text-primary mt-[0.5vh]">$5</p>
            <p className="font-body text-[0.9vw] text-muted mt-[0.5vh] mb-[1.5vh]">per month</p>
            <div className="space-y-[0.8vh] flex-1">
              <p className="font-body text-[0.95vw] text-text/70">Unlimited scans</p>
              <p className="font-body text-[0.95vw] text-text/70">AI Firewall</p>
              <p className="font-body text-[0.95vw] text-text/70">AI Rewriting</p>
              <p className="font-body text-[0.95vw] text-text/70">Trend monitoring</p>
            </div>
          </div>
          <div className="flex-1 rounded-[0.8vw] border border-primary/15 bg-primary/5 p-[1.5vw] flex flex-col">
            <h4 className="font-display text-[1.4vw] font-bold text-text">Pro</h4>
            <p className="font-display text-[2.2vw] font-bold text-primary mt-[0.5vh]">$49</p>
            <p className="font-body text-[0.9vw] text-muted mt-[0.5vh] mb-[1.5vh]">per month</p>
            <div className="space-y-[0.8vh] flex-1">
              <p className="font-body text-[0.95vw] text-text/70">50K row datasets</p>
              <p className="font-body text-[0.95vw] text-text/70">5 API keys</p>
              <p className="font-body text-[0.95vw] text-text/70">Developer Mode</p>
              <p className="font-body text-[0.95vw] text-text/70">Priority support</p>
            </div>
          </div>
          <div className="flex-1 rounded-[0.8vw] border border-primary/15 bg-primary/5 p-[1.5vw] flex flex-col">
            <h4 className="font-display text-[1.4vw] font-bold text-text">Business</h4>
            <p className="font-display text-[2.2vw] font-bold text-primary mt-[0.5vh]">$149</p>
            <p className="font-body text-[0.9vw] text-muted mt-[0.5vh] mb-[1.5vh]">per month</p>
            <div className="space-y-[0.8vh] flex-1">
              <p className="font-body text-[0.95vw] text-text/70">250K row datasets</p>
              <p className="font-body text-[0.95vw] text-text/70">20 API keys</p>
              <p className="font-body text-[0.95vw] text-text/70">Analytics dashboard</p>
              <p className="font-body text-[0.95vw] text-text/70">Webhooks</p>
            </div>
          </div>
          <div className="flex-1 rounded-[0.8vw] border border-primary/15 bg-primary/5 p-[1.5vw] flex flex-col">
            <h4 className="font-display text-[1.4vw] font-bold text-text">Enterprise</h4>
            <p className="font-display text-[2.2vw] font-bold text-primary mt-[0.5vh]">Custom</p>
            <p className="font-body text-[0.9vw] text-muted mt-[0.5vh] mb-[1.5vh]">contact us</p>
            <div className="space-y-[0.8vh] flex-1">
              <p className="font-body text-[0.95vw] text-text/70">Unlimited everything</p>
              <p className="font-body text-[0.95vw] text-text/70">SSO integration</p>
              <p className="font-body text-[0.95vw] text-text/70">Custom SLA</p>
              <p className="font-body text-[0.95vw] text-text/70">Dedicated support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
