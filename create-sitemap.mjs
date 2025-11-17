import fs from "fs";
import path from "path";

// Daftar URL website kamu
const urls = [
  { loc: "https://starmar2.vercel.app/", lastmod: "2025-11-16", priority: 1.0 },
  { loc: "https://starmar2.vercel.app/auth", lastmod: "2025-11-15", priority: 0.8 },
  { loc: "https://starmar2.vercel.app/profile", lastmod: "2025-11-10", priority: 0.6 },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `<url>
  <loc>${url.loc}</loc>
  <lastmod>${url.lastmod}</lastmod>
  <priority>${url.priority}</priority>
</url>`
  )
  .join("\n")}
</urlset>
`;

// Pastikan folder public ada
const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);

console.log("✅ sitemap.xml berhasil dibuat di /public/sitemap.xml");
