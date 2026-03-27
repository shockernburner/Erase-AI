import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const factsTable = pgTable("facts", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const verifySnapshotsTable = pgTable("verify_snapshots", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  beforeAnswer: text("before_answer").notNull(),
  beforeConfidence: real("before_confidence").notNull(),
  matchedFact: text("matched_fact"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFactSchema = createInsertSchema(factsTable).omit({ id: true, createdAt: true });
export type InsertFact = z.infer<typeof insertFactSchema>;
export type Fact = typeof factsTable.$inferSelect;

export const insertLogSchema = createInsertSchema(logsTable).omit({ id: true, createdAt: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logsTable.$inferSelect;

export const insertVerifySnapshotSchema = createInsertSchema(verifySnapshotsTable).omit({ id: true, createdAt: true });
export type InsertVerifySnapshot = z.infer<typeof insertVerifySnapshotSchema>;
export type VerifySnapshot = typeof verifySnapshotsTable.$inferSelect;
