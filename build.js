#!/usr/bin/env node
// build.js — النسخة 2 المحسّنة
// يولّد صفحات الأدوات من tools-data.js
// الاستخدام: node build.js
// الإخراج: يكتب مباشرة في مجلدات الموقع

const fs   = require("fs");
const path = require("path");
const tools = require("./tools-data.js");

// ── إعدادات ──────────────────────────────────────────────
const BASE_URL   = "https://imgswift.xyz";
const OUTPUT_DIR = __dirname;

// رابط الأداة داخل التطبيق (/?tool=...)
const TOOL_PARAMS = {
  "jpg-to-png":    "jpg-png&tab=convert",
  "png-to-jpg":    "png-jpg&tab=convert",
  "jpg-to-webp":   "jpg-webp&tab=convert",
  "png-to-webp":   "png-webp&tab=convert",
  "compress-image":"compress&tab=compress",
  "resize-image":  "resize",
  "webp-to-jpg":   "webp-jpg&tab=convert",
  "webp-to-png":   "webp-png&tab=convert",
  "jpg-to-avif":   "jpg-avif&tab=convert",
  "png-to-avif":   "png-avif&tab=convert",
  "webp-to-avif":  "webp-avif&tab=convert",
  "avif-to-jpg":   "avif-jpg&tab=convert",
  "avif-to-png":   "avif-png&tab=convert",
  "avif-to-webp":  "avif-webp&tab=convert",
  "heic-to-jpg":   "heic-jpg&tab=convert",
  "heic-to-png":   "heic-png&tab=convert",
  "heic-to-webp":  "heic-webp&tab=convert",
  "heic-to-avif":  "heic-avif&tab=convert",
  "gif-to-webp":   "gif-webp&tab=convert",
  "jpg-to-pdf":    "jpg-pdf&tab=convert",
  "png-to-pdf":    "png-pdf&tab=convert",
  "pdf-to-image":  "pdf-img&tab=pdf",
  "crop-image":    "crop",
  "rotate-image":  "rotate",
  "flip-image":    "flip",
};

// نص "Drop your X file here" حسب الأداة
const UPLOAD_HINT = {
  "jpg-to-png":    "Drop your JPG file here",
  "png-to-jpg":    "Drop your PNG file here",
  "jpg-to-webp":   "Drop your JPG file here",
  "png-to-webp":   "Drop your PNG file here",
  "compress-image":"Drop your image here",
  "resize-image":  "Drop your image here",
  "webp-to-jpg":   "Drop your WebP file here",
  "webp-to-png":   "Drop your WebP file here",
  "jpg-to-avif":   "Drop your JPG file here",
  "png-to-avif":   "Drop your PNG file here",
  "webp-to-avif":  "Drop your WebP file here",
  "avif-to-jpg":   "Drop your AVIF file here",
  "avif-to-png":   "Drop your AVIF file here",
  "avif-to-webp":  "Drop your AVIF file here",
  "jpg-to-pdf":    "Drop your JPG images here",
  "png-to-pdf":    "Drop your PNG images here",
  "pdf-to-image":  "Drop your PDF file here",
  "crop-image":    "Drop your image here",
  "rotate-image":  "Drop your image here",
  "heic-to-jpg":   "Drop your HEIC file here",
  "heic-to-png":   "Drop your HEIC file here",
  "heic-to-webp":  "Drop your HEIC file here",
  "heic-to-avif":  "Drop your HEIC file here",
  "gif-to-webp":   "Drop your GIF file here",
  "flip-image":    "Drop your image here",
};

// OG image — يتحقق من وجود الملف أو يستخدم الافتراضي
function ogImage(slug) {
  const specific    = path.join(OUTPUT_DIR, "og", `${slug}-og.png`);
  const specificSvg = path.join(OUTPUT_DIR, "og", `${slug}-og.svg`);
  if (fs.existsSync(specific))    return `${BASE_URL}/og/${slug}-og.png`;
  if (fs.existsSync(specificSvg)) return `${BASE_URL}/og/${slug}-og.svg`;
  return `${BASE_URL}/og-image.png`;
}

// HTML escape helper
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── مولّدات الأقسام ──────────────────────────────────────

