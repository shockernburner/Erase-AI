import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnlearnFact, useListFacts, getListFactsQueryKey } from "@workspace/api-client-react";
import { Button, Input, Card } from "./ui-elements";
import { Trash2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/context/DemoContext";

export function UnlearnSection() {
  const [fact, setFact] = useState("");
  const unlearnMutation = useUnlearnFact();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: factsData } = useListFacts();
  const demoCtx = useDemoContext();

  const doUnlearn = async (targetFact: string) => {
    if (!targetFact.trim()) return;
    demoCtx.setRemovingFact(targetFact);
    try {
      const res = await unlearnMutation.mutateAsync({ data: { text: targetFact } });
      setFact("");
      queryClient.invalidateQueries({ queryKey: getListFactsQueryKey() });

      if (res.removed_count > 0) {
        demoCtx.addAuditEntry(targetFact);
        demoCtx.setPendingVerifyQuestion("Who is Firdous?");
        toast({
          title: "Data erased",
          description: `Successfully removed ${res.removed_count} entry(s) from the dataset.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No match found",
          description: "No matching data found in the dataset.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erase failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      demoCtx.setRemovingFact(null);
    }
  };

  useEffect(() => {
    demoCtx.unlearnFactRef.current = doUnlearn;
  }, [unlearnMutation]);

  const handleUnlearn = (e: React.FormEvent) => {
    e.preventDefault();
    doUnlearn(fact);
  };

  return (
    <Card className="h-full border-destructive/20 bg-gradient-to-b from-card to-destructive/5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ef4444 10px, #ef4444 20px)' }}>
      </div>

      <div className="p-6 border-b border-destructive/10 bg-card/40 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.5)]">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display text-foreground">EraseAI</h2>
            <p className="text-sm text-destructive/80">Erase from Dataset</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6 relative z-10">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3 text-sm text-destructive/90">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Select data to <strong>erase</strong> from the dataset. This removes the entry and creates a new dataset version.
            The cleaned dataset is then safe for retraining.
          </p>
        </div>

        <form onSubmit={handleUnlearn} className="flex flex-col gap-4 mt-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Target Data to Erase</label>
            <div className="relative">
              <Input
                placeholder="Select or type data to erase..."
                value={fact}
                onChange={(e) => setFact(e.target.value)}
                disabled={unlearnMutation.isPending}
                className="border-destructive/30 focus:ring-destructive/50 focus:border-destructive"
              />
            </div>

            {factsData && factsData.facts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {factsData.facts.slice(0, 3).map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFact(f.text)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-muted border border-border hover:border-destructive/50 hover:bg-destructive/10 transition-colors text-left truncate max-w-[200px]"
                  >
                    {f.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="destructive"
            size="lg"
            isLoading={unlearnMutation.isPending}
            className="w-full gap-2 mt-4"
          >
            <Trash2 className="w-5 h-5" /> Erase from Dataset
          </Button>
        </form>
      </div>
    </Card>
  );
}
