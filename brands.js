// The big monitor brands: where each publishes official specs, and what its robots.txt and terms of use
// allow (see Brand in monitor-model.js). Read on 2026-11-15; anything that could not be read is "unverified".
// None of the six allows automated collection under its terms, so every brand is "manual" or "ask" for its own site.
// The automated route is Open Icecat instead (tools/icecat-import.js); inIcecat records a successful lookup there.

/** @type {import("./monitor-model.js").Brand[]} */
var BRANDS = [
  {
    id: "lenovo", name: "Lenovo", specSource: "PSREF",
    specSourceUrl: "https://psref.lenovo.com/",
    catalogueUrl: "https://psref.lenovo.com/Product/ThinkVision",
    exampleUrls: [
      "https://psref.lenovo.com/Product/ThinkVision/ThinkVision_T24d_30",
      "https://psref.lenovo.com/syspool/Sys/PDF/ThinkVision/ThinkVision_T24d_30/ThinkVision_T24d_30_Spec.pdf"
    ],
    supportUrl: "https://pcsupport.lenovo.com/",
    robots: [
      { host: "psref.lenovo.com", specPaths: "allowed", note: "no robots.txt (the URL returns the app page with 404)" },
      { host: "www.lenovo.com", specPaths: "allowed", note: "User-agent: * disallows cart, search and private stores only" },
      { host: "pcsupport.lenovo.com", specPaths: "partly", note: "Disallow: /us/ then Allow: /us/en; Disallow: /solutions/*?" }
    ],
    terms: { url: "https://www.lenovo.com/us/en/legal/", automatedAccess: "unverified", reuse: "unverified",
      note: "terms page returned 403; a search snippet warns unauthorized use of content may violate civil or criminal laws" },
    inIcecat: true,
    icecatSupplierId: 728,
    collection: "ask", checked: "2026-11-15"
  },
  {
    id: "hp", name: "HP", specSource: "QuickSpecs",
    specSourceUrl: "https://h20195.www2.hp.com/v2/GetDocument.aspx?docname=",
    catalogueUrl: "https://www.hp.com/go/quickspecs",
    exampleUrls: ["https://h20195.www2.hp.com/v2/GetDocument.aspx?docname=c08392793"],
    supportUrl: "https://support.hp.com/",
    robots: [
      { host: "h20195.www2.hp.com", specPaths: "unverified", note: "server sends an incomplete TLS chain; robots.txt could not be read" },
      { host: "www.hp.com", specPaths: "allowed", note: "User-agent: * disallows shop, cart and account paths only" },
      { host: "support.hp.com", specPaths: "partly", crawlDelayS: 1, note: "Disallow: /renderdocument/; Request-rate: 1/2" }
    ],
    terms: { url: "https://www.hp.com/us-en/terms-of-use.html", automatedAccess: "forbidden",
      reuse: "link only; copying and reproduction need HP's written consent",
      note: "Acceptable Use Policy (https://www.hp.com/us-en/acceptable-use-policy.html) bans high-volume automated means such as robots, spiders and scripts" },
    inIcecat: true,
    icecatSupplierId: 1,
    collection: "manual", checked: "2026-11-15"
  },
  {
    id: "dell", name: "Dell", specSource: "Spec pages and user-guide PDFs",
    specSourceUrl: "https://www.dell.com/en-us/shop/pc-accessories/ar/computer-monitors",
    catalogueUrl: "https://www.dell.com/en-us/shop/pc-accessories/ar/computer-monitors",
    exampleUrls: [
      "https://www.dell.com/en-us/shop/monitors/apd/dell-ultrasharp-27-monitor-u2724d/u2724d_monitor/-",
      "https://dl.dell.com/manuals/all-products/esuprt_electronics_accessories/esuprt_electronics_accessories_monitors/dell-p2721q-monitor_User's-Guide_en-us.pdf"
    ],
    supportUrl: "https://www.dell.com/support/home/en-us",
    robots: [
      { host: "www.dell.com", specPaths: "allowed", note: "shop product pages not disallowed; support pages return 403 to plain clients" },
      { host: "dl.dell.com", specPaths: "partly", note: "Allow: /manuals, Allow: /topicspdf, Disallow: /" }
    ],
    terms: { url: "https://www.dell.com/en-us/lp/legal/site-terms-of-use", automatedAccess: "unclear",
      reuse: "personal, non-commercial only; no copying or republishing without written permission",
      note: "also forbids using Dell content to benchmark against other products" },
    inIcecat: true,
    icecatSupplierId: 292,
    collection: "manual", checked: "2026-11-15"
  },
  {
    id: "asus", name: "ASUS", specSource: "Tech Specs tab",
    specSourceUrl: "https://www.asus.com/displays-desktops/monitors/",
    catalogueUrl: "https://www.asus.com/displays-desktops/monitors/all-series/",
    exampleUrls: ["https://www.asus.com/displays-desktops/monitors/proart/proart-display-pa278cv/techspec/"],
    supportUrl: "https://www.asus.com/supportonly/",
    robots: [
      { host: "www.asus.com", specPaths: "allowed", note: "disallows search and filter parameters only (/*Spec=*,*, /*SearchKey); publishes sitemaps" }
    ],
    terms: { url: "https://www.asus.com/terms_of_use_notice_privacy_policy/official-site/", automatedAccess: "forbidden",
      reuse: "limited, personal, non-commercial licence",
      note: "section 1.8.4 bans data mining, robots and similar extraction tools" },
    inIcecat: true,
    icecatSupplierId: 161,
    collection: "manual", checked: "2026-11-15"
  },
  {
    id: "lg", name: "LG", specSource: "Spec pages and business spec sheets",
    specSourceUrl: "https://www.lg.com/us/monitors",
    catalogueUrl: "https://www.lg.com/us/business/monitors",
    exampleUrls: ["https://www.lg.com/ca_en/monitors/uhd-4k-5k/27up850n-w/"],
    supportUrl: "https://www.lg.com/us/support",
    robots: [
      { host: "www.lg.com", specPaths: "allowed", note: "Allow: /; disallows support docs and some regional PDFs (/au/pdfs/*); US listings return 403 to plain clients" }
    ],
    terms: { url: "https://www.lg.com/us/legal", automatedAccess: "forbidden",
      reuse: "no copying or republishing except where the terms allow; no commercial use",
      note: "section 3.d bans manual or automated scraping software; only search-engine spiders get revocable permission" },
    inIcecat: true,
    icecatSupplierId: 293,
    collection: "manual", checked: "2026-11-15"
  },
  {
    id: "samsung", name: "Samsung", specSource: "Spec pages and business spec sheets",
    specSourceUrl: "https://www.samsung.com/us/monitors/",
    catalogueUrl: "https://www.samsung.com/us/business/monitors/all-monitors/",
    exampleUrls: ["https://www.samsung.com/us/monitors/high-resolution/27-viewfinity-s80pb-4k-uhd-ips-dci-p3-98-displayhdr-400-monitor-with-usb-c-and-matte-display-sku-ls27b806pxnxgo/"],
    supportUrl: "https://www.samsung.com/us/support/computing/monitors/",
    robots: [
      { host: "www.samsung.com", specPaths: "allowed", note: "monitor and business paths not disallowed; blocks search, /us/api/ and product compare" }
    ],
    terms: { url: "https://www.samsung.com/us/common/legal/", automatedAccess: "forbidden",
      reuse: "own personal use; no copying or reuse for commercial purposes",
      note: "may not collect or harvest data from the sites except where applicable law allows" },
    inIcecat: true,
    icecatSupplierId: 26,
    collection: "manual", checked: "2026-11-15"
  },
  // Collected through Open Icecat only; their own sites' robots.txt and terms have not been read, hence "ask".
  { id: "philips", name: "Philips", inIcecat: true, icecatSupplierId: 25, collection: "ask" },
  { id: "acer", name: "Acer", inIcecat: true, icecatSupplierId: 7, collection: "ask" },
  { id: "aoc", name: "AOC", inIcecat: true, icecatSupplierId: 1718, collection: "ask" },
  { id: "iiyama", name: "iiyama", inIcecat: true, icecatSupplierId: 80, collection: "ask" },
  { id: "viewsonic", name: "ViewSonic", inIcecat: true, icecatSupplierId: 247, collection: "ask" },
  { id: "msi", name: "MSI", inIcecat: true, icecatSupplierId: 278, collection: "ask" },
  { id: "benq", name: "BenQ", inIcecat: true, icecatSupplierId: 57, collection: "ask" },
  { id: "eizo", name: "EIZO", inIcecat: true, icecatSupplierId: 69, collection: "ask" },
  { id: "gigabyte", name: "GIGABYTE", inIcecat: true, icecatSupplierId: 739, collection: "ask" },
  { id: "alienware", name: "Alienware", inIcecat: true, icecatSupplierId: 4701, collection: "ask" }
];
