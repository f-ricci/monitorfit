// Pick the computer monitors (Icecat category 222) out of a downloaded Open Icecat index and write the import list.
// The index is downloaded by hand with your own Icecat login (curl -u <user>), into .cache/icecat/.
//
// Usage: node tools/icecat-index.js [index.xml.gz] [--all]
//   default index: .cache/icecat/on_market.index.xml.gz
//   --all keeps products that are no longer on the market too
// Writes tools/icecat-list.json as [{icecatId, supplierId, code, name, updated}], newest first.

"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");

const MONITORS_CATID = "222";
const ROOT = path.join(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith("--")) || path.join(ROOT, ".cache", "icecat", "on_market.index.xml.gz");
  const all = args.includes("--all");
  const input = fs.createReadStream(file).pipe(/\.gz$/.test(file) ? zlib.createGunzip() : new (require("stream").PassThrough)());
  const out = [];
  let seen = 0;
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    if (!line.startsWith("<file ")) continue;
    seen++;
    if (line.indexOf(' Catid="' + MONITORS_CATID + '"') < 0) continue;
    const a = {};
    line.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { a[k] = v; });
    if (!all && a.On_Market !== "1") continue;
    out.push({ icecatId: +a.Product_ID, supplierId: +a.Supplier_id, code: a.Prod_ID, name: a.Model_Name, updated: a.Updated });
  }
  out.sort((x, y) => y.updated.localeCompare(x.updated));
  fs.writeFileSync(path.join(__dirname, "icecat-list.json"), JSON.stringify(out, null, 1) + "\n");
  console.log(`${seen} products in the index, ${out.length} monitors written to tools/icecat-list.json`);
}

main();
