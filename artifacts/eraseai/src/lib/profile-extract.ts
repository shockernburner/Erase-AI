// Extract LinkedIn-style profile text from .pdf / .docx / .zip exports
// and split it into named sections for per-section risk analysis.

const MAX_TOTAL_CHARS = 200_000;

export interface ProfileSection {
  id: string;
  label: string;
  text: string;
}

const SECTION_HEADERS: { id: string; label: string; patterns: RegExp[] }[] = [
  { id: "headline", label: "Headline & summary", patterns: [/^summary$/i, /^about$/i, /^headline$/i] },
  { id: "experience", label: "Experience", patterns: [/^experience$/i, /^work experience$/i, /^positions?$/i] },
  { id: "education", label: "Education", patterns: [/^education$/i, /^academics?$/i] },
  { id: "skills", label: "Skills", patterns: [/^skills?$/i, /^top skills$/i, /^endorsements?$/i] },
  { id: "certifications", label: "Certifications", patterns: [/^certifications?$/i, /^licenses(?:\s*&\s*certifications)?$/i] },
  { id: "projects", label: "Projects", patterns: [/^projects?$/i] },
  { id: "publications", label: "Publications", patterns: [/^publications?$/i] },
  { id: "languages", label: "Languages", patterns: [/^languages?$/i] },
  { id: "volunteer", label: "Volunteer", patterns: [/^volunteer(?:ing)?$/i, /^volunteer experience$/i] },
  { id: "honors", label: "Honors & awards", patterns: [/^honou?rs(?:\s*(?:and|&)\s*awards)?$/i, /^awards?$/i] },
  { id: "recommendations", label: "Recommendations", patterns: [/^recommendations?(?:\s*received)?$/i] },
  { id: "activity", label: "Activity & posts", patterns: [/^activity$/i, /^posts?$/i, /^articles?$/i, /^shares?$/i] },
  { id: "contact", label: "Contact info", patterns: [/^contact(?:\s*info(?:rmation)?)?$/i] },
  { id: "interests", label: "Interests", patterns: [/^interests?$/i, /^causes?$/i] },
];

function detectSectionId(line: string): { id: string; label: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  for (const s of SECTION_HEADERS) {
    if (s.patterns.some((p) => p.test(trimmed))) {
      return { id: s.id, label: s.label };
    }
  }
  return null;
}

export function splitProfileSections(text: string): ProfileSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ProfileSection[] = [];
  let current: ProfileSection = { id: "intro", label: "Profile header", text: "" };

  for (const line of lines) {
    const hit = detectSectionId(line);
    if (hit) {
      if (current.text.trim().length > 0) sections.push({ ...current, text: current.text.trim() });
      current = { id: hit.id, label: hit.label, text: "" };
    } else {
      current.text += line + "\n";
    }
  }
  if (current.text.trim().length > 0) sections.push({ ...current, text: current.text.trim() });

  // De-duplicate id collisions by suffixing.
  const seen = new Map<string, number>();
  return sections
    .filter((s) => s.text.length > 8)
    .map((s) => {
      const n = (seen.get(s.id) ?? 0) + 1;
      seen.set(s.id, n);
      return n === 1 ? s : { ...s, id: `${s.id}-${n}`, label: `${s.label} (${n})` };
    });
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  // Vite handles the worker URL via the ?url import suffix.
  // We use the `mjs` build because pdfjs v4 ships ESM only.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join(" ");
    out.push(pageText);
    if (out.join("\n").length > MAX_TOTAL_CHARS) break;
  }
  return out.join("\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return String(result.value || "");
}

async function extractZip(file: File): Promise<string> {
  const fflate: any = await import("fflate");
  const buf = new Uint8Array(await file.arrayBuffer());
  const unzipped: Record<string, Uint8Array> = await new Promise((resolve, reject) => {
    fflate.unzip(buf, (err: Error | null, data: Record<string, Uint8Array>) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const parts: string[] = [];

  // LinkedIn data archives ship as many CSVs (Profile.csv, Positions.csv,
  // Education.csv, Skills.csv, Recommendations_Received.csv, ...). Concat
  // them with a synthetic section header so splitProfileSections() can
  // group results.
  const fileLabelMap: { match: RegExp; sectionLine: string }[] = [
    { match: /profile.*\.csv$/i, sectionLine: "About" },
    { match: /position|experience.*\.csv$/i, sectionLine: "Experience" },
    { match: /education.*\.csv$/i, sectionLine: "Education" },
    { match: /skill.*\.csv$/i, sectionLine: "Skills" },
    { match: /certification.*\.csv$/i, sectionLine: "Certifications" },
    { match: /project.*\.csv$/i, sectionLine: "Projects" },
    { match: /language.*\.csv$/i, sectionLine: "Languages" },
    { match: /recommendation.*\.csv$/i, sectionLine: "Recommendations" },
    { match: /share|post|article.*\.csv$/i, sectionLine: "Activity" },
    { match: /endorsement.*\.csv$/i, sectionLine: "Endorsements" },
    { match: /honor|award.*\.csv$/i, sectionLine: "Honors & awards" },
  ];

  const entries = Object.entries(unzipped);
  for (const [name, data] of entries) {
    if (data.length === 0) continue;
    const lower = name.toLowerCase();
    if (!/\.(csv|txt|md|json)$/.test(lower)) continue;
    const labeled = fileLabelMap.find((f) => f.match.test(lower));
    const text = decoder.decode(data);
    parts.push(`\n${labeled?.sectionLine ?? name}\n${text}`);
    if (parts.join("").length > MAX_TOTAL_CHARS) break;
  }
  return parts.join("\n");
}

async function extractPlainText(file: File): Promise<string> {
  return await file.text();
}

export interface ExtractResult {
  text: string;
  sections: ProfileSection[];
  warning?: string;
}

export async function extractProfileFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  let text = "";
  let warning: string | undefined;

  if (name.endsWith(".pdf")) {
    text = await extractPdf(file);
  } else if (name.endsWith(".docx")) {
    text = await extractDocx(file);
  } else if (name.endsWith(".zip")) {
    text = await extractZip(file);
  } else if (/\.(txt|md|csv|tsv|json|jsonl|log)$/.test(name)) {
    text = await extractPlainText(file);
  } else {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }

  if (text.length > MAX_TOTAL_CHARS) {
    text = text.slice(0, MAX_TOTAL_CHARS);
    warning = "TRUNCATED";
  }

  const sections = splitProfileSections(text);
  return { text, sections, warning };
}
