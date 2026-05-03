import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Newspaper, ExternalLink } from "lucide-react";

interface Post {
  href: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}

export default function BlogsHub() {
  const { t } = useTranslation();

  const posts: Post[] = [
    {
      href: "/blog",
      titleKey: "blogsHub.indexTitle",
      defaultTitle: "All posts",
      descKey: "blogsHub.indexDesc",
      defaultDesc: "Browse the full archive — guides, case studies and product updates.",
    },
    {
      href: "/blog/api-keys-chatgpt",
      titleKey: "blogsHub.apiKeysTitle",
      defaultTitle: "Why API keys end up in ChatGPT",
      descKey: "blogsHub.apiKeysDesc",
      defaultDesc: "How developers leak credentials and how to stop it at the browser.",
    },
    {
      href: "/blog/what-is-ai-firewall",
      titleKey: "blogsHub.aiFirewallTitle",
      defaultTitle: "What is an AI firewall?",
      descKey: "blogsHub.aiFirewallDesc",
      defaultDesc: "A primer on prompt-side data loss prevention.",
    },
    {
      href: "/blog/prevent-data-leaks-ai",
      titleKey: "blogsHub.preventLeaksTitle",
      defaultTitle: "Preventing data leaks to AI tools",
      descKey: "blogsHub.preventLeaksDesc",
      defaultDesc: "A 7-step checklist for security teams shipping AI to staff.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16">
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-cyan-500/15 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/30">
            <Newspaper className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("blogsHub.title", { defaultValue: "Blogs" })}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t("blogsHub.subtitle", { defaultValue: "Field notes, security primers, and EraseAI release news." })}
        </p>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((p, i) => (
          <motion.a
            key={p.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-card/50 border border-border/40 rounded-2xl p-5 hover:border-cyan-500/40 transition-all"
          >
            <h3 className="font-bold text-foreground mb-1">{t(p.titleKey, { defaultValue: p.defaultTitle })}</h3>
            <p className="text-sm text-muted-foreground">{t(p.descKey, { defaultValue: p.defaultDesc })}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400">
              {t("blogsHub.read", { defaultValue: "Read" })} <ExternalLink className="w-3 h-3" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
