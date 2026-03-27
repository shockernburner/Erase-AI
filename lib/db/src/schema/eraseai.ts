import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
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

export const insertFactSchema = createInsertSchema(factsTable).omit({ id: true, createdAt: true });
export type InsertFact = z.infer<typeof insertFactSchema>;
export type Fact = typeof factsTable.$inferSelect;

export const insertLogSchema = createInsertSchema(logsTable).omit({ id: true, createdAt: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logsTable.$inferSelect;
