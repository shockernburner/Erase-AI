import { useState, useEffect } from "react";
import { MessageSquarePlus, Star, X, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui-elements";

interface FeedbackItem {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-md hover:bg-muted/40 transition-all text-sm text-muted-foreground hover:text-foreground"
        title="Send Feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <AnimatePresence>
        {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setLoadingHistory(true);
    fetch("/api/feedback/mine", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHistory(data.feedback || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, message: message.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit feedback");
        return;
      }

      setSuccess(true);
      if (data.feedback) {
        setHistory((prev) => [data.feedback, ...prev]);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setMessage("");
    setSuccess(false);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Send Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Thank you!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your feedback helps us improve EraseAI.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="text-sm"
                  >
                    Send Another
                  </Button>
                  <Button
                    onClick={onClose}
                    className="text-sm bg-primary text-black hover:bg-primary/90"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    How would you rate your experience?
                  </label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tell us more
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What did you like? What could be better? Any feature requests?"
                    rows={4}
                    maxLength={2000}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground/50 mt-1 text-right">
                    {message.length}/2000
                  </p>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Your past feedback ({history.length})
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-1">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-muted/10 border border-border/20 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= item.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground/20"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground/50">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {loadingHistory && history.length === 0 && (
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2 text-sm text-muted-foreground/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading history...
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
