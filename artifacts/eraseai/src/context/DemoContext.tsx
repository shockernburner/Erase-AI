import { createContext, useContext, useState, useRef, ReactNode } from "react";

export interface AuditEntry {
  id: number;
  fact: string;
  time: Date;
}

interface DemoContextValue {
  auditLog: AuditEntry[];
  addAuditEntry: (fact: string) => void;
  pendingVerifyQuestion: string | null;
  setPendingVerifyQuestion: (q: string | null) => void;
  removingFact: string | null;
  setRemovingFact: (text: string | null) => void;
  sendMessageRef: React.MutableRefObject<((q: string) => void) | null>;
  unlearnFactRef: React.MutableRefObject<((fact: string) => Promise<void>) | null>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

let _entryId = 0;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [pendingVerifyQuestion, setPendingVerifyQuestion] = useState<string | null>(null);
  const [removingFact, setRemovingFact] = useState<string | null>(null);

  const sendMessageRef = useRef<((q: string) => void) | null>(null);
  const unlearnFactRef = useRef<((fact: string) => Promise<void>) | null>(null);

  const addAuditEntry = (fact: string) => {
    setAuditLog(prev => [{ id: ++_entryId, fact, time: new Date() }, ...prev]);
  };

  return (
    <DemoContext.Provider value={{
      auditLog,
      addAuditEntry,
      pendingVerifyQuestion,
      setPendingVerifyQuestion,
      removingFact,
      setRemovingFact,
      sendMessageRef,
      unlearnFactRef,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoContext must be used inside DemoProvider");
  return ctx;
}
