import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrainFact, useListFacts, getListFactsQueryKey } from "@workspace/api-client-react";
import { Button, Input, Card } from "./ui-elements";
import { Brain, Database, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export function TeachSection() {
  const [fact, setFact] = useState("");
  const { data: factsData, isLoading: isLoadingFacts } = useListFacts();
  const trainMutation = useTrainFact();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleTrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact.trim()) return;

    trainMutation.mutate(
      { data: { text: fact } },
      {
        onSuccess: () => {
          setFact("");
          queryClient.invalidateQueries({ queryKey: getListFactsQueryKey() });
          toast({
            title: "Fact learned!",
            description: "The model has successfully stored the new fact.",
            variant: "default",
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to train",
            description: err instanceof Error ? err.message : "Unknown error occurred",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Card className="h-full">
      <div className="p-6 border-b border-border/50 bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display text-foreground">Teach Model</h2>
            <p className="text-sm text-muted-foreground">Inject facts into the AI's memory</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">
        <form onSubmit={handleTrain} className="flex gap-3">
          <Input
            placeholder="E.g., The secret launch code is Alpha-7"
            value={fact}
            onChange={(e) => setFact(e.target.value)}
            disabled={trainMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" isLoading={trainMutation.isPending} className="shrink-0 gap-2">
            <Plus className="w-4 h-4" /> Train
          </Button>
        </form>

        <div className="flex flex-col flex-1 min-h-[200px] border border-border/50 rounded-xl bg-background/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/20">
            <Database className="w-4 h-4" />
            Stored Knowledge Base
            <span className="ml-auto bg-muted px-2 py-0.5 rounded-md text-xs">
              {factsData?.count || 0} facts
            </span>
          </div>
          <div className="p-3 overflow-y-auto max-h-[300px] flex flex-col gap-2">
            {isLoadingFacts ? (
              <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
                Loading database...
              </div>
            ) : factsData?.facts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Brain className="w-8 h-8 opacity-20" />
                Memory is completely empty.
              </div>
            ) : (
              <AnimatePresence>
                {factsData?.facts.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors text-sm text-foreground flex justify-between items-start group"
                  >
                    <span className="leading-relaxed">{f.text}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0 ml-4 opacity-50 group-hover:opacity-100 transition-opacity">
                      ID: {f.id}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
