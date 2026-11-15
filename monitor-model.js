// Monitor catalogue model. Plain JS with JSDoc types, so editors and `tsc --checkJs` type-check it without a build step.
// Units live in the key names (Mm, Kg, Hz, W). A value that is unknown is left out, never set to 0.

/** @typedef {"current"|"discontinued"|"announced"} MonitorStatus */
/** @typedef {"spec"|"measured"|"estimated"} ValueQuality spec = manufacturer sheet, measured = independent review, estimated = worked out (e.g. from diagonal and ratio) */
/** @typedef {"manufacturer"|"review"|"catalogue"|"retailer"} SourceKind */

/**
 * @typedef {Object} Panel
 * @property {number} [diagonalIn]
 * @property {string} [type] e.g. "IPS", "IPS Black", "VA", "OLED"
 * @property {string} [aspect] e.g. "16:9", "21:9", "32:9"
 * @property {[number, number]} [resolution] [width, height] in pixels
 * @property {number} [ppi]
 * @property {number} [curveRadiusMm] absent = flat
 * @property {[number, number]} [activeAreaMm] [width, height] of the lit area
 * @property {number} [pixelPitchMm]
 * @property {number} [refreshHz]
 * @property {number} [responseMs]
 * @property {number} [bitDepth]
 * @property {number} [brightnessNits] typical
 * @property {number} [peakNits] highest the maker states, usually for HDR
 * @property {string} [contrast] e.g. "2000:1"
 * @property {string} [hdr] e.g. "DisplayHDR 400"
 * @property {Object<string, number>} [colorGamut] percent per space, e.g. {sRGB: 100, "DCI-P3": 98}
 * @property {string} [coating] e.g. "anti-glare", "glossy", "matte"
 */

/**
 * @typedef {Object} Dimensions
 * @property {{w: number, h: number, d?: number}} [bodyMm] body without stand
 * @property {{w: number, hMin?: number, hMax?: number, d?: number}} [withStandMm]
 * @property {{w?: number, d: number}} [standBaseMm]
 * @property {{top?: number, side?: number, bottom?: number}} [bezelMm]
 */

/**
 * @typedef {Object} Ergonomics
 * @property {[number, number]} [tiltDeg] [min, max]
 * @property {[number, number]} [swivelDeg] [min, max]
 * @property {boolean} [pivot]
 * @property {number} [heightAdjustMm]
 * @property {[number, number]} [vesaMm] e.g. [100, 100]
 */

/**
 * @typedef {Object} Connectivity
 * @property {string[]} [inputs] e.g. ["HDMI 2.1", "DP 1.4", "Thunderbolt 4"]
 * @property {string[]} [usbHub] downstream ports
 * @property {number} [usbcPowerW] power delivery to a laptop
 * @property {boolean} [kvm]
 * @property {boolean} [ethernet]
 * @property {boolean} [daisyChain]
 */

/**
 * @typedef {Object} Source
 * @property {string} id referenced from provenance, e.g. "s1"
 * @property {SourceKind} kind
 * @property {string} url
 * @property {string} checked ISO date the value was last checked
 */

/**
 * @typedef {Object} Provenance
 * @property {string} [source] a Source id; required unless quality is "estimated"
 * @property {ValueQuality} quality
 * @property {string} [note]
 */

/**
 * @typedef {Object} Monitor
 * @property {string} id stable slug, e.g. "dell-u4025qw"
 * @property {string} brand
 * @property {string} model
 * @property {string[]} modelCodes regional variants of the same hardware
 * @property {string} [family] e.g. "UltraSharp", "ProArt"
 * @property {string} [released] "YYYY" or "YYYY-MM"
 * @property {MonitorStatus} [status]
 * @property {Panel} panel
 * @property {Dimensions} dimensions
 * @property {Ergonomics} [ergonomics]
 * @property {{panel?: number, withStand?: number}} [weightKg]
 * @property {Connectivity} [connectivity]
 * @property {{typicalW?: number, maxW?: number, standbyW?: number}} [power]
 * @property {{speakers?: boolean, wattsEach?: number, microphone?: boolean, webcam?: boolean}} [audio]
 * @property {{launchUsd?: number}} [price]
 * @property {Source[]} sources
 * @property {Object<string, Provenance>} [provenance] keyed by dotted field path, e.g. "dimensions.bodyMm"
 */

/** @typedef {"automated"|"manual"|"ask"} CollectionPolicy automated = robots.txt and terms allow polite crawling; manual = enter by hand only; ask = unclear, check with the user first */

/**
 * @typedef {Object} RobotsRule
 * @property {string} host
 * @property {"allowed"|"partly"|"disallowed"|"unverified"} specPaths whether the monitor spec paths may be fetched by a generic user agent
 * @property {number} [crawlDelayS]
 * @property {string} [note] the relevant lines, quoted short
 */

