import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, XCircle, ShieldX } from "lucide-react";
import { Button } from "@/components/ui-elements";

interface CheckoutSuccessProps {
  onDone: () => void;
}

export default function CheckoutSuccess({ onDone }: CheckoutSuccessProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [activatedPlan, setActivatedPlan] = useState<string>("pro");
  // Set when a Team purchase created an organization; Continue goes there.
  const [teamOrg, setTeamOrg] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pollKey, setPollKey] = useState(0);

  const [sessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("session_id") ||
      sessionStorage.getItem("eraseai_checkout_intent")
    );
  });

  const checkPlan = useCallback(async () => {
    try {
      if (sessionId) {
        const statusRes = await fetch(
          `${import.meta.env.BASE_URL}api/billing/checkout-status?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include" },
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === "succeeded") {
            sessionStorage.removeItem("eraseai_checkout_intent");
            setActivatedPlan(statusData.planType || "pro");
            setTeamOrg(Boolean(statusData.organizationId));
            setStatus("success");
            return true;
          }
        }
      }

      const res = await fetch(`${import.meta.env.BASE_URL}api/billing/plan`, {
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      if ((data.planType === "personal" || data.planType === "pro" || data.planType === "business") && data.subscriptionStatus === "active") {
        sessionStorage.removeItem("eraseai_checkout_intent");
        setActivatedPlan(data.planType);
        setStatus("success");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;
      const upgraded = await checkPlan();
      if (upgraded || cancelled) return;

      setAttempts(prev => {
        const next = prev + 1;
        if (next >= 15) {
          setStatus("failed");
          return next;
        }
        timeout = setTimeout(poll, 2000);
        return next;
      });
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [checkPlan, pollKey]);

  const handleContinue = () => {
    if (teamOrg) {
      window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/?view=organization`);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-2xl"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldX className="w-6 h-6" />
            </div>
            <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              EraseAI
            </span>
          </div>

          {status === "checking" && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t("checkout.confirming")}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t("checkout.pleaseWait")}
              </p>
              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min((attempts / 15) * 100, 95)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t(`checkout.welcome${activatedPlan.charAt(0).toUpperCase() + activatedPlan.slice(1)}`)}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t(`checkout.${activatedPlan}Active`)}
              </p>
              <Button
                onClick={handleContinue}
                className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] py-5"
              >
                {t("checkout.continueDashboard")}
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t("checkout.paymentProcessing")}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t("checkout.paymentStillProcessing")}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={onDone}
                  variant="outline"
                  className="flex-1"
                >
                  {t("checkout.goToDashboard")}
                </Button>
                <Button
                  onClick={() => {
                    setStatus("checking");
                    setAttempts(0);
                    setPollKey(k => k + 1);
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("checkout.checkAgain")}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
