import sampleCsvText from "../../public/sample_customer_feedback.csv?raw";

export const SAMPLE_DATASET_FILENAME = "sample_customer_feedback.csv";
export const SAMPLE_DATASET_HEADER = "feedback";

function parseSingleColumnCsv(text: string): { header: string; rows: string[] } {
  const lines = text.split(/\r\n|\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const header = unquote(lines[0] ?? "");
  const rows = lines.slice(1).map(unquote);
  return { header, rows };
}

function unquote(line: string): string {
  if (line.length >= 2 && line.startsWith('"') && line.endsWith('"')) {
    return line.slice(1, -1).replace(/""/g, '"');
  }
  return line;
}

const parsed = parseSingleColumnCsv(sampleCsvText);

export const SAMPLE_FEEDBACK_ROWS: readonly string[] = parsed.rows;

if (parsed.header !== SAMPLE_DATASET_HEADER) {
  throw new Error(
    `sample_customer_feedback.csv header must be "${SAMPLE_DATASET_HEADER}", got "${parsed.header}"`
  );
}
