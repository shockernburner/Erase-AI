import { pgTable, text, serial, timestamp, real, integer, boolean, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

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

export const datasetsTable = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalFormat: text("original_format").notNull(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const datasetVersionsTable = pgTable("dataset_versions", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  parentVersionId: integer("parent_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const datasetRowsTable = pgTable("dataset_rows", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  rowIndex: integer("row_index").notNull(),
  content: text("content").notNull(),
  isRemoved: boolean("is_removed").notNull().default(false),
  isRedacted: boolean("is_redacted").notNull().default(false),
  removedReason: text("removed_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const datasetOperationsTable = pgTable("dataset_operations", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  versionId: integer("version_id").notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  affectedRowsCount: integer("affected_rows_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analysisResultsTable = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  versionId: integer("version_id").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull(),
  rowIndex: integer("row_index").notNull(),
  content: text("content").notNull(),
  detail: text("detail").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  suggestedValue: text("suggested_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalScansTable = pgTable("personal_scans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  riskScore: integer("risk_score").notNull(),
  flags: text("flags").notNull(),
  suggestions: text("suggestions").notNull(),
  level: text("level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalAlertsTable = pgTable("personal_alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(),
  relatedScanId: integer("related_scan_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Dataset = typeof datasetsTable.$inferSelect;
export type DatasetVersion = typeof datasetVersionsTable.$inferSelect;
export type DatasetRow = typeof datasetRowsTable.$inferSelect;
export type DatasetOperation = typeof datasetOperationsTable.$inferSelect;
export type AnalysisResult = typeof analysisResultsTable.$inferSelect;
export type PersonalScan = typeof personalScansTable.$inferSelect;
export type PersonalAlert = typeof personalAlertsTable.$inferSelect;

export const firewallOutcomesTable = pgTable("firewall_outcomes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id"),
  level: text("level").notNull(),
  action: text("action").notNull(),
  riskScore: integer("risk_score"),
  categories: text("categories").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FirewallOutcome = typeof firewallOutcomesTable.$inferSelect;

export const contactInquiriesTable = pgTable("contact_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
