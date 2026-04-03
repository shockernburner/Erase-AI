import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(
    (l) => l.code === i18n.language?.split("-")[0]
  ) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-md hover:bg-muted/40 transition-all text-sm"
        aria-label={t("language.selectLanguage")}
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground hidden sm:inline">
          {currentLang.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-card border border-border rounded-xl shadow-xl py-1 backdrop-blur-md">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-muted/20 transition-colors ${
                  lang.code === currentLang.code
                    ? "text-primary font-semibold"
                    : "text-foreground"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
