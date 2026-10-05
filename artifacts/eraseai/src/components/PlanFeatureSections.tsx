import { Check } from "lucide-react";
import type { PricingTier } from "@/lib/pricingPlans";

/** A plan's "For you" and "For your organization" lists, with "Coming soon" badges. */
export function PlanFeatureSections({
  tier,
  className = "",
  checkClassName = "text-primary",
}: {
  tier: PricingTier;
  className?: string;
  checkClassName?: string;
}) {
  const sections = [
    { title: "For you", items: tier.forYou },
    { title: "For your organization", items: tier.forOrg },
  ].filter((section) => section.items.length > 0);

  return (
    <div className={`space-y-5 ${className}`}>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/70">{section.title}</p>
          <ul className="space-y-2">
            {section.items.map((feature) => (
              <li key={feature.text} className="flex items-start gap-2 text-sm">
                <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkClassName}`} />
                <span className="text-foreground/90">
                  {feature.text}
                  {feature.soon && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Coming soon
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
