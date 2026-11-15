// Import monitors from Open Icecat (the licensed product-data feed) into the catalogue model.
// Requests go through PoliteFetcher (paced, backed off, cached), every record is checked with validateMonitor,
// and the result is written to .cache/icecat/monitors-icecat.js; monitors-data.js is never touched.
//
// Usage: node tools/icecat-import.js [list.json] [--user <icecat username>] [--brands dell,hp] [--limit N]
//                                    [--parallel 4] [--gap-ms 250]
//   list.json: [{"brand": "Dell", "code": "U2724D"}, ...] or [{"icecatId": 117352846, "supplierId": 292, ...}, ...]
//     (default tools/icecat-list.json, written by tools/icecat-index.js); entries with the same brand and
//     model name are regional variants, so only the first (newest) of each is fetched
//   --brands keeps only those brands.js ids (matched on icecatSupplierId); --limit stops after N fetched
//   --parallel caps requests in flight (the fetcher starts at 2 and halves on any back-off notice);
//   --gap-ms is the minimum time between request starts. Responses are cached, so a re-run resumes.
//   the username can also come from ICECAT_USER

"use strict";
const fs = require("fs");
const path = require("path");
const { PoliteFetcher } = require("./polite-fetch.js");
const { validateMonitor, toDrawing } = require("../monitor-model.js");
const { MONITORS } = require("../monitors-data.js");
const { loadBrands } = require("./polite-fetch.js");

const ROOT = path.join(__dirname, "..");
const API = "https://live.icecat.biz/api";
const TODAY = new Date().toISOString().slice(0, 10);

// Icecat feature ids (stable across products in category 222, "Computer Monitors")
const F = {
  diagonal: 944, resolution: 1585, aspect: 11417, panelType: 15285, antiGlare: 10443, brightness: 36441,
  response: 1516, contrast: 34, refresh: 7450, pixelPitch: 32, ppi: 13246, areaW: 91, areaH: 92, bitDepth: 1550,
  gamutStd: 46927, gamut: 14575, srgb: 28703, curvature: 42456,
  hdmiQty: 3566, hdmiVer: 5452, dpQty: 6611, dpVer: 11111,
  speakers: 2433, camera: 8074,
  vesa: 4037, heightAdj: 25138, pivot: 2764, swivel: 1956, tilt: 2077,
  powerTyp: 445, powerMax: 9137, powerStandby: 2036,
  wStand: 4156, dStand: 4179, hStand: 4178, kgStand: 19017,
  w: 12576, d: 12577, h: 12574, kg: 12573,
  bezelSide: 8038, bezelTop: 8039, bezelBottom: 8040
};

function features(data) {
  const byId = new Map(), byName = [];
  for (const g of data.FeaturesGroups || []) for (const f of g.Features || []) {
    const rec = { value: String(f.Value), unit: (f.Feature.Measure && f.Feature.Measure.Signs && f.Feature.Measure.Signs._) || "", name: f.Feature.Name.Value };
    byId.set(+f.Feature.ID, rec);
    byName.push(rec);
  }
  const raw = id => byId.get(id);
  const str = id => raw(id) ? raw(id).value : undefined;
  const num = id => { const v = str(id); const n = v && parseFloat(v); return n > 0 ? n : undefined; };
  const yes = id => str(id) === "Y" ? true : str(id) === "N" ? false : undefined;
  const scaled = (id, table) => { const r = raw(id), n = num(id); if (n === undefined) return; const k = table[r.unit]; return k === undefined ? undefined : +(n * k).toFixed(2); };
  const mm = id => scaled(id, { mm: 1, cm: 10, m: 1000 });
  const kg = id => scaled(id, { g: 0.001, kg: 1 });
  const range = id => { const m = (str(id) || "").match(/^(-?[\d.]+)\s*-\s*(-?[\d.]+)$/); return m ? [+m[1], +m[2]] : undefined; };
  const named = re => byName.find(r => re.test(r.name));
  return { str, num, yes, mm, kg, range, named };
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const prune = o => { for (const k of Object.keys(o)) if (o[k] === undefined || (o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) && !Object.keys(prune(o[k])).length)) delete o[k]; return o; };

