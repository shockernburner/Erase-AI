import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Book, Code2, Shield, Award, ListChecks, ExternalLink } from "lucide-react";
import type { AppView } from "@/components/AppShell";

interface Card {
  id: AppView;
  icon: React.ReactNode;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  color: string;
}

export default function DocumentationsHub({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();

  const cards: Card[] = [
    {
      id: "docs",
      icon: <Book className="w-5 h-5" />,
      titleKey: "nav.apiDocs",
      defaultTitle: "API Documentation",
      descKey: "docsHub.apiDesc",
      defaultDesc: "Endpoints, request shapes, auth, and code samples for the EraseAI API.",
      color: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    },
    {
      id: "firewallDocs",
      icon: <Shield className="w-5 h-5" />,
      titleKey: "nav.firewallDocs",
      defaultTitle: "Firewall reference",
      descKey: "docsHub.firewallDesc",
      defaultDesc: "Browser extension manifest, install steps, and compatibility matrix.",
      color: "text-red-400 border-red-500/30 bg-red-500/5",
    },
    {
      id: "devMode",
      icon: <Code2 className="w-5 h-5" />,
      titleKey: "nav.devMode",
      defaultTitle: "Dev Mode playground",
      descKey: "docsHub.devModeDesc",
      defaultDesc: "Try the analyze + sanitize endpoints live with sample payloads.",
      color: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    },
    {
      id: "certifications",
      icon: <Award className="w-5 h-5" />,
      titleKey: "nav.certifications",
      defaultTitle: "Certifications",
      descKey: "docsHub.certsDesc",
      defaultDesc: "SOC 2, ISO 27001 and GDPR posture statements.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    },
    {
      id: "publishingChecklist",
      icon: <ListChecks className="w-5 h-5" />,
      titleKey: "docsHub.publishingTitle",
      defaultTitle: "Publishing checklist",
      descKey: "docsHub.publishingDesc",
      defaultDesc: "Pre-flight steps before shipping the extension to the Chrome Web Store.",
      color: "text-violet-400 border-violet-500/30 bg-violet-500/5",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16">
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-500/15 text-blue-400 p-2.5 rounded-xl border border-blue-500/30">
            <Book className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("docsHub.title", { defaultValue: "Documentation" })}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t("docsHub.subtitle", { defaultValue: "Everything you need to integrate, install, and verify EraseAI in production." })}
        </p>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onNavigate(c.id)}
            className={`text-left rounded-2xl border ${c.color} backdrop-blur-sm p-5 hover:scale-[1.01] transition-all`}
          >
            <div className="flex items-center gap-2 mb-2">
              {c.icon}
              <h3 className="font-bold text-foreground">{t(c.titleKey, { defaultValue: c.defaultTitle })}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t(c.descKey, { defaultValue: c.defaultDesc })}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs opacity-80">
              {t("home.openSection")} <ExternalLink className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