// خطوات HowTo — تستخدم howToSteps المخصصة إن وُجدت، أو الافتراضية
function buildHowToSteps(t) {
  const steps = t.howToSteps || [
    {
      title: "Upload your file",
      desc:  "Drag and drop your file into ImgSwift or click to browse. No account needed."
    },
    {
      title: "Adjust settings if needed",
      desc:  "Choose output format and quality. ImgSwift picks smart defaults automatically."
    },
    {
      title: "Download your result",
      desc:  "Click Download to save the file to your device instantly. Nothing is stored online."
    }
  ];

  return steps.map((step, i) => `
    <li class="how-step">
      <div class="how-step-num">${i + 1}</div>
      <div>
        <strong>${esc(step.title)}</strong>
        <p>${esc(step.desc)}</p>
      </div>
    </li>`).join("\n");
}

// جدول المقارنة — اختياري
function buildConversionTable(t) {
  if (!t.conversionTable) return "";

  const rows = t.conversionTable.rows.map(row => `
        <tr>
          <td>${esc(row.feature)}</td>
          <td>${esc(row.jpg)}</td>
          <td>${esc(row.png)}</td>
        </tr>`).join("\n");

  return `
<section class="page-section">
  <h2 class="section-title">${esc(t.conversionTable.heading)}</h2>
  <div class="table-wrap">
    <table class="comparison-table">
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</section>`;
}

// قسم الفوائد — اختياري
function buildBenefits(t) {
  if (!t.benefits || t.benefits.length === 0) return "";

  const items = t.benefits.map(b => `
      <li class="benefit-item">
        <span class="benefit-icon">✅</span>
        <span>${esc(b)}</span>
      </li>`).join("\n");

  return `
<section class="page-section benefits-section">
  <h2 class="section-title">Key Features</h2>
  <ul class="benefits-list">
    ${items}
  </ul>
</section>`;
}

// HowTo Schema — يولّد بناءً على howToSteps
function buildHowToSchema(t, url, toolLink) {
  const steps = t.howToSteps || [
    { title: "Upload your file",        desc: "Drag and drop your file into ImgSwift or click to browse. No account needed." },
    { title: "Adjust settings",         desc: "Choose output format and quality. ImgSwift picks smart defaults automatically." },
    { title: "Download your result",    desc: "Click Download to save the file to your device instantly. Nothing is stored online." }
  ];

  const stepsJson = steps.map((step, i) =>
    `{"@type":"HowToStep","position":${i+1},"name":${JSON.stringify(step.title)},"text":${JSON.stringify(step.desc)},"url":"${url}"}`
  ).join(",\n    ");

  return `
  <!-- HowTo Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": ${JSON.stringify("How to " + t.h1)},
    "description": ${JSON.stringify(t.metaDesc)},
    "step": [
    ${stepsJson}
    ],
    "tool": {"@type":"HowToTool","name":"ImgSwift","url":"${url}"}
  }
  </script>`;
}

