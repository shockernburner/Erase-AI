import { BookOpen, ArrowRight, Calendar } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";

const BASE = import.meta.env.BASE_URL;

const posts = [
  {
    slug: "api-keys-chatgpt",
    title: "Why You Should Never Paste API Keys into ChatGPT",
    excerpt: "One simple mistake can expose your entire infrastructure. Learn why pasting API keys into AI tools is dangerous and how to protect yourself.",
    date: "2025-01-15",
  },
  {
    slug: "what-is-ai-firewall",
    title: "What is an AI Firewall?",
    excerpt: "AI firewalls are the next evolution in data security. Understand what they are, how they work, and why every organization needs one.",
    date: "2025-01-10",
  },
  {
    slug: "prevent-data-leaks-ai",
    title: "How to Prevent Data Leaks in AI Tools",
    excerpt: "From ChatGPT to Gemini, AI tools are powerful but risky. Here are practical steps to prevent accidental data exposure.",
    date: "2025-01-05",
  },
];

export default function BlogIndex() {
  useSeoMeta({
    title: "Blog — AI Security, Data Protection & Prompt Safety | EraseAI",
    description: "Insights on AI security, data protection, and how to safely use AI tools without compromising sensitive information.",
    url: "https://eraseai.ai/blog",
  });

  return (
    <SeoPage>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
        <BookOpen className="w-4 h-4" />
        Blog
      </div>

      <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-4">
        AI Security Blog
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-12">
        Insights on AI security, data protection, and how to safely use AI tools without compromising sensitive information.
      </p>

      <div className="space-y-6">
        {posts.map((post) => (
          <a
            key={post.slug}
            href={`${BASE}blog/${post.slug}`}
            className="block p-6 rounded-2xl border border-border/30 bg-card/40 hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
            <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Read more <ArrowRight className="w-4 h-4" />
            </span>
          </a>
        ))}
      </div>

      <div className="text-center py-10 mt-12 rounded-2xl border border-primary/20 bg-primary/5">
        <h3 className="text-xl font-bold text-foreground mb-3">Protect Your Data with EraseAI</h3>
        <p className="text-muted-foreground mb-6">Scan your prompts in real-time before they reach AI tools.</p>
        <CtaButton />
      </div>

      <RelatedLinks exclude="blog" />
    </SeoPage>
  );
}
