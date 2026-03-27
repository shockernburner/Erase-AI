import { Router, type IRouter, type Request, type Response } from "express";
import { db, factsTable, logsTable, verifySnapshotsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
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

function computeRelevance(question: string, factText: string): number {
  const questionTokens = new Set(tokenize(question));
  const factTokens = tokenize(factText);
  if (factTokens.length === 0 || questionTokens.size === 0) return 0;
  const matches = factTokens.filter((t) => questionTokens.has(t)).length;
  return matches / Math.max(questionTokens.size, factTokens.length * 0.5);
}

function computeConfidence(relevance: number): number {
  return Math.min(0.99, Math.max(0.01, relevance + 0.3));
}

type Fact = typeof factsTable.$inferSelect;

function inferFromFacts(
  question: string,
  facts: Fact[],
): { answer: string; confidence: number; matched_fact: string | null } {
  if (facts.length === 0) {
    return {
      answer: "I don't know. No facts have been taught to me yet.",
      confidence: 0.01,
      matched_fact: null,
    };
  }

  let bestFact: Fact | null = null;
  let bestRelevance = 0;

  for (const fact of facts) {
    const relevance = computeRelevance(question, fact.text);
    if (relevance > bestRelevance) {
      bestRelevance = relevance;
      bestFact = fact;
    }
  }

  if (!bestFact || bestRelevance < 0.05) {
    return {
      answer: "I don't have enough information to answer that question.",
      confidence: 0.02,
      matched_fact: null,
    };
  }

  return {
    answer: bestFact.text,
    confidence: computeConfidence(bestRelevance),
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
  const facts = await db.select().from(factsTable);
  const result = inferFromFacts(body.question, facts);

  await db.insert(logsTable).values({
    action: "ask",
    detail: body.question,
  });

  if (result.matched_fact !== null) {
    await db.insert(verifySnapshotsTable).values({
      question: body.question,
      beforeAnswer: result.answer,
      beforeConfidence: result.confidence,
      matchedFact: result.matched_fact,
    });
  }

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

  const allFacts = await db.select().from(factsTable);
  const currentResult = inferFromFacts(body.question, allFacts);

  const snapshots = await db
    .select()
    .from(verifySnapshotsTable)
    .orderBy(desc(verifySnapshotsTable.createdAt))
    .limit(50);

  const questionTokens = new Set(tokenize(body.question));
  const relevantSnapshot = snapshots.find((s) => {
    const snapTokens = tokenize(s.question);
    const overlap = snapTokens.filter((t) => questionTokens.has(t)).length;
    return overlap > 0 && s.matchedFact !== null;
  });

  let beforeAnswer: string;
  let beforeConfidence: number;
  let afterAnswer: string;
  let afterConfidence: number;
  let forgetScore: number;

  if (relevantSnapshot && currentResult.matched_fact === null) {
    beforeAnswer = relevantSnapshot.beforeAnswer;
    beforeConfidence = relevantSnapshot.beforeConfidence;
    afterAnswer = currentResult.answer;
    afterConfidence = currentResult.confidence;
    forgetScore = Math.min(0.99, Math.max(0.01, beforeConfidence - afterConfidence));
  } else if (relevantSnapshot && currentResult.matched_fact !== null) {
    beforeAnswer = relevantSnapshot.beforeAnswer;
    beforeConfidence = relevantSnapshot.beforeConfidence;
    afterAnswer = currentResult.answer;
    afterConfidence = currentResult.confidence;
    forgetScore = Math.max(0.01, Math.abs(beforeConfidence - afterConfidence));
  } else {
    beforeAnswer = currentResult.answer;
    beforeConfidence = currentResult.confidence;
    const factsWithoutMatch =
      currentResult.matched_fact !== null
        ? allFacts.filter((f) => f.text !== currentResult.matched_fact)
        : allFacts;
    const afterResult = inferFromFacts(body.question, factsWithoutMatch);
    afterAnswer = afterResult.answer;
    afterConfidence = afterResult.confidence;
    forgetScore = Math.min(0.99, Math.max(0.01, beforeConfidence - afterConfidence));
  }

  await db.insert(logsTable).values({
    action: "verify",
    detail: body.question,
  });

  const response = VerifyUnlearningResponse.parse({
    before: beforeAnswer,
    after: afterAnswer,
    before_confidence: beforeConfidence,
    after_confidence: afterConfidence,
    forget_score: forgetScore,
  });
  res.json(response);
});

export default router;
