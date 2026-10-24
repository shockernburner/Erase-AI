import { ShieldCheck, KeyRound, Eye, Server, Gauge, Building2 } from "lucide-react";
import { SeoPage, AddToChromeButton, GetAndroidLink } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";
import { useNoIndex } from "./ExtensionWelcomePage";
import { canonicalUrl, staticPage } from "@/seo/site";

const BASE = import.meta.env.BASE_URL;

const STEPS: [string, string][] = [
  ["You press Send", "In ChatGPT, Claude, Gemini or Replit, as you normally would."],
  ["EraseAI checks the message first", "Keys, passwords, card numbers, emails and phone numbers are looked for before anything leaves your browser."],
  ["You decide", "You see what was found, then Cancel, Sanitize & Send, or Send Anyway."],
];

const FACTS: { icon: typeof Eye; title: string; text: React.ReactNode }[] = [
  {
    icon: Eye,
    title: "What it can see",
    text: "Only the AI sites it protects: ChatGPT, Claude, Gemini and Replit, plus eraseai.ai. Chrome will show that access when you install. Beyond that it only uses the storage and activeTab permissions, and it does not read other sites.",
  },
  {
    icon: Server,
    title: "Where your text goes",
    text: (
      <>
        Free, with no account: every check runs on your device and nothing is sent. If you connect an EraseAI account,
        the message text is checked by our API over HTTPS. Images are read inside your browser and never uploaded. See
        the <a href={`${BASE}privacy`} className="text-primary hover:underline">privacy policy</a>.
      </>
    ),
  },
  {
    icon: Gauge,
    title: "What it can't do",
    text: "Detection is rules-based: patterns plus checks such as the card-number checksum. It can miss a secret it has no rule for, and it can flag harmless text. You always see the result before anything is sent.",
  },
  {
    icon: Building2,
    title: "Who makes it",
    text: "Vantward Solutions Pte. Ltd., a company registered in Singapore (Reg. No. 202606980C), 68 Circular Road #02-01, Singapore 049422. The store listing shows the same company.",
  },
];

export default function StartPage() {
  useNoIndex();
  const meta = staticPage("/start");
  useSeoMeta({ title: meta.title, description: meta.description, url: canonicalUrl("/start") });

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          EraseAI Firewall
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-5">
          Catch the key, the password or the card number before you press Send
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
          EraseAI Firewall checks what you are about to send to ChatGPT, Claude or Gemini. If it finds something that
          should not leave your computer, it holds the message and shows you what it found.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-3">
          <AddToChromeButton placement="start-hero" />
          <GetAndroidLink placement="start-hero" />
        </div>
        <p className="text-sm text-muted-foreground mb-12">
          Free Chrome extension. Checks run on your device and you don't need an account. It opens the Chrome Web Store.
        </p>

        <div className="rounded-2xl overflow-hidden border border-border/30 bg-card/40 mb-14">
          <video
            className="w-full aspect-video bg-black"
            controls
            playsInline
            preload="none"
            poster={`${BASE}videos/eraseai-how-it-works.jpg`}
            aria-label="A 17-second walkthrough of EraseAI checking a message before it is sent"
          >
            <source src={`${BASE}videos/eraseai-how-it-works.mp4`} type="video/mp4" />
          </video>
          <p className="px-4 py-3 text-xs text-muted-foreground">17 seconds, recorded from the live product. No sound.</p>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-5">What happens when you press Send</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 list-none p-0">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="p-5 rounded-xl border border-border/30 bg-card/40">
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center mb-3">{i + 1}</div>
              <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">Before you install, here is what you should know</h2>
        <p className="text-muted-foreground mb-6">Plain answers about what it reads, where your text goes, and who is behind it.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {FACTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-5 rounded-xl border border-border/30 bg-card/40">
              <Icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/40 p-6 sm:p-8 mb-14">
          <KeyRound className="w-6 h-6 text-primary mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-3">Why we built it</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              I spent 17 years in security: in the Air Force, across physical, national and cyber security, and then as
              an aerospace engineer, where protecting sensitive information was my core duty. Then I started a software
              company and wrote the code by hand.
            </p>
            <p>
              When we moved to AI-driven development, I saw people on teams paste company information into public AI
              tools, something that should never have happened. Then one morning, as a father, I realised I had done the
              same with information about my own child.
            </p>
            <p>
              That is when my understanding changed, and EraseAI Firewall grew out of it. It is live, not a pre-product,
              and bootstrapped.
            </p>
            <p className="text-sm text-foreground/80">Founder, Vantward Solutions Pte. Ltd., Singapore</p>
          </div>
        </div>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-3">Free to start, and you stay in control</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            The free extension checks every message on your device. EraseAI Personal adds one-click Sanitize & Send,
            file and screenshot scanning, history and the Android app.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
            <AddToChromeButton placement="start-footer" />
            <a href={`${BASE}pricing`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">See plans</a>
          </div>
        </div>
      </article>
    </SeoPage>
  );
}