// "DELL UltraSharp U2724D computer monitor" -> "UltraSharp U2724D"
function shortTitle(gi) {
  const t = gi.TitleInfo && gi.TitleInfo.GeneratedIntTitle;
  return t && t.replace(new RegExp("^" + gi.Brand + "\\s+", "i"), "").replace(/\s+computer monitor$/i, "").trim();
}

function toMonitor(data, want) {
  const gi = data.GeneralInfo, f = features(data);
  const code = gi.BrandPartCode;
  const iceBrand = gi.BrandInfo && gi.BrandInfo.BrandName || gi.Brand;
  const known = BRANDS.find(b => b.name.toLowerCase() === String(iceBrand).toLowerCase());
  const brand = want.brand || (known ? known.name : iceBrand);
  const codes = [...new Set([want.code, code].filter(Boolean))];
  const existing = MONITORS.find(m => m.brand.toLowerCase() === brand.toLowerCase() && m.modelCodes.some(c => codes.some(x => x.toLowerCase() === c.toLowerCase())));
  const res = (f.str(F.resolution) || "").match(/^(\d+)\s*x\s*(\d+)$/);
  const curve = (f.str(F.curvature) || "").match(/^(\d+)\s*R$/i);
  const pitch = f.str(F.pixelPitch) && parseFloat(f.str(F.pixelPitch));
  const gamut = {};
  if (f.num(F.srgb)) gamut.sRGB = f.num(F.srgb);
  if (f.str(F.gamutStd) && f.num(F.gamut)) gamut[f.str(F.gamutStd)] = f.num(F.gamut);
  const hMax = f.mm(F.hStand), adj = f.mm(F.heightAdj);
  const vesa = (f.str(F.vesa) || "").match(/^(\d+)\s*x\s*(\d+)$/);
  const usbPd = f.named(/power delivery/i);
  // a port count must be a whole number; Icecat occasionally carries values like "0.5"
  const qty = id => { const n = f.num(id); return Number.isInteger(n) && n <= 8 ? n : n ? 1 : 0; };
  const inputs = [];
  if (qty(F.hdmiQty)) inputs.push(...Array(qty(F.hdmiQty)).fill("HDMI" + (f.str(F.hdmiVer) ? " " + f.str(F.hdmiVer) : "")));
  if (qty(F.dpQty)) inputs.push(...Array(qty(F.dpQty)).fill("DP" + (f.str(F.dpVer) ? " " + f.str(F.dpVer) : "")));
  const tb = f.named(/^Thunderbolt version$/i);
  if (tb) inputs.push("Thunderbolt " + tb.value);

  const m = prune({
    id: existing ? existing.id : slug(brand + "-" + (shortTitle(gi) || want.code || code).replace(new RegExp("^" + brand + "\\s+", "i"), "")),
    brand: existing ? existing.brand : brand,
    model: existing ? existing.model : shortTitle(gi) || want.code || code,
    // the code we asked for, then the brand's part number if it differs
    modelCodes: codes,
    family: gi.ProductFamily && gi.ProductFamily.Value || undefined,
    released: /^\d{4}-\d{2}/.test(gi.ReleaseDate || "") ? gi.ReleaseDate.slice(0, 7) : undefined,
    panel: {
      diagonalIn: f.num(F.diagonal), type: f.str(F.panelType), aspect: f.str(F.aspect),
      resolution: res ? [+res[1], +res[2]] : undefined, ppi: f.num(F.ppi),
      curveRadiusMm: curve ? +curve[1] : undefined,
      activeAreaMm: f.mm(F.areaW) && f.mm(F.areaH) ? [f.mm(F.areaW), f.mm(F.areaH)] : undefined,
      pixelPitchMm: pitch > 0 ? pitch : undefined, refreshHz: f.num(F.refresh), responseMs: f.num(F.response),
      bitDepth: f.num(F.bitDepth), brightnessNits: f.num(F.brightness), contrast: f.str(F.contrast),
      colorGamut: Object.keys(gamut).length ? gamut : undefined,
      coating: f.yes(F.antiGlare) ? "anti-glare" : undefined
    },
    dimensions: {
      bodyMm: f.mm(F.w) && f.mm(F.h) ? { w: f.mm(F.w), h: f.mm(F.h), d: f.mm(F.d) } : undefined,
      // Icecat's "Height (with stand)" is the stand fully raised
      withStandMm: f.mm(F.wStand) ? { w: f.mm(F.wStand), hMax: hMax, hMin: hMax && adj ? +(hMax - adj).toFixed(2) : undefined, d: f.mm(F.dStand) } : undefined,
      bezelMm: { top: f.mm(F.bezelTop), side: f.mm(F.bezelSide), bottom: f.mm(F.bezelBottom) }
    },
    ergonomics: {
      tiltDeg: f.range(F.tilt), swivelDeg: f.range(F.swivel), pivot: f.yes(F.pivot), heightAdjustMm: adj,
      vesaMm: vesa ? [+vesa[1], +vesa[2]] : undefined
    },
    weightKg: { panel: f.kg(F.kg), withStand: f.kg(F.kgStand) },
    connectivity: {
      inputs: inputs.length ? inputs : undefined,
      usbcPowerW: usbPd && parseFloat(usbPd.value) > 0 ? parseFloat(usbPd.value) : undefined,
      kvm: f.named(/KVM/i) ? f.named(/KVM/i).value === "Y" : undefined,
      ethernet: f.named(/^Ethernet LAN$/i) ? f.named(/^Ethernet LAN$/i).value === "Y" : undefined,
      daisyChain: f.named(/daisy.?chain/i) ? f.named(/daisy.?chain/i).value === "Y" : undefined
    },
    power: { typicalW: f.num(F.powerTyp), maxW: f.num(F.powerMax), standbyW: f.num(F.powerStandby) },
    audio: { speakers: f.yes(F.speakers), webcam: f.yes(F.camera) },
    sources: [{ id: "s1", kind: "catalogue", url: API + "?lang=EN&icecat_id=" + gi.IcecatId, checked: TODAY }]
  });

  m.provenance = {};
  for (const p of ["panel.activeAreaMm", "panel.curveRadiusMm", "dimensions.bodyMm", "dimensions.withStandMm"])
    if (p.split(".").reduce((a, k) => a && a[k], m) !== undefined) m.provenance[p] = { source: "s1", quality: "spec" };
  // no lit area listed: work it out from the diagonal and the pixel ratio
  if (m.panel && !m.panel.activeAreaMm && m.panel.diagonalIn && m.panel.resolution) {
    const [rw, rh] = m.panel.resolution, k = m.panel.diagonalIn * 25.4 / Math.hypot(rw, rh);
    m.panel.activeAreaMm = [+(rw * k).toFixed(1), +(rh * k).toFixed(1)];
    m.provenance["panel.activeAreaMm"] = { quality: "estimated", note: "worked out from diagonal and resolution" };
  }
  return m;
}

