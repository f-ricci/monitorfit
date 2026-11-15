// The seven monitors from index.html as catalogue records (see monitor-model.js for the types).
// Only the values the page already had are filled in. No source has been checked yet, so `sources` is empty
// and only values worked out from diagonal and ratio carry provenance ("estimated").

/** @type {import("./monitor-model.js").Monitor[]} */
var MONITORS = [
  {
    id: "asus-pa279crv", brand: "ASUS", model: "ProArt PA279CRV", modelCodes: ["PA279CRV"], family: "ProArt",
    panel: { diagonalIn: 27, aspect: "16:9", resolution: [3840, 2160], activeAreaMm: [596.7, 335.7] },
    dimensions: { bodyMm: { w: 612.2, h: 362.9 }, standBaseMm: { d: 215 } },
    sources: []
  },
  {
    id: "asus-proart-32-4k", brand: "ASUS", model: "ProArt 32\" 4K", modelCodes: ["PA329CRV"], family: "ProArt",
    panel: { diagonalIn: 32, aspect: "16:9", resolution: [3840, 2160], activeAreaMm: [708.5, 398.5] },
    dimensions: { bodyMm: { w: 727.1, h: 429 }, standBaseMm: { d: 245 } },
    sources: [],
    provenance: { "dimensions.bodyMm": { quality: "estimated", note: "body height worked out from diagonal and ratio" } }
  },
  {
    id: "lg-34u620b-b", brand: "LG", model: "34U620B-B", modelCodes: ["34U620B-B"],
    panel: { diagonalIn: 34, aspect: "21:9", resolution: [3440, 1440], curveRadiusMm: 1800, activeAreaMm: [797.2, 333.7] },
    dimensions: { bodyMm: { w: 809, h: 359 }, standBaseMm: { d: 220 } },
    sources: []
  },
  {
    id: "asus-pa34vcnv", brand: "ASUS", model: "ProArt PA34VCNV", modelCodes: ["PA34VCNV"], family: "ProArt",
    panel: { diagonalIn: 34, aspect: "21:9", resolution: [3440, 1440], curveRadiusMm: 3800, activeAreaMm: [799.8, 334.8] },
    dimensions: { bodyMm: { w: 817.2, h: 369.7 }, standBaseMm: { d: 240 } },
    sources: []
  },
  {
    id: "dell-u4025qw", brand: "Dell", model: "UltraSharp U4025QW", modelCodes: ["U4025QW"], family: "UltraSharp",
    panel: { diagonalIn: 40, aspect: "21:9", resolution: [5120, 2160], curveRadiusMm: 2500, activeAreaMm: [929, 392] },
    dimensions: { bodyMm: { w: 946.6, h: 419.1 }, standBaseMm: { d: 252.8 } },
    sources: [],
    provenance: { "panel.activeAreaMm": { quality: "estimated", note: "worked out from diagonal and ratio" } }
  },
  {
    id: "lg-49u950a", brand: "LG", model: "49U950A", modelCodes: ["49U950A"],
    panel: { diagonalIn: 49, aspect: "32:9", resolution: [5120, 1440], curveRadiusMm: 3800, activeAreaMm: [1198, 337] },
    dimensions: { bodyMm: { w: 1215.1, h: 365.7 }, standBaseMm: { d: 260 } },
    sources: [],
    provenance: { "panel.activeAreaMm": { quality: "estimated", note: "worked out from diagonal and ratio" } }
  },
  {
    id: "dell-u5226kw", brand: "Dell", model: "UltraSharp U5226KW", modelCodes: ["U5226KW"], family: "UltraSharp",
    panel: { diagonalIn: 52, aspect: "21:9", resolution: [6144, 2560], curveRadiusMm: 4200, activeAreaMm: [1207, 503] },
    dimensions: { bodyMm: { w: 1223.3, h: 529.1 }, standBaseMm: { d: 255 } },
    sources: [],
    provenance: { "panel.activeAreaMm": { quality: "estimated", note: "worked out from diagonal and ratio" } }
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = { MONITORS: MONITORS };
