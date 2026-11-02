import { ShieldCheck, Smartphone, Paperclip, Eye, Server, Gauge, Building2, KeyRound } from "lucide-react";
import { SeoPage, AddToChromeButton } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";
import { useNoIndex } from "./ExtensionWelcomePage";
import { playStoreLink } from "@/lib/installTarget";
import { canonicalUrl, staticPage } from "@/seo/site";

const BASE = import.meta.env.BASE_URL;

function GetOnPlayButton({ placement }: { placement: string }) {
  return (
    <a
      href={playStoreLink(placement)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
    >
      <Smartphone className="w-5 h-5" />
      Get the Android app
    </a>
  );
}

const FACTS: { icon: typeof Eye; title: string; text: React.ReactNode }[] = [
  {
    icon: Eye,
    title: "What it can see",
    text: "On Android, EraseAI uses the Accessibility service for one purpose: to check text you type in the AI apps you chose. Password fields are skipped, and it is not a VPN. On Chrome, it runs only on ChatGPT, Claude, Gemini and Replit.",
  },
  {
    icon: Server,
    title: "Where your text goes",
    text: (
      <>
        Without an account, checks run on your device and nothing is sent. With an account, message text is checked by
        our API over HTTPS. On Chrome, images are read inside your browser and never uploaded. See the{" "}
        <a href={`${BASE}privacy`} className="text-primary hover:underline">privacy policy</a>.
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
    text: "Vantward Solutions Pte. Ltd., a company registered in Singapore (Reg. No. 202606980C), 68 Circular Road #02-01, Singapore 049422. The Chrome Web Store listing shows the same company.",
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
          Check what you send to AI, before you send it
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
          EraseAI Firewall checks every chat in the AI apps you choose on Android, and your messages and attached files
          on Chrome. If it finds personal data, card numbers, passwords or keys, it holds the message and shows you what
          it found.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-3">
          <GetOnPlayButton placement="start-hero" />
          <AddToChromeButton placement="start-hero" text="Add to Chrome" />
        </div>
        <p className="text-sm text-muted-foreground mb-12">
          Start free. Both open their store listing: Google Play, and the Chrome Web Store.
        </p>

        <div className="rounded-2xl overflow-hidden border border-border/30 bg-card/40 mb-14">
          <video
            className="w-full aspect-video bg-black"
            controls
            playsInline
            preload="none"
            poster={`${BASE}videos/eraseai-how-it-works.jpg`}
            aria-label="EraseAI checking an attached file in Chrome and a chat on Android before they are sent"
          >
            <source src={`${BASE}videos/eraseai-how-it-works.mp4`} type="video/mp4" />
          </video>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-5">What it does on each device</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          <div className="p-6 rounded-xl border border-primary/30 bg-primary/5">
            <Smartphone className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">On Android</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>Protects the AI apps you choose, such as ChatGPT, Claude and Gemini.</li>
              <li>Checks what you type before it is sent, and holds the message if it finds something.</li>
              <li>You choose: Cancel, Sanitize &amp; Send, or Send Anyway.</li>
              <li>An optional EraseAI keyboard, and EraseAI Safe to clean files before you attach them.</li>
            </ul>
          </div>
          <div className="p-6 rounded-xl border border-border/30 bg-card/40">
            <Paperclip className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">On Chrome</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>Free: every message to ChatGPT, Claude and Gemini is checked on your device.</li>
              <li>Personal: reads inside attached PDF, Word, Excel, slides and images, and can download a clean copy.</li>
              <li>Personal: one-click Sanitize &amp; Send for the message itself.</li>
              <li>Chrome only today. Other browsers are coming soon.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">EraseAI Personal</p>
          <h2 className="text-3xl font-display font-extrabold text-foreground mb-2">$5 a month</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            Or $54 a year. Attachment scanning and one-click Sanitize &amp; Send on Chrome, and full protection for your
            AI chats on Android.
          </p>
          <p className="text-foreground font-semibold mb-1">Try it first, for free.</p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The Chrome extension is free to install, and the Android app has a free trial of 7 days or 25 messages.
            Subscribe when you are ready.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <GetOnPlayButton placement="start-price" />
            <AddToChromeButton placement="start-price" text="Add to Chrome" />
            <a href={`${BASE}pricing`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">See plans</a>
          </div>
        </div>

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
      </article>
    </SeoPage>
  );
}
