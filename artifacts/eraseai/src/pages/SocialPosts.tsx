import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Megaphone,
  type LucideProps,
} from "lucide-react";

interface SocialPostsProps {
  onBack: () => void;
}

type PlatformId = "facebook" | "twitter" | "linkedin" | "tiktok";

interface PlatformConfig {
  id: PlatformId;
  icon: ComponentType<LucideProps> | null;
  color: string;
  bgColor: string;
  borderColor: string;
  postKeys: string[];
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.27a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.7z" />
    </svg>
  );
}

function PlatformIcon({ platform, className }: { platform: PlatformConfig; className?: string }) {
  if (platform.id === "tiktok") {
    return <TikTokIcon className={className} />;
  }
  if (platform.icon) {
    const Icon = platform.icon;
    return <Icon className={className} />;
  }
  return null;
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? t("social.copied") : t("social.copy")}
    </button>
  );
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    icon: Facebook,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    postKeys: ["awareness", "feature"],
  },
  {
    id: "twitter",
    icon: Twitter,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    postKeys: ["hook", "feature", "urgency"],
  },
  {
    id: "linkedin",
    icon: Linkedin,
    color: "text-blue-300",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    postKeys: ["thought", "compliance"],
  },
  {
    id: "tiktok",
    icon: null,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    postKeys: ["viral", "educational"],
  },
];

export default function SocialPosts({ onBack }: SocialPostsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  const activePlatform = PLATFORMS[activeTab];

  const activePosts = activePlatform.postKeys.map((key) => ({
    label: t(`social.${activePlatform.id}.${key}Label`),
    text: t(`social.${activePlatform.id}.${key}`),
  }));

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("social.back")}
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {t("social.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("social.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {PLATFORMS.map((platform, i) => (
            <button
              key={platform.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                activeTab === i
                  ? `${platform.bgColor} ${platform.color} ${platform.borderColor}`
                  : "border-border/30 text-muted-foreground hover:bg-muted/10"
              }`}
            >
              <PlatformIcon
                platform={platform}
                className={`w-4 h-4 ${activeTab === i ? platform.color : ""}`}
              />
              {t(`social.platforms.${platform.id}`)}
            </button>
          ))}
        </motion.div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className={`flex items-center gap-3 p-4 rounded-xl ${activePlatform.bgColor} border ${activePlatform.borderColor}`}>
            <PlatformIcon platform={activePlatform} className={`w-8 h-8 ${activePlatform.color}`} />
            <div>
              <h2 className={`text-lg font-bold ${activePlatform.color}`}>
                {t(`social.platforms.${activePlatform.id}`)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(`social.platformHint.${activePlatform.id}`)}
              </p>
            </div>
          </div>

          {activePosts.map((post, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card/60 border border-border/30 rounded-xl p-5 backdrop-blur-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${activePlatform.color}`}>
                  {post.label}
                </span>
                <CopyButton text={post.text} />
              </div>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {post.text}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{post.text.length} {t("social.chars")}</span>
                {activePlatform.id === "twitter" && post.text.length > 280 && (
                  <span className="text-yellow-400">({t("social.threadRecommended")})</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-3"
        >
          <h3 className="text-sm font-bold text-primary">{t("social.tipsTitle")}</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              {t("social.tip1")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              {t("social.tip2")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              {t("social.tip3")}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">4.</span>
              {t("social.tip4")}
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
