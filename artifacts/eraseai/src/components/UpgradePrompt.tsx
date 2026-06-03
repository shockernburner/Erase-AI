import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui-elements";

interface UpgradePromptProps {
  feature: string;
  message: string;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ feature, message, onUpgrade, onDismiss }: UpgradePromptProps) {
  return (
    <div className="relative bg-gradient-to-r from-primary/10 to-cyan-400/10 border border-primary/30 rounded-xl p-4 flex items-start gap-4">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="bg-primary/20 p-2 rounded-lg shrink-0">
        <Crown className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground mb-1">
          {feature} — Developer Feature
        </p>
        <p className="text-xs text-muted-foreground mb-3">{message}</p>
        <Button
          onClick={onUpgrade}
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
        >
          <Crown className="w-3.5 h-3.5" />
          Get API Key
        </Button>
      </div>
    </div>
  );
}

export function UpgradeInline({ message, onUpgrade }: { message: string; onUpgrade: () => void }) {
  return (
    <button
      onClick={onUpgrade}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      <Crown className="w-3.5 h-3.5" />
      {message}
    </button>
  );
}
