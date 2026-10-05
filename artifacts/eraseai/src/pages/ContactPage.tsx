import { useState } from "react";
import { ArrowLeft, Mail, MessageCircle, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/BrandLogo";

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {t("app.name")}
            </span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border/50 text-sm font-medium text-foreground hover:bg-muted/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("legal.back")}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("contact.title")}</h1>
        <p className="text-sm text-muted-foreground mb-10">{t("contact.subtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-foreground">{t("contact.info")}</h2>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("contact.address")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vantward Solutions Pte. Ltd.<br />
                    68 Circular Road #02-01<br />
                    Singapore 049422
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Reg. No. 202606980C</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("contact.email")}</p>
                  <a href="mailto:director@vantward.com" className="text-sm text-primary hover:text-primary/80 transition-colors">
                    director@vantward.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-500/10 p-2 rounded-lg mt-0.5">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("contact.whatsapp")}</p>
                  <a
                    href="https://wa.me/6582430739"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-400 hover:text-green-300 transition-colors"
                  >
                    +65 8243 0739
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">{t("contact.hours")}</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("contact.weekdays")}</span>
                  <span className="text-foreground font-medium">9:00 AM &ndash; 6:00 PM (SGT)</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("contact.weekends")}</span>
                  <span className="text-foreground font-medium">{t("contact.closed")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/50 border border-border/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">{t("contact.formTitle")}</h2>

            {status === "sent" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-emerald-500/10 p-3 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t("contact.successTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t("contact.successDesc")}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {t("contact.sendAnother")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.nameLabel")}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder={t("contact.namePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.emailLabel")}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder={t("contact.emailPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.subjectLabel")}</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder={t("contact.subjectPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.messageLabel")}</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                    placeholder={t("contact.messagePlaceholder")}
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-destructive">{t("contact.errorMsg")}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("contact.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t("contact.sendButton")}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
