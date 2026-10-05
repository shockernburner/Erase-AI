import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Building2, Loader2, ShieldX, AlertTriangle } from "lucide-react";
import AuthForm from "@/components/AuthForm";
import { Button } from "@/components/ui-elements";
import { ORG_PLAN_NAMES, ORG_ROLE_NAMES, clearPendingInvite, orgApi } from "@/lib/orgInvite";

interface InvitePreview {
  organization: { name: string; plan: string; active: boolean };
  email: string;
  role: string;
}

// Shown for an /org/join?token=… link: before sign-in it names the
// organization and the invited email next to the sign-in form; after sign-in
// it offers to join.
export default function JoinOrganization({ token, onDone }: { token: string; onDone: (joined: boolean) => void }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    orgApi<InvitePreview>("GET", `/org/invite-preview?token=${encodeURIComponent(token)}`)
      .then((p) => !cancelled && setPreview(p))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const dismiss = () => {
    clearPendingInvite();
    onDone(false);
  };

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await orgApi("POST", "/org/join", { token });
      clearPendingInvite();
      onDone(true);
    } catch (e) {
      setJoinError((e as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const emailMismatch =
    isAuthenticated && preview && user?.email && user.email.toLowerCase() !== preview.email;

  return (
    <div className="min-h-screen w-full flex items-start justify-center bg-background px-4 py-16">
      <div className="max-w-md w-full space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-4">
            <ShieldX className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Join your organization on EraseAI</h1>
        </div>

        <div className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md">
          {!preview && !loadError && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking your invite…
            </div>
          )}
          {loadError && (
            <div className="space-y-4">
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {loadError}
              </p>
              <Button variant="outline" size="sm" onClick={dismiss}>Continue to EraseAI</Button>
            </div>
          )}
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><Building2 className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-foreground">{preview.organization.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ORG_PLAN_NAMES[preview.organization.plan] ?? preview.organization.plan} plan · you join as {ORG_ROLE_NAMES[preview.role]?.toLowerCase() ?? preview.role}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This invite is for <span className="text-foreground font-medium">{preview.email}</span>. Your organization pays for your plan:
                after joining, install the Chrome extension and the Android app and sign in with this email. You pay nothing.
              </p>
              {!preview.organization.active && (
                <p className="text-sm text-destructive">This organization is not active right now. Ask your admin.</p>
              )}
            </div>
          )}
        </div>

        {preview && !isAuthenticated && (
          <>
            <p className="text-sm text-center text-muted-foreground">
              Sign in or create an account with <span className="text-foreground">{preview.email}</span> to accept.
            </p>
            <AuthForm />
          </>
        )}

        {preview && isAuthenticated && (
          <div className="space-y-3">
            {emailMismatch ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You're signed in as <span className="text-foreground">{user?.email}</span>. Sign out and sign in with {preview.email} to accept this invite.
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={logout}>Sign out</Button>
                  <Button variant="ghost" onClick={dismiss}>Not now</Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="primary" onClick={join} isLoading={joining} disabled={!preview.organization.active}>
                  Join {preview.organization.name}
                </Button>
                <Button variant="ghost" onClick={dismiss}>Not now</Button>
              </div>
            )}
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