/**
 * @typedef {Object} Terms
 * @property {string} url
 * @property {"allowed"|"forbidden"|"unclear"|"unverified"} automatedAccess
 * @property {string} reuse e.g. "personal, non-commercial only"
 * @property {string} [note]
 */

/**
 * @typedef {Object} Brand
 * @property {string} id e.g. "dell"
 * @property {string} name
 * @property {string} [specSource] the official spec source, e.g. "PSREF", "QuickSpecs"
 * @property {string} [specSourceUrl]
 * @property {string} [catalogueUrl]
 * @property {string[]} [exampleUrls] one or two real spec pages or PDFs
 * @property {string} [supportUrl] support / archive for older models
 * @property {RobotsRule[]} [robots]
 * @property {Terms} [terms]
 * @property {boolean} [inIcecat] absent = unknown
 * @property {number} [icecatSupplierId] the brand's Supplier_id in Icecat's index files
 * @property {CollectionPolicy} [collection]
 * @property {string} [checked] ISO date the robots.txt and terms were last read
 */

var STATUSES = ["current", "discontinued", "announced"];
var QUALITIES = ["spec", "measured", "estimated"];
var KINDS = ["manufacturer", "review", "catalogue", "retailer"];

function isNum(v) { return typeof v === "number" && isFinite(v) && v > 0; }
function get(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }

/**
 * Check a record against the model. Returns a list of problems; empty means valid.
 * @param {Monitor} m
 * @returns {string[]}
 */
function validateMonitor(m) {
  var errs = [];
  function need(cond, msg) { if (!cond) errs.push((m && m.id ? m.id + ": " : "") + msg); }
  need(m && typeof m === "object", "not an object");
  if (!m || typeof m !== "object") return errs;
  need(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id || ""), "id must be a lower-case slug");
  need(typeof m.brand === "string" && m.brand, "brand is required");
  need(typeof m.model === "string" && m.model, "model is required");
  need(Array.isArray(m.modelCodes) && m.modelCodes.length > 0, "modelCodes needs at least one code");
  need(m.status === undefined || STATUSES.indexOf(m.status) >= 0, "status must be one of " + STATUSES.join(", "));
  need(m.panel && typeof m.panel === "object", "panel is required");
  need(m.dimensions && typeof m.dimensions === "object", "dimensions is required");
  var body = get(m, "dimensions.bodyMm");
  if (body) need(isNum(body.w) && isNum(body.h), "dimensions.bodyMm needs positive w and h");
  var res = get(m, "panel.resolution");
  if (res) need(Array.isArray(res) && res.length === 2 && isNum(res[0]) && isNum(res[1]), "panel.resolution must be [width, height]");
  var r = get(m, "panel.curveRadiusMm");
  if (r !== undefined) need(isNum(r), "panel.curveRadiusMm must be positive (leave it out for flat)");
  need(Array.isArray(m.sources), "sources must be a list");
  var ids = (m.sources || []).map(function (s) {
    need(s && s.id && KINDS.indexOf(s.kind) >= 0 && /^https?:\/\//.test(s.url || "") && /^\d{4}-\d{2}-\d{2}$/.test(s.checked || ""),
      "source " + (s && s.id) + " needs id, kind, http(s) url and checked date");
    return s && s.id;
  });
  Object.keys(m.provenance || {}).forEach(function (path) {
    var p = m.provenance[path];
    need(get(m, path) !== undefined, "provenance names " + path + ", which has no value");
    need((p.quality === "estimated" && p.source === undefined) || ids.indexOf(p.source) >= 0, "provenance for " + path + " points to unknown source " + p.source);
    need(QUALITIES.indexOf(p.quality) >= 0, "provenance for " + path + " has quality " + p.quality);
  });
  return errs;
}

/**
 * Turn a catalogue record into the flat shape the drawing code uses (the `M` array in index.html).
 * Returns null when the sizes the drawing needs are missing.
 * @param {Monitor} m
 */
function toDrawing(m) {
  var body = get(m, "dimensions.bodyMm"), area = get(m, "panel.activeAreaMm");
  var sd = get(m, "dimensions.standBaseMm.d") || get(m, "dimensions.withStandMm.d");
  if (!body || !area || !sd) return null;
  var R = get(m, "panel.curveRadiusMm") || 0, res = get(m, "panel.resolution");
  var est = Object.keys(m.provenance || {}).some(function (k) { return /^(dimensions|panel\.activeAreaMm)/.test(k) && m.provenance[k].quality === "estimated"; });
  return {
    id: m.id, name: m.model, bw: body.w, bh: body.h, pw: area[0], ph: area[1], sd: sd, R: R,
    curve: R ? R + "R" : "flat", res: res ? res[0] + " × " + res[1] : "", est: est ? 1 : 0
  };
}

if (typeof module !== "undefined" && module.exports) module.exports = { validateMonitor: validateMonitor, toDrawing: toDrawing };
