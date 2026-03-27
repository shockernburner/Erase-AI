import { useState } from "react";
import { useAskQuestion, AskRequest, AskResponse } from "@workspace/api-client-react";

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  confidence?: number;
  matched_fact?: string | null;
  isError?: boolean;
};

export function useEraseAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const askMutation = useAskQuestion();

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    const userMsgId = crypto.randomUUID();
    const newMessages = [
      ...messages,
      { id: userMsgId, role: "user" as const, text: question }
    ];
    setMessages(newMessages);

    try {
      const data = await askMutation.mutateAsync({ data: { question } });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: data.answer,
          confidence: data.confidence,
          matched_fact: data.matched_fact,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: "Error connecting to the dataset service.",
          isError: true,
        },
      ]);
    }
  };

  const clearHistory = () => setMessages([]);

  return {
    messages,
    sendMessage,
    clearHistory,
    isThinking: askMutation.isPending,
  };
}
