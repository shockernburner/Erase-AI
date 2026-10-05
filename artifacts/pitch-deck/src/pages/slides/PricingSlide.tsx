// Must match the website plans (artifacts/eraseai/src/lib/pricingPlans.ts).
// Who pays decides the plan: Personal and Developer are paid by one person for
// themselves; when an organization pays (Team, Enterprise), its members get
// Enterprise-level protection.
const PLANS = [
  {
    name: "Free",
    price: "$0",
    unit: "",
    paidBy: "No payment",
    you: ["Chrome: every AI message checked on your device", "Android free trial"],
    org: [],
  },
  {
    name: "Personal",
    price: "$5",
    unit: "/mo · $54/yr",
    paidBy: "Paid by you",
    you: ["One-click Sanitize & Send", "Attachment & screenshot scanning", "Android protection"],
    org: ["Individuals only"],
    popular: true,
  },
  {
    name: "Developer",
    price: "$19",
    unit: "/mo",
    paidBy: "Paid by you",
    you: ["Everything in Personal", "API: 10,000 requests/mo"],
    org: ["Checks built into the organization's apps"],
  },
  {
    name: "Team",
    price: "$9",
    unit: "/person/mo · 3–10 people",
    paidBy: "Paid by the organization",
    you: ["Enterprise-level protection, no personal plan"],
    org: ["Company rules everyone follows", "Admin dashboard of what was caught", "Audit log, one invoice"],
  },
  {
    name: "Enterprise",
    price: "Contact us",
    unit: "for pricing",
    paidBy: "Paid by the organization",
    you: ["Everything in Team", "Company sign-in (SSO)"],
    org: ["Managed rollout to every device", "SIEM, custom rules, data residency", "Private deployment, DPA, SLA"],
  },
];

export default function PricingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.3),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-center px-[7vw] py-[7vh]">
        <p className="font-body text-[1.4vw] tracking-[0.2em] uppercase text-primary font-semibold mb-[2vh]">Pricing</p>
        <h2 className="font-display text-[3.8vw] leading-[1.05] font-bold tracking-tight text-text max-w-[70vw] mb-[1.5vh]">
          Individuals pay for themselves. Organizations pay for everyone.
        </h2>
        <p className="font-body text-[1.3vw] text-muted mb-[4vh] max-w-[70vw]">
          When an organization pays, its people get Enterprise-level protection; Team adds the control and proof that ten Personal plans can't.
        </p>
        <div className="flex gap-[1.2vw] max-w-[86vw]">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex-1 rounded-[0.8vw] p-[1.4vw] flex flex-col relative ${plan.popular ? "border-2 border-primary bg-primary/10" : "border border-primary/15 bg-primary/5"}`}
            >
              {plan.popular && (
                <div className="absolute top-[-1vh] right-[1vw] bg-primary text-bg px-[0.6vw] py-[0.3vh] rounded-[0.3vw] font-body text-[0.7vw] font-bold uppercase">Popular</div>
              )}
              <h4 className="font-display text-[1.4vw] font-bold text-text">{plan.name}</h4>
              <p className="font-display text-[2.1vw] font-bold text-primary mt-[0.5vh] leading-tight">{plan.price}</p>
              <p className="font-body text-[0.85vw] text-muted mt-[0.3vh]">{plan.unit || " "}</p>
              <p className="font-body text-[0.75vw] uppercase tracking-wide text-text/60 mt-[1vh] mb-[1.4vh] font-semibold">{plan.paidBy}</p>
              <div className="space-y-[0.6vh] flex-1">
                <p className="font-body text-[0.75vw] uppercase tracking-wide text-primary font-bold">For you</p>
                {plan.you.map((line) => (
                  <p key={line} className="font-body text-[0.9vw] text-text/75 leading-snug">{line}</p>
                ))}
                {plan.org.length > 0 && (
                  <>
                    <p className="font-body text-[0.75vw] uppercase tracking-wide text-primary font-bold pt-[1vh]">For the organization</p>
                    {plan.org.map((line) => (
                      <p key={line} className="font-body text-[0.9vw] text-text/75 leading-snug">{line}</p>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
