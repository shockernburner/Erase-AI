import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// Checks the tracking against the built site (build it first). Run: node marketing-assets/google-ads/build/verify_tracking.mjs
// Covers: consent default denied, Accept / Decline / Global Privacy Control, ad campaign carried into the
// Chrome Web Store and Google Play links, and the store-click events. External hosts are stubbed.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const root = path.join(repo, "artifacts/eraseai/dist/public");
const types={".js":"text/javascript",".css":"text/css",".html":"text/html",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".json":"application/json",".webp":"image/webp"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];let f=path.join(root,u);
 if(u.startsWith("/api/")){r.statusCode=401;r.setHeader("content-type","application/json");return r.end("{}");}
 if(u.startsWith("/_pages")||!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(root,u==="/ai-firewall"?"_pages/ai-firewall.html":"index.html");
 r.setHeader("content-type",types[path.extname(f)]||"application/octet-stream");r.end(fs.readFileSync(f));}).listen(4396);
const b=await chromium.launch({executablePath:process.env.CHROMIUM||"/opt/pw-browsers/chromium"});
const ok=(c,m)=>console.log(c?"PASS":"FAIL",m);
const dl=(p)=>p.evaluate(()=>(window.dataLayer||[]).map(a=>Array.from(a)));
async function mk(extra){const ctx=await b.newContext({viewport:{width:1440,height:810},...extra});
 await ctx.route(/googletagmanager\.com|google-analytics\.com|chromewebstore\.google\.com|play\.google\.com/,r=>r.fulfill({status:200,contentType:"text/html",body:"ok"}));
 return ctx;}
// 1 + 2 + 3: ad visit, accept, store clicks
let ctx=await mk({}); let p=await ctx.newPage();
await p.goto("http://localhost:4396/ai-firewall?utm_source=google&utm_medium=cpc&utm_campaign=sg_search_ai_dlp&utm_term=ai%20dlp&gclid=abc");
await p.waitForTimeout(1500);
let d=await dl(p);
ok(d.some(a=>a[0]==="consent"&&a[1]==="default"&&a[2].analytics_storage==="denied"&&a[2].ad_storage==="denied"),"consent default denied");
ok(d.some(a=>a[0]==="config"&&a[1]==="G-K82G1MZ7SE"),"config with measurement ID");
ok(await p.evaluate(()=>[...document.scripts].some(s=>s.src.includes("googletagmanager.com/gtag/js?id=G-K82G1MZ7SE"))),"gtag.js injected");
ok(await p.getByRole("region",{name:/cookie/i}).count()===1,"banner shown");
ok((await ctx.cookies()).every(c=>!c.name.startsWith("_ga")),"no _ga cookie before choice");
await p.getByRole("button",{name:"Accept"}).click(); await p.waitForTimeout(300);
d=await dl(p);
const upd=d.find(a=>a[0]==="consent"&&a[1]==="update");
ok(upd&&upd[2].analytics_storage==="granted"&&upd[2].ad_storage==="granted"&&upd[2].ad_personalization==="denied","accept grants analytics+ad measurement, not personalisation");
ok(await p.getByRole("region",{name:/cookie/i}).count()===0,"banner gone after accept");
const chromeHref=await p.locator('a[href*="chromewebstore.google.com"]').first().getAttribute("href");
console.log("  chrome href:",chromeHref);
ok(/utm_source=google/.test(chromeHref)&&/utm_medium=cpc/.test(chromeHref)&&/utm_campaign=sg_search_ai_dlp/.test(chromeHref)&&/utm_content=seo-nav/.test(chromeHref),"Chrome link carries the ad campaign");
const playHref=await p.locator('a[href*="play.google.com"]').first().getAttribute("href");
console.log("  play href:",decodeURIComponent(playHref));
ok(/utm_source=google&utm_medium=cpc&utm_campaign=sg_search_ai_dlp/.test(decodeURIComponent(playHref)),"Play referrer carries the ad campaign");
await p.evaluate(()=>document.addEventListener("click",e=>e.preventDefault(),true));
await p.locator('a[href*="chromewebstore.google.com"]').first().click();
d=await dl(p);
const ce=d.find(a=>a[0]==="event"&&a[1]==="click_chrome_store");
ok(ce&&ce[2].campaign==="sg_search_ai_dlp"&&ce[2].placement==="seo-nav","click_chrome_store event "+JSON.stringify(ce&&ce[2]));
await p.reload(); await p.waitForTimeout(800);
await p.evaluate(()=>document.addEventListener("click",e=>e.preventDefault(),true));
ok(await p.getByRole("region",{name:/cookie/i}).count()===0,"choice remembered after reload");
await p.locator('a[href*="play.google.com"]').first().click();
d=await dl(p); ok(d.some(a=>a[0]==="event"&&a[1]==="click_google_play"),"click_google_play event");
await ctx.close();
// 4: no ad: default tags unchanged
ctx=await mk({}); p=await ctx.newPage(); await p.goto("http://localhost:4396/ai-firewall"); await p.waitForTimeout(1200);
const h=await p.locator('a[href*="chromewebstore.google.com"]').first().getAttribute("href");
ok(/utm_source=site/.test(h)&&/utm_campaign=extension/.test(h),"organic visit keeps the existing tags: "+h);
await p.getByRole("button",{name:"Decline"}).click(); await p.waitForTimeout(200);
d=await dl(p); ok(d.some(a=>a[0]==="consent"&&a[1]==="update"&&a[2].analytics_storage==="denied"),"decline keeps everything denied"); await ctx.close();
// 5: Global Privacy Control: no banner
ctx=await mk({}); await ctx.addInitScript(()=>{Object.defineProperty(navigator,"globalPrivacyControl",{value:true});});
p=await ctx.newPage(); await p.goto("http://localhost:4396/ai-firewall"); await p.waitForTimeout(1200);
ok(await p.getByRole("region",{name:/cookie/i}).count()===0,"GPC: no banner"); d=await dl(p);
ok(d.some(a=>a[0]==="consent"&&a[1]==="default"&&a[2].analytics_storage==="denied"),"GPC: stays denied"); await ctx.close();
// 6: landing: store link in a plan card
ctx=await mk({}); p=await ctx.newPage(); await p.goto("http://localhost:4396/pricing?utm_source=google&utm_medium=cpc&utm_campaign=hk_zh"); await p.waitForTimeout(2500);
await p.getByRole("button",{name:"Android app"}).first().click(); await p.waitForTimeout(300);
d=await dl(p); const pe=d.find(a=>a[0]==="event"&&a[1]==="click_google_play"); ok(pe&&pe[2].campaign==="hk_zh","landing card button: click_google_play "+JSON.stringify(pe&&pe[2]));
await b.close(); srv.close();