// ── مولّد الصفحة الكاملة ─────────────────────────────────
function buildPage(t) {
  const url       = `${BASE_URL}/${t.slug}/`;
  const toolParam = TOOL_PARAMS[t.slug] || t.slug;
  const toolLink  = `/?tool=${toolParam}`;
  const hint      = UPLOAD_HINT[t.slug] || "Drop your file here";
  const ogImg     = ogImage(t.slug);

  // FAQ schema
  const faqSchema = t.faqs.map(f =>
    `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`
  ).join(",\n    ");

  // FAQ HTML
  const faqHtml = t.faqs.map(f => `
      <details class="faq-item">
        <summary class="faq-q">${esc(f.q)}</summary>
        <div class="faq-a"><p>${esc(f.a)}</p></div>
      </details>`).join("\n");

  // Related tools HTML
  const relatedHtml = (t.relatedTools || []).map(slug => {
    const label = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")
      .replace("Jpg","JPG").replace("Png","PNG").replace("Webp","WebP")
      .replace("Avif","AVIF").replace("Pdf","PDF");
    return `        <a href="/${slug}/" class="related-tool-link">${label}</a>`;
  }).join("\n");

  // HowTo steps HTML
  const howToStepsHtml = buildHowToSteps(t);

  // الأقسام الاختيارية
  const comparisonTableHtml = buildConversionTable(t);
  const benefitsHtml        = buildBenefits(t);
  const howToSchemaHtml     = buildHowToSchema(t, url, toolLink);

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(t.title)}</title>
  <meta name="description" content="${esc(t.metaDesc)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(t.h1)} | ImgSwift">
  <meta property="og:description" content="${esc(t.ogDesc)}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(t.h1)}">
  <meta property="og:site_name" content="ImgSwift">

  <!-- Twitter -->
  <meta name="twitter:site" content="@imgswift">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(t.h1)} | ImgSwift">
  <meta name="twitter:description" content="${esc(t.ogDesc)}">
  <meta name="twitter:image" content="${ogImg}">

  <!-- Article Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(t.title)},
    "description": ${JSON.stringify(t.ogDesc)},
    "author": {"@type": "Person", "name": "ImgSwift Team", "url": "https://imgswift.xyz/about/"},
    "publisher": {"@type": "Organization", "name": "ImgSwift", "url": "https://imgswift.xyz"},
    "url": "${url}",
    "datePublished": "2026-05-30",
    "dateModified": "2026-06-03"
  }
  </script>

  <!-- BreadcrumbList Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"https://imgswift.xyz/"},
      {"@type":"ListItem","position":2,"name":${JSON.stringify(t.h1)},"item":"${url}"}
    ]
  }
  </script>

  <!-- FAQPage Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
    ${faqSchema}
    ]
  }
  </script>

  <!-- SoftwareApplication Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": ${JSON.stringify("ImgSwift — " + t.h1)},
    "url": "${url}",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any",
    "offers": {"@type":"Offer","price":"0","priceCurrency":"USD"},
    "aggregateRating": {"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"2847","bestRating":"5","worstRating":"1"}
  }
  </script>
  ${howToSchemaHtml}

  <!-- Fonts & Styles -->
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" as="style">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#080c12">
  <link rel="stylesheet" href="/tool-critical.css">
  <link rel="stylesheet" href="/results-ux.css">

  <style>
    /* ── جدول المقارنة ── */
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .comparison-table {
      width: 100%; border-collapse: collapse;
      font-size: 0.92rem; margin-top: 12px;
    }
    .comparison-table td {
      padding: 11px 16px; border-bottom: 1px solid var(--border, #1e2533);
      vertical-align: middle;
    }
    .comparison-table td:first-child { color: var(--muted, #8b9bb4); font-weight: 500; }
    .comparison-table tr:last-child td { border-bottom: none; }
    .comparison-table tr:hover td { background: rgba(255,255,255,0.03); }

    /* ── قائمة الفوائد ── */
    .benefits-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    @media (min-width: 600px) { .benefits-list { grid-template-columns: 1fr 1fr; } }
    .benefit-item {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid var(--border, #1e2533);
      border-radius: 10px; padding: 12px 14px; font-size: 0.9rem;
    }
    .benefit-icon { flex-shrink: 0; font-size: 1rem; margin-top: 1px; }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Img<span>Swift</span></a>
  <a href="/" class="nav-back">← All Tools</a>
</nav>

<!-- BREADCRUMB -->
<nav aria-label="Breadcrumb" style="max-width:860px;margin:16px auto 0;padding:0 24px;">
  <ol style="list-style:none;display:flex;gap:8px;font-size:0.82rem;color:var(--muted);">
    <li><a href="/" style="color:var(--muted);">Home</a></li>
    <li style="color:var(--border);">/</li>
    <li style="color:var(--text-2);">${esc(t.h1)}</li>
  </ol>
</nav>

<!-- HERO -->
<header class="page-hero">
  <h1>${esc(t.h1)}</h1>
  <p>${esc(t.introParagraph)}</p>
  <div class="hero-badges">
    <span class="hero-badge">🔒 No Upload</span>
    <span class="hero-badge">⚡ Instant</span>
    <span class="hero-badge">🆓 Always Free</span>
    <span class="hero-badge">📱 Works on Mobile</span>
    <span class="hero-badge">🔐 100% Private</span>
  </div>
  <a href="${toolLink}" class="cta-btn">
    ⚡ Start Converting — Free
  </a>
</header>

<!-- TOOL EMBED (CTA frame) -->
<div class="tool-embed">
  <div class="tool-frame">
    <div class="tool-frame-header">
      <div class="tool-frame-dot"></div>
      <span class="tool-frame-title">${esc(t.h1)} — imgswift.xyz</span>
    </div>
    <div class="tool-frame-body">
      <a href="${toolLink}" style="text-decoration:none;">
        <div class="upload-zone">
          <div class="upload-icon">📁</div>
          <div class="upload-title">${hint}</div>
          <div class="upload-sub">or click to select · No upload · 100% private</div>
          <div class="upload-btn">⚡ Open Free Tool</div>
        </div>
      </a>
    </div>
  </div>
</div>

<!-- WHY -->
<section class="page-section">
  <h2 class="section-title">${esc(t.whyHeading)}</h2>
  <p class="prose">${esc(t.whyContent)}</p>
</section>

<!-- BENEFITS (اختياري — يظهر إذا كان موجوداً في tools-data.js) -->
${benefitsHtml}

<!-- HOW TO (خطوات مخصصة من tools-data.js) -->
<section class="page-section">
  <h2 class="section-title">How to Use — 3 Simple Steps</h2>
  <ol class="how-list">
    ${howToStepsHtml}
  </ol>
</section>

<!-- COMPARISON TABLE (اختياري) -->
${comparisonTableHtml}

<!-- FAQ -->
<section class="page-section">
  <h2 class="section-title">Frequently Asked Questions</h2>
  <div class="faq-list">
${faqHtml}
  </div>
</section>

<!-- RELATED TOOLS -->
<section class="page-section">
  <h2 class="section-title">Related Tools</h2>
  <div class="related-grid">
${relatedHtml}
        <a href="/compress-image/" class="related-tool-link">Compress Images</a>
        <a href="/resize-image/" class="related-tool-link">Resize Image</a>
        <a href="/best-image-format-for-websites/" class="related-tool-link">Best Image Format Guide</a>
        <a href="/image-seo-checklist/" class="related-tool-link">Image SEO Checklist</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <p class="footer-logo">⚡ Img<span>Swift</span></p>
  <p style="margin-top:8px;">Free online image tools · 100% browser-based · No uploads · No signup</p>
  <p style="margin-top:8px;">
    <a href="/">Home</a> ·
    <a href="/jpg-to-png/">JPG to PNG</a> ·
    <a href="/png-to-jpg/">PNG to JPG</a> ·
    <a href="/jpg-to-webp/">JPG to WebP</a> ·
    <a href="/compress-image/">Compress</a> ·
    <a href="/pdf-to-image/">PDF to Image</a>
  </p>
  <p style="margin-top:14px;font-size:0.8rem;">© 2026 ImgSwift · <a href="/">Privacy: zero data sent to servers</a></p>
</footer>

<script>
document.querySelectorAll('a[href^="/?tool="]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    // router.js on index handles ?tool= param
  });
});
</script>

<script src="/results-ux.js"></script>
<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}</script>
</body>
</html>`;
}

// ── الحلقة الرئيسية ───────────────────────────────────────
let built   = 0;
let skipped = 0;

for (const tool of tools) {
  const dir = path.join(OUTPUT_DIR, tool.slug);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const outFile = path.join(dir, "index.html");
  const html    = buildPage(tool);

  fs.writeFileSync(outFile, html, "utf8");

  // أظهر ما الجديد في هذه الصفحة
  const extras = [];
  if (tool.howToSteps)      extras.push("custom-steps");
  if (tool.conversionTable) extras.push("table");
  if (tool.benefits)        extras.push("benefits");

  const tag = extras.length ? ` [${extras.join(" + ")}]` : "";
  console.log(`✅  ${tool.slug}/index.html${tag}`);
  built++;
}

console.log(`\n🎉  تم بناء ${built} صفحة بنجاح في ${OUTPUT_DIR}`);
if (skipped > 0) console.log(`⏭️   تخطّي ${skipped} صفحة`);

console.log(`
📋  الأقسام الجديدة في هذه النسخة:
   • howToSteps   — خطوات مخصصة لكل أداة (3 خطوات دقيقة)
   • conversionTable — جدول مقارنة تنسيقات أو حالات الاستخدام
   • benefits     — قائمة فوائد سريعة (✅ badges)
   • HowTo Schema — structured data جديد لكل صفحة

💡  لإضافة أداة جديدة: أضف كائناً في tools-data.js وشغّل node build.js
`);
