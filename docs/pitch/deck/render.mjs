import { createRequire } from "node:module";
const { chromium } = createRequire("/home/user/Erase-AI/package.json")("playwright-core");
const dir = process.argv[2];
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium", args:["--no-sandbox"] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
await p.goto("file://"+dir+"/deck.html"); await p.waitForTimeout(600);
await p.pdf({ path: dir+"/EraseAI_preseed_deck.pdf", width:"1920px", height:"1080px", printBackground:true, preferCSSPageSize:true });
const n = await p.$$eval(".slide", s=>s.length);
for (let i=0;i<n;i++){ const el=(await p.$$(".slide"))[i]; await el.screenshot({ path:`${dir}/s${String(i+1).padStart(2,"0")}.png` }); }
// overflow check: any element extending beyond its slide
const bad = await p.$$eval(".slide", ss=>ss.map((s,i)=>{const r=s.getBoundingClientRect(); const over=[...s.querySelectorAll("*")].filter(e=>{const q=e.getBoundingClientRect(); return q.bottom>r.bottom-2||q.right>r.right-2;}).length; return over?i+1:0}).filter(Boolean));
console.log("slides:",n,"| slides with overflow:",bad);
await b.close();
