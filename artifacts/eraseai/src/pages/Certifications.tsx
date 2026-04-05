import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Lock,
  Award,
  FileCheck,
  ExternalLink,
  ShieldCheck,
  Brain,
  Scale,
  Globe2,
  Fingerprint,
  Server,
  Cloud,
  Eye,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";

type CertStatus = "planned" | "in_progress";

interface Certification {
  nameKey: string;
  issuerKey: string;
  descKey: string;
  learnMoreUrl: string;
  icon: React.ReactNode;
  status: CertStatus;
  targetKey: string;
}

interface CertCategory {
  titleKey: string;
  color: string;
  borderColor: string;
  iconBg: string;
  certs: Certification[];
}

const statusConfig: Record<CertStatus, { colorClass: string; icon: React.ReactNode }> = {
  planned: {
    colorClass: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    icon: <Clock className="w-3 h-3" />,
  },
  in_progress: {
    colorClass: "text-sky-400 bg-sky-500/15 border-sky-500/30",
    icon: <Target className="w-3 h-3" />,
  },
};

const categories: CertCategory[] = [
  {
    titleKey: "certifications.categories.cybersecurity",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    iconBg: "bg-cyan-500/20",
    certs: [
      {
        nameKey: "certifications.certs.soc2.name",
        issuerKey: "certifications.certs.soc2.issuer",
        descKey: "certifications.certs.soc2.desc",
        learnMoreUrl: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2",
        icon: <ShieldCheck className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.soc2",
      },
      {
        nameKey: "certifications.certs.csaStar.name",
        issuerKey: "certifications.certs.csaStar.issuer",
        descKey: "certifications.certs.csaStar.desc",
        learnMoreUrl: "https://cloudsecurityalliance.org/star/registry",
        icon: <Cloud className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.csaStar",
      },
    ],
  },
  {
    titleKey: "certifications.categories.aiSecurity",
    color: "text-violet-400",
    borderColor: "border-violet-500/30",
    iconBg: "bg-violet-500/20",
    certs: [
      {
        nameKey: "certifications.certs.iso42001.name",
        issuerKey: "certifications.certs.iso42001.issuer",
        descKey: "certifications.certs.iso42001.desc",
        learnMoreUrl: "https://www.iso.org/standard/81230.html",
        icon: <Brain className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.iso42001",
      },
      {
        nameKey: "certifications.certs.iso23894.name",
        issuerKey: "certifications.certs.iso23894.issuer",
        descKey: "certifications.certs.iso23894.desc",
        learnMoreUrl: "https://www.iso.org/standard/77304.html",
        icon: <Scale className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.iso23894",
      },
      {
        nameKey: "certifications.certs.nistAiRmf.name",
        issuerKey: "certifications.certs.nistAiRmf.issuer",
        descKey: "certifications.certs.nistAiRmf.desc",
        learnMoreUrl: "https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence",
        icon: <Award className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.nistAiRmf",
      },
    ],
  },
  {
    titleKey: "certifications.categories.isoSecurity",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    certs: [
      {
        nameKey: "certifications.certs.iso27001.name",
        issuerKey: "certifications.certs.iso27001.issuer",
        descKey: "certifications.certs.iso27001.desc",
        learnMoreUrl: "https://www.iso.org/standard/27001",
        icon: <Lock className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.iso27001",
      },
      {
        nameKey: "certifications.certs.iso27701.name",
        issuerKey: "certifications.certs.iso27701.issuer",
        descKey: "certifications.certs.iso27701.desc",
        learnMoreUrl: "https://www.iso.org/standard/71670.html",
        icon: <Fingerprint className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.iso27701",
      },
      {
        nameKey: "certifications.certs.iso27017.name",
        issuerKey: "certifications.certs.iso27017.issuer",
        descKey: "certifications.certs.iso27017.desc",
        learnMoreUrl: "https://www.iso.org/standard/43757.html",
        icon: <Server className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.iso27017",
      },
      {
        nameKey: "certifications.certs.iso27018.name",
        issuerKey: "certifications.certs.iso27018.issuer",
        descKey: "certifications.certs.iso27018.desc",
        learnMoreUrl: "https://www.iso.org/standard/76559.html",
        icon: <Eye className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.iso27018",
      },
    ],
  },
  {
    titleKey: "certifications.categories.dataPrivacy",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    certs: [
      {
        nameKey: "certifications.certs.gdpr.name",
        issuerKey: "certifications.certs.gdpr.issuer",
        descKey: "certifications.certs.gdpr.desc",
        learnMoreUrl: "https://commission.europa.eu/law/law-topic/data-protection_en",
        icon: <Globe2 className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.gdpr",
      },
      {
        nameKey: "certifications.certs.ePrivacy.name",
        issuerKey: "certifications.certs.ePrivacy.issuer",
        descKey: "certifications.certs.ePrivacy.desc",
        learnMoreUrl: "https://www.eprivacy.eu/en/customers/eprivacyseal-eu/",
        icon: <FileCheck className="w-5 h-5" />,
        status: "planned",
        targetKey: "certifications.status.targets.ePrivacy",
      },
      {
        nameKey: "certifications.certs.ccpa.name",
        issuerKey: "certifications.certs.ccpa.issuer",
        descKey: "certifications.certs.ccpa.desc",
        learnMoreUrl: "https://oag.ca.gov/privacy/ccpa",
        icon: <Shield className="w-5 h-5" />,
        status: "in_progress",
        targetKey: "certifications.status.targets.ccpa",
      },
    ],
  },
];

export default function Certifications({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("certifications.backToDashboard")}
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/20 p-2.5 rounded-xl">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                {t("certifications.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("certifications.subtitle")}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-6 flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {t("certifications.roadmapNotice.title")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("certifications.roadmapNotice.body")}
            </p>
          </div>
        </motion.div>

        <div className="mt-10 space-y-12">
          {categories.map((cat, catIdx) => (
            <motion.section
              key={cat.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: catIdx * 0.1 }}
            >
              <h2 className={`text-lg font-semibold mb-4 ${cat.color}`}>
                {t(cat.titleKey)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cat.certs.map((cert) => {
                  const cfg = statusConfig[cert.status];
                  return (
                    <div
                      key={cert.nameKey}
                      className={`relative bg-card/60 backdrop-blur-md border ${cat.borderColor} rounded-xl p-5 hover:bg-card/80 transition-all group`}
                    >
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${cfg.colorClass}`}>
                          {cfg.icon}
                          {t(`certifications.status.${cert.status}`)}
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 p-2.5 rounded-lg ${cat.iconBg} ${cat.color}`}>
                          {cert.icon}
                        </div>
                        <div className="flex-1 min-w-0 pr-24">
                          <h3 className="text-base font-semibold text-foreground mb-1">
                            {t(cert.nameKey)}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wide">
                            {t(cert.issuerKey)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mb-2 font-medium">
                            {t(cert.targetKey)}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t(cert.descKey)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <a
                          href={cert.learnMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${cat.color} hover:underline transition-all`}
                        >
                          {t("certifications.learnMore")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center border-t border-border/30 pt-8"
        >
          <p className="text-xs text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
            {t("certifications.disclaimer")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