const BRANDS = loadBrands();
const opt = (args, name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  const args = process.argv.slice(2);
  const ui = args.indexOf("--user");
  const user = ui >= 0 ? args[ui + 1] : process.env.ICECAT_USER;
  if (!user) { console.error("set ICECAT_USER or pass --user <name>"); process.exit(2); }
  const listFile = args.find((a, i) => !a.startsWith("--") && !/^--(user|brands|limit|parallel|gap-ms)$/.test(args[i - 1])) || path.join(__dirname, "icecat-list.json");
  const limit = +opt(args, "--limit") || Infinity;
  const brandIds = opt(args, "--brands") ? opt(args, "--brands").split(",") : null;
  const supplierName = {};
  for (const b of BRANDS) if (b.icecatSupplierId) supplierName[b.icecatSupplierId] = b.name;
  if (brandIds) for (const id of brandIds) if (!BRANDS.some(b => b.id === id && b.icecatSupplierId)) { console.error(`brand "${id}" has no icecatSupplierId in brands.js`); process.exit(2); }
  const wantedSuppliers = brandIds && BRANDS.filter(b => brandIds.includes(b.id)).map(b => b.icecatSupplierId);

  // one entry per brand and model name: the rest are regional variants of the same hardware
  const seenNames = new Set();
  const list = JSON.parse(fs.readFileSync(listFile, "utf8")).filter(w => {
    if (wantedSuppliers && !wantedSuppliers.includes(w.supplierId)) return false;
    if (!w.name) return true;
    const key = w.supplierId + "|" + w.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  }).slice(0, limit);
  const parallel = +opt(args, "--parallel") || 4, gapMs = opt(args, "--gap-ms") !== undefined ? +opt(args, "--gap-ms") : 250;
  console.log(`${list.length} products to look up; at least ${Math.ceil(list.length * gapMs / 60000)} min at one start every ${gapMs} ms, up to ${parallel} at a time (cached ones are instant)`);

  // fetch in parallel; results are handled afterwards in list order, so the report and duplicate check don't depend on timing
  const fetcher = new PoliteFetcher({ minDelayMs: gapMs, concurrency: parallel });
  const results = new Array(list.length);
  let next = 0, done = 0;
  const started = Date.now();
  async function worker() {
    while (next < list.length) {
      const i = next++, want = list[i];
      const url = want.icecatId
        ? `${API}?lang=EN&shopname=${encodeURIComponent(user)}&icecat_id=${want.icecatId}`
        : `${API}?lang=EN&shopname=${encodeURIComponent(user)}&Brand=${encodeURIComponent(want.brand)}&ProductCode=${encodeURIComponent(want.code)}`;
      results[i] = await fetcher.get(url);
      if (++done % 20 === 0) console.log(`  ${done}/${list.length} fetched, ${Math.round((Date.now() - started) / 1000)} s`);
    }
  }
  await Promise.all(Array.from({ length: parallel }, worker));

  const out = [], report = {};
  const ids = new Set();
  list.forEach((want, i) => {
    const res = results[i];
    const label = want.brand || supplierName[want.supplierId] || "supplier " + want.supplierId;
    const r = report[label] || (report[label] = { collected: [], skipped: [] });
    if (res.skipped) { r.skipped.push(`${want.code}: ${res.skipped}`); return; }
    let json;
    try { json = JSON.parse(res.body); } catch (e) { r.skipped.push(`${want.code}: HTTP ${res.status}, not JSON`); return; }
    if (json.msg !== "OK") { r.skipped.push(`${want.code}: ${json.Message || json.Error || "HTTP " + res.status}`); return; }
    let m;
    // one odd record must not stop the run
    try { m = toMonitor(json.data, want); } catch (e) { r.skipped.push(`${want.code}: could not map (${e.message})`); return; }
    const errs = validateMonitor(m);
    if (errs.length) { r.skipped.push(`${want.code}: invalid (${errs.join("; ")})`); return; }
    if (ids.has(m.id)) { r.skipped.push(`${want.code}: same id as an earlier record (${m.id})`); return; }
    ids.add(m.id);
    const est = Object.keys(m.provenance).filter(k => m.provenance[k].quality === "estimated");
    r.collected.push(m.id + (toDrawing(m) ? "" : " (missing sizes for drawing)") + (est.length ? " (estimated: " + est.join(", ") + ")" : ""));
    out.push(m);
  });

  const file = write(out);
  for (const [brand, r] of Object.entries(report)) {
    console.log(`${brand}: ${r.collected.length} collected, ${r.skipped.length} skipped`);
    if (list.length <= 50) r.collected.forEach(x => console.log("  + " + x));
    r.skipped.slice(0, 30).forEach(x => console.log("  - " + x));
    if (r.skipped.length > 30) console.log(`  - ... and ${r.skipped.length - 30} more`);
  }
  console.log(`wrote ${out.length} monitors to ${path.relative(process.cwd(), file)}`);
}

function write(out) {
  // the full records stay out of the repo; tools/build-catalogue.js turns them into catalogue/index.json
  const file = path.join(ROOT, ".cache", "icecat", "monitors-icecat.js");
  fs.writeFileSync(file,
    "// Generated by tools/icecat-import.js from Open Icecat on " + TODAY + ". Do not edit by hand; re-run the import.\n" +
    "// Database Right data-sheet " + TODAY.slice(0, 4) + " Icecat. All rights reserved. Provided \"as is\", without warranty of any kind.\n" +
    "// Licensed under the Open Icecat Open Content License (https://iceclog.com/open-content-license/); not for machine-learning training.\n" +
    "// Changes: units converted to mm and kg; activeAreaMm marked \"estimated\" is worked out from diagonal and resolution.\n\n" +
    "/** @type {import(\"./monitor-model.js\").Monitor[]} */\n" +
    "var MONITORS_ICECAT = " + JSON.stringify(out, null, 2) + ";\n\n" +
    "if (typeof module !== \"undefined\" && module.exports) module.exports = { MONITORS_ICECAT: MONITORS_ICECAT };\n");
  return file;
}

main();
