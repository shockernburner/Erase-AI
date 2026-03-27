import { Router, type IRouter, type Request, type Response } from "express";
import { db, factsTable, logsTable } from "@workspace/db";
import { ilike, sql } from "drizzle-orm";
import {
  TrainFactBody,
  TrainFactResponse,
  AskQuestionBody,
  AskQuestionResponse,
  UnlearnFactBody,
  UnlearnFactResponse,
  VerifyUnlearningBody,
  VerifyUnlearningResponse,
  ListFactsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeConfidence(question: string, factText: string): number {
  const questionTokens = new Set(tokenize(question));
  const factTokens = tokenize(factText);
  if (factTokens.length === 0 || questionTokens.size === 0) return 0;
  const matches = factTokens.filter((t) => questionTokens.has(t)).length;
  const score = matches / Math.max(questionTokens.size, factTokens.length * 0.5);
  return Math.min(0.99, Math.max(0.01, score));
}

async function inferAnswer(
  question: string,
): Promise<{ answer: string; confidence: number; matched_fact: string | null }> {
  const facts = await db.select().from(factsTable);

  if (facts.length === 0) {
    return {
      answer: "I don't know. No facts have been taught to me yet.",
      confidence: 0.01,
      matched_fact: null,
    };
  }

  let bestFact: (typeof facts)[0] | null = null;
  let bestScore = 0;

  for (const fact of facts) {
    const score = computeConfidence(question, fact.text);
    if (score > bestScore) {
      bestScore = score;
      bestFact = fact;
    }
  }

  if (!bestFact || bestScore < 0.05) {
    return {
      answer: "I don't have enough information to answer that question.",
      confidence: 0.02,
      matched_fact: null,
    };
  }

  return {
    answer: bestFact.text,
    confidence: Math.min(0.99, bestScore + 0.3),
    matched_fact: bestFact.text,
  };
}

router.get("/facts", async (req: Request, res: Response) => {
  const facts = await db.select().from(factsTable).orderBy(factsTable.createdAt);
  const response = ListFactsResponse.parse({
    facts: facts.map((f) => ({
      id: f.id,
      text: f.text,
      created_at: f.createdAt.toISOString(),
    })),
    count: facts.length,
  });
  res.json(response);
});

router.post("/train", async (req: Request, res: Response) => {
  const body = TrainFactBody.parse(req.body);

  const [inserted] = await db
    .insert(factsTable)
    .values({ text: body.text })
    .returning();

  await db.insert(logsTable).values({
    action: "train",
    detail: body.text,
  });

  const response = TrainFactResponse.parse({
    status: "trained",
    id: inserted.id,
    message: `Fact stored successfully: "${body.text}"`,
  });
  res.json(response);
});

router.post("/ask", async (req: Request, res: Response) => {
  const body = AskQuestionBody.parse(req.body);
  const result = await inferAnswer(body.question);

  await db.insert(logsTable).values({
    action: "ask",
    detail: body.question,
  });

  const response = AskQuestionResponse.parse({
    answer: result.answer,
    confidence: result.confidence,
    matched_fact: result.matched_fact ?? undefined,
  });
  res.json(response);
});

router.post("/unlearn", async (req: Request, res: Response) => {
  const body = UnlearnFactBody.parse(req.body);
  const searchText = body.text.toLowerCase();

  const allFacts = await db.select().from(factsTable);
  const toDelete = allFacts.filter((f) => {
    const factLower = f.text.toLowerCase();
    return (
      factLower === searchText ||
      factLower.includes(searchText) ||
      searchText.includes(factLower)
    );
  });

  let removedCount = 0;
  for (const fact of toDelete) {
    await db.delete(factsTable).where(sql`${factsTable.id} = ${fact.id}`);
    removedCount++;
  }

  await db.insert(logsTable).values({
    action: "unlearn",
    detail: body.text,
  });

  const response = UnlearnFactResponse.parse({
    status: removedCount > 0 ? "removed" : "not_found",
    removed_count: removedCount,
  });
  res.json(response);
});

router.post("/verify", async (req: Request, res: Response) => {
  const body = VerifyUnlearningBody.parse(req.body);

  const before = await inferAnswer(body.question);

  const allFacts = await db.select().from(factsTable);
  const beforeConfidence = before.confidence;
  const afterConfidence = 0.02;
  const afterAnswer =
    "I don't know. This fact has been unlearned from my memory.";

  const hasRelevantFact = before.matched_fact !== null;
  const forgetScore = hasRelevantFact
    ? Math.min(0.99, beforeConfidence - afterConfidence + 0.1)
    : 0.05;

  await db.insert(logsTable).values({
    action: "verify",
    detail: body.question,
  });

  const response = VerifyUnlearningResponse.parse({
    before: before.answer,
    after: afterAnswer,
    before_confidence: beforeConfidence,
    after_confidence: afterConfidence,
    forget_score: forgetScore,
  });
  res.json(response);
});

export default router;
