# EraseAI — FINAL Plan Refinement (Production + Demo Ready)

## CONTEXT

We are implementing a Dataset Version-Controlled Unlearning Engine inside an existing TypeScript + Express system.

The current plan is strong but needs final corrections for:

* correctness
* traceability
* demo impact

---

## 1. DATA MODEL (FINAL)

datasets

* id
* name
* created_at

dataset_versions

* id
* dataset_id
* version_number
* parent_version_id
* created_at

dataset_rows

* id
* version_id
* content
* is_removed (boolean)
* is_redacted (boolean)
* removed_reason
* created_at

dataset_operations

* id
* dataset_id
* version_id
* type ("delete" | "redact")
* value (keyword)
* affected_rows_count
* created_at

---

## 2. UNLEARNING MODES (STRICT DEFINITION)

Input:

{
"mode": "delete" | "redact",
"value": "keyword"
}

Behavior:

DELETE:

* Entire row removed if keyword match (case-insensitive)

REDACT:

* Replace ALL occurrences of keyword with "[REDACTED]"
* Case-insensitive
* Global replace

---

## 3. VERSIONING LOGIC (STRICT)

* Never mutate existing version
* Create new version for each operation
* Set parent_version_id
* Copy rows → apply transformation

---

## 4. VERIFY LOGIC (FIXED)

Compare:

previous_version → new_version

Return:

{
"query": "Firdous",
"matches_before": 3,
"matches_after": 0,
"status": "success"
}

---

## 5. IMPACT SUMMARY (REQUIRED)

{
"removed": 2,
"redacted": 1,
"remaining": 97,
"impact_percent": 3
}

---

## 6. DOWNLOAD MODES

GET /api/datasets/:id/download?mode=clean

Modes:

* clean → only active rows
* redacted → include redacted rows
* full → include all rows + metadata

---

## 7. FRONTEND (FINAL UPGRADE)

Add:

1. Version Badge:
   "Version 3 (Latest)"

2. Version Selector:
   dropdown of versions

3. Before vs After Diff:

   * red rows → deleted
   * yellow highlight → redacted text

4. Impact Panel

5. Operation Log Panel:
   "Deleted 'Firdous' → 2 rows affected"

---

## 8. DEMO MODE

Auto-load:

[
"Firdous is CEO of X company",
"Firdous lives in Dhaka",
"Company X is in Bangladesh"
]

---

## 9. SUCCESS CRITERIA

User can:

1. Upload dataset
2. Apply delete or redact
3. See new version created
4. Compare versions visually
5. Verify removal
6. Download cleaned dataset
7. See operation log

---

## GOAL

This should feel like:

"Git for AI Training Data"

---

## FINAL NOTE

Focus on:

* clarity
* correctness
* visual impact

NOT:

* over-engineering

---

Confirm readiness for implementation.
