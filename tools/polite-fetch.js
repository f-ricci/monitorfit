// Polite page fetcher for building the monitor catalogue (Node 18+, no dependencies).
// - Refuses any brand whose collection policy in brands.js is not "automated", unless the caller passes allowBrand.
// - Reads robots.txt once per host and skips disallowed paths for its user agent.
// - Spaces request starts to the same host by at least minDelayMs, or the host's Crawl-delay if longer.
// - Runs up to `concurrency` requests per host at once, adapting: every 429, 5xx or network error halves the
//   parallel requests and pauses the whole host (Retry-After if given, else 10 s, 20 s, 40 s, ...);
//   each run of 20 clean responses adds one back, up to `concurrency`. Gives up on a URL after maxRetries.
// - Caches every 200 response on disk, so a re-run never fetches the same URL twice.
//
// Usage: node tools/polite-fetch.js <brandId> <url> [--allow-brand]

"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "pages");
const UA = "monitor-fit-catalogue/0.1 (personal research; one request per host every few seconds)";

function loadBrands() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "brands.js"), "utf8") + "\nthis.BRANDS = BRANDS;", ctx);
  return ctx.BRANDS;
}

// robots.txt: the group for our user agent, else "*"; longest matching rule wins, Allow wins a tie
function parseRobots(text) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent) { cur = { agents: [], rules: [], delay: 0 }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "allow" || key === "disallow") { if (val) cur.rules.push({ allow: key === "allow", path: val }); }
    else if (key === "crawl-delay") cur.delay = parseFloat(val) || 0;
  }
  const mine = groups.find(g => g.agents.some(a => a !== "*" && UA.toLowerCase().startsWith(a)))
    || groups.find(g => g.agents.includes("*"));
  return mine || { rules: [], delay: 0 };
}

function ruleMatches(rule, p) {
  const re = new RegExp("^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return re.test(p);
}

function allowed(robots, urlPath) {
  let best = null;
  for (const r of robots.rules) {
    if (!ruleMatches(r.path, urlPath)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

class PoliteFetcher {
  constructor({ minDelayMs = 5000, maxRetries = 4, concurrency = 1 } = {}) {
    this.minDelayMs = minDelayMs;
    this.maxRetries = maxRetries;
    this.concurrency = concurrency;
    this.robots = new Map();
    this.delays = new Map();
    this.hosts = new Map();
    fs.mkdirSync(CACHE, { recursive: true });
  }

  host(origin) {
    if (!this.hosts.has(origin))
      this.hosts.set(origin, { active: 0, limit: Math.min(2, this.concurrency), lastStart: 0, pausedUntil: 0, okStreak: 0 });
    return this.hosts.get(origin);
  }

  // the promise is stored, so parallel first requests to a host share one robots.txt fetch
  robotsFor(origin) {
    if (!this.robots.has(origin)) this.robots.set(origin, this.loadRobots(origin));
    return this.robots.get(origin);
  }

  async loadRobots(origin) {
    let rules = { rules: [], delay: 0 };
    const res = await this.raw(origin + "/robots.txt");
    if (res && res.status === 200) rules = parseRobots(res.body);
    // 401/403 on robots.txt means "keep out" by convention; 404 means no rules
    else if (res && (res.status === 401 || res.status === 403)) rules = { rules: [{ allow: false, path: "/" }], delay: 0 };
    this.delays.set(origin, rules.delay);
    return rules;
  }

  // wait for a free slot, the end of any pause, and the gap since the last request start
  async acquire(origin, delayS) {
    const h = this.host(origin), gap = Math.max(this.minDelayMs, (delayS || 0) * 1000);
    for (;;) {
      const now = Date.now();
      const wait = Math.max(h.pausedUntil - now, h.lastStart + gap - now);
      if (h.active < h.limit && wait <= 0) break;
      await sleep(Math.max(wait, 20));
    }
    h.active++;
    h.lastStart = Date.now();
    return h;
  }

  backOff(h, waitS, why) {
    h.limit = Math.max(1, Math.floor(h.limit / 2));
    h.okStreak = 0;
    h.pausedUntil = Math.max(h.pausedUntil, Date.now() + waitS * 1000);
    console.error(`  ${why}; backing off ${Math.round(waitS)} s, ${h.limit} at a time`);
  }

  speedUp(h) {
    if (++h.okStreak >= 20 && h.limit < this.concurrency) { h.limit++; h.okStreak = 0; }
  }

  async raw(url) {
    const origin = new URL(url).origin;
    const delay = this.delays.get(origin) || 0;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const h = await this.acquire(origin, delay);
      let res, body;
      try { res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" }); body = await res.text(); }
      catch (e) { res = null; }
      h.active--;
      if (res && res.status !== 429 && res.status < 500) { this.speedUp(h); return { status: res.status, body }; }
      // Retry-After if the server gave one, else 10 s, 20 s, 40 s, ...
      const ra = res && res.headers.get("retry-after");
      const waitS = ra ? (isNaN(+ra) ? Math.max(0, (Date.parse(ra) - Date.now()) / 1000) : +ra) : 10 * 2 ** attempt;
      this.backOff(h, waitS, `${res ? res.status : "network error"} on ${url.replace(/shopname=[^&]*/, "shopname=…")}`);
    }
    return null;
  }

  // returns {status, body, cached} or {skipped: reason}
  async get(url) {
    const file = path.join(CACHE, crypto.createHash("sha256").update(url).digest("hex"));
    if (fs.existsSync(file)) return { status: 200, body: fs.readFileSync(file, "utf8"), cached: true };
    const u = new URL(url);
    const robots = await this.robotsFor(u.origin);
    if (!allowed(robots, u.pathname + u.search)) return { skipped: "disallowed by robots.txt" };
    const res = await this.raw(url);
    if (!res) return { skipped: "gave up after back-off" };
    if (res.status === 200) fs.writeFileSync(file, res.body);
    return { status: res.status, body: res.body, cached: false };
  }
}

// a brand may only be collected automatically if brands.js says so, or the caller explicitly overrides
function checkBrand(brandId, allowBrand) {
  const b = loadBrands().find(x => x.id === brandId);
  if (!b) return `unknown brand "${brandId}"`;
  if (b.collection !== "automated" && !allowBrand) return `${b.name}: collection policy is "${b.collection}" (terms: ${b.terms ? b.terms.automatedAccess : "unknown"}); not fetching`;
  return null;
}

module.exports = { PoliteFetcher, parseRobots, allowed, checkBrand, loadBrands };

if (require.main === module) {
  const [brandId, url] = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const allowBrand = process.argv.includes("--allow-brand");
  const stop = checkBrand(brandId, allowBrand);
  if (stop) { console.error(stop); process.exit(2); }
  new PoliteFetcher().get(url).then(r => {
    if (r.skipped) { console.error("skipped: " + r.skipped); process.exit(1); }
    console.log(`${r.status}${r.cached ? " (cache)" : ""} ${r.body.length} bytes`);
  });
}
