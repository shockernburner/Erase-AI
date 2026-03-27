import { useState, useEffect, useRef } from "react";
import { Card, Input, Button } from "./ui-elements";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { useEraseAIChat } from "@/hooks/use-eraseai-chat";
import { motion, AnimatePresence } from "framer-motion";
import { formatConfidence, getConfidenceColor } from "@/lib/utils";
import { useDemoContext } from "@/context/DemoContext";

interface AskSectionProps {
  defaultQuestion?: string;
}

export function AskSection({ defaultQuestion = "" }: AskSectionProps) {
  const [input, setInput] = useState(defaultQuestion);
  const { messages, sendMessage, isThinking, clearHistory } = useEraseAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const demoCtx = useDemoContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    demoCtx.sendMessageRef.current = (q: string) => {
      setInput(q);
      sendMessage(q);
    };
    return () => {
      demoCtx.sendMessageRef.current = null;
    };
  }, [sendMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <Card className="h-full">
      <div className="p-6 border-b border-border/50 bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary text-secondary-foreground border border-border">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display text-foreground">Ask Model</h2>
            <p className="text-sm text-muted-foreground">Query the model's current memory</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-[400px]">
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-50">
              <Sparkles className="w-12 h-12" />
              <p className="text-sm">Ask a question to see what the model knows.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : msg.isError
                          ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm'
                          : 'bg-secondary border border-border text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>

                  {msg.role === 'ai' && msg.confidence !== undefined && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <span className={getConfidenceColor(msg.confidence)}>
                        Conf: {formatConfidence(msg.confidence)}
                      </span>
                      {msg.matched_fact && (
                        <span className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={msg.matched_fact}>
                          Match: {msg.matched_fact}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start mr-auto max-w-[85%]">
                  <div className="px-4 py-4 rounded-2xl bg-secondary border border-border rounded-bl-sm flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-background/50 border-t border-border/50">
          <form onSubmit={handleSend} className="relative">
            <Input
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isThinking}
              className="pr-12"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isThinking}
              className="absolute right-1 top-1 bottom-1 px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
