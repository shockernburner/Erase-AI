import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LanguageSelector } from "@/components/LanguageSelector";
import AuthForm from "@/components/AuthForm";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-y-auto">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <div className="flex items-center justify-center w-full py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-md w-full mx-4"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <BrandLogo className="h-16 w-16 mb-4" />
            <h1 className="text-4xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {t("app.name")}
            </h1>
            <p className="text-sm font-mono text-primary/80 uppercase tracking-widest mt-2">
              {t("login.subtitle")}
            </p>
          </div>

          <AuthForm />

          <p className="text-center text-xs text-muted-foreground/50 mt-6 font-mono">
            {t("app.copyright")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
