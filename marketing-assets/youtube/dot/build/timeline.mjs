// Turns measured voice-line durations into scene times. Pure: no I/O.
// CLI: node timeline.mjs <voiceDir> <film|short> > timeline.json   (durations via ffprobe)
export const FILM_IDS = ["l01","l02","l03","l04","l05","l06","l07","l08","l09","l10","l11","l12"];
export const SHORT_IDS = ["l01","l03","l05","l07","l10","l12"];

export function buildTimeline(durations, ids, { lead, gap, endCard, pauses = {} }) {
  const items = [];
  let t = lead;
  for (const id of ids) {
    const dur = durations[id];
    if (!(dur > 0)) throw new Error(`missing duration for ${id}`);
    items.push({ id, start: t, end: t + dur });
    t = t + dur + gap + (pauses[id] || 0);
  }
  const endCardStart = items[items.length - 1].end + gap;
  return { total: endCardStart + endCard, items, endCardStart };
}

// Breathing room after lines where the picture needs time (the fall, the network, the last stare).
export const OPTS = { lead: 3.0, gap: 1.1, endCard: 5.5, pauses: { l02: 0.6, l05: 1.6, l07: 0.8, l09: 0.8, l11: 0.6 } };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { execFileSync } = await import("node:child_process");
  const [voiceDir, which = "film"] = process.argv.slice(2);
  const ids = which === "short" ? SHORT_IDS : FILM_IDS;
  const durations = Object.fromEntries(ids.map((id) => [id, Number(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${voiceDir}/${id}.mp3`]).toString())]));
  console.log(JSON.stringify(buildTimeline(durations, ids, OPTS), null, 2));
}
