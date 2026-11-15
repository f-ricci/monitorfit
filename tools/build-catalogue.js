// Build catalogue/index.json, the compact list the page loads: one row per drawable monitor with only the
// fields the drawing and the pickers use. Hand-made records (monitors-data.js) come first and keep their ids;
// an Icecat record with the same id replaces the hand-made values.
//
// Usage: node tools/build-catalogue.js [icecat file]   (default .cache/icecat/monitors-icecat.js)

"use strict";
const fs = require("fs");
const path = require("path");
const { toDrawing } = require("../monitor-model.js");
const { MONITORS } = require("../monitors-data.js");

const ROOT = path.join(__dirname, "..");
// the id is left out when it is the slug of the name (all but a few hand-made rows); then it follows the fields
const FIELDS = ["name", "bw", "bh", "pw", "ph", "sd", "R", "res", "diag", "est"];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const file = process.argv[2] || path.join(ROOT, ".cache", "icecat", "monitors-icecat.js");
const { MONITORS_ICECAT } = require(path.resolve(file));
const generated = fs.readFileSync(file, "utf8").match(/on (\d{4}-\d{2}-\d{2})/)[1];

// a hand-made monitor matches the Icecat record whose id, model or codes contain one of its model codes
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const used = new Set();
const hand = MONITORS.map(h => {
  const codes = h.modelCodes.map(norm);
  const ice = MONITORS_ICECAT.find(m => m.brand.toLowerCase() === h.brand.toLowerCase() &&
    [m.id, m.model].concat(m.modelCodes).some(x => codes.some(c => norm(x).includes(c))));
  if (!ice) return h;
  used.add(ice);
  return Object.assign({}, ice, { id: h.id, model: h.model });
});
const rest = MONITORS_ICECAT.filter(m => !used.has(m))
  .sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, "en", { numeric: true }));

// whole millimetres are plenty for drawing and labels
const r0 = v => Math.round(v);
const rows = [];
let skipped = 0;
for (const m of hand.concat(rest)) {
  const d = toDrawing(m);
  if (!d) { skipped++; continue; }
  const name = m.model.toLowerCase().startsWith(m.brand.toLowerCase()) ? m.model : m.brand + " " + m.model;
  const row = [name, r0(d.bw), r0(d.bh), r0(d.pw), r0(d.ph), r0(d.sd), d.R, d.res.replace(" × ", "x"), m.panel.diagonalIn || 0, d.est];
  if (slug(name) !== d.id) row.push(d.id);
  rows.push(row);
}

const out = {
  notice: "Database Right data-sheet " + generated.slice(0, 4) + " Icecat. All rights reserved. Provided \"as is\", without warranty of any kind.",
  license: "https://iceclog.com/open-content-license/ (not for machine-learning training)",
  changes: "Only drawing fields kept; sizes rounded to whole mm; rows with est=1 have screen sizes worked out from diagonal and resolution; a few rows are hand-made, not from Icecat.",
  generated,
  fields: FIELDS,
  rows
};
fs.mkdirSync(path.join(ROOT, "catalogue"), { recursive: true });
const dest = path.join(ROOT, "catalogue", "index.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`${rows.length} monitors in ${path.relative(process.cwd(), dest)} (${Math.round(fs.statSync(dest).size / 1024)} KB); ${skipped} without drawing sizes left out`);
