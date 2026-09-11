import fs from 'fs';
import path from 'path';

interface ApiRequest {
  method?: string;
  query: { [key: string]: string | string[] | undefined };
  url?: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  setHeader: (key: string, value: string | number) => void;
  send: (body: unknown) => void;
  end: (body?: unknown) => void;
}

const DEFAULT_IMAGE = 'https://market.mineholde.pro/icons/icon-512x512.png';
const BASE_URL = 'https://market.mineholde.pro';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanSeoDescription(desc?: string): string {
  if (!desc) {
    return 'Скачать оригинальный мод для Minecraft Java Edition на MineHolde Market.';
  }
  const cleaned = String(desc)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`~>]/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Скачать оригинальный мод для Minecraft Java Edition на MineHolde Market.';
  }
  if (cleaned.length <= 150) return cleaned;
  const slice = cleaned.slice(0, 147);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 100) {
    return slice.slice(0, lastSpace).trim() + '...';
  }
  return slice.trim() + '...';
}

function extractProductImage(product: any): string {
  if (!product) return DEFAULT_IMAGE;

  let img =
    product.icon_url ||
    product.thumbnailUrl ||
    product.bannerUrl ||
    (Array.isArray(product.gallery) && product.gallery[0]?.url) ||
    (Array.isArray(product.screenshots) && product.screenshots[0]) ||
    product.thumbnail ||
    product.logo ||
    '';

  img = String(img).trim();
  if (!img || img.startsWith('data:image/svg')) {
    if (product.bannerUrl && !product.bannerUrl.startsWith('data:image/svg')) {
      img = product.bannerUrl;
    } else {
      img = DEFAULT_IMAGE;
    }
  }

  if (img.startsWith('/')) {
    img = `${BASE_URL}${img}`;
  }

  return img;
}

async function resolveProduct(rawId: string) {
  if (!rawId) return null;

  const isModrinth = rawId.startsWith('mr-');
  const isCf = rawId.startsWith('cf-');
  const cleanId = rawId.replace(/^(mr-|cf-)/, '');

  // 1. Modrinth API lookup
  if (isModrinth || !isCf) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(cleanId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || data.name || cleanId,
          description: data.description || data.body || '',
          icon_url: data.icon_url || (data.id ? `https://cdn.modrinth.com/data/${data.id}/icon.png` : ''),
          gallery: data.gallery,
        };
      }
    } catch {}
  }

  // 2. CFWidget API lookup
  if (isCf) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.cfwidget.com/minecraft/mc-mods/${encodeURIComponent(cleanId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          const firstImg = data.thumbnail || (Array.isArray(data.screenshots) ? data.screenshots[0] : '');
          return {
            title: data.title || cleanId,
            description: data.summary || data.description || '',
            thumbnailUrl: firstImg,
          };
        }
      }
    } catch {}
  }

  return null;
}

function getHtmlTemplate(): string {
  // Try dist/index.html first (production build)
  try {
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(distPath)) {
      return fs.readFileSync(distPath, 'utf-8');
    }
  } catch {}

  // Try root index.html
  try {
    const rootPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(rootPath)) {
      return fs.readFileSync(rootPath, 'utf-8');
    }
  } catch {}

  // Fallback self-contained HTML shell
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MineHolde Market — Каталог модов, текстур и миров</title>
    <meta name="description" content="MineHolde Market — каталог модов для Minecraft Java Edition." />
    <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />
  </head>
  <body class="bg-[#121214] text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

function injectSeo(html: string, title: string, description: string, imageUrl: string, pageUrl: string): string {
  let modified = html;

  // Replace <title>
  modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const setMeta = (regex: RegExp, tag: string) => {
    if (regex.test(modified)) {
      modified = modified.replace(regex, tag);
    } else {
      modified = modified.replace('</head>', `  ${tag}\n  </head>`);
    }
  };

  setMeta(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  setMeta(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  setMeta(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  setMeta(/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`);
  setMeta(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`);
  setMeta(/<meta\s+property=["']og:site_name["'][^>]*>/i, `<meta property="og:site_name" content="MineHolde Market" />`);
  setMeta(/<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="website" />`);
  setMeta(/<meta\s+name=["']twitter:card["'][^>]*>/i, `<meta name="twitter:card" content="summary_large_image" />`);
  setMeta(/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  setMeta(/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  setMeta(/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);

  return modified;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const rawId = String(req.query.id || '').trim();
  const section = String(req.query.section || 'mods').toLowerCase();
  const pageUrl = `${BASE_URL}/${section}/${encodeURIComponent(rawId)}`;

  const baseHtml = getHtmlTemplate();

  if (!rawId) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(baseHtml);
  }

  try {
    const product = await resolveProduct(rawId);
    if (product) {
      const productTitle = product.title || rawId;
      const title = `Скачать мод ${productTitle.trim()} для Minecraft Java Edition — MineHolde Market`;
      const description = cleanSeoDescription(product.description);
      const imageUrl = extractProductImage(product);

      const html = injectSeo(baseHtml, title, description, imageUrl, pageUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    }
  } catch (err) {
    console.warn('Serverless SEO handler error:', err);
  }

  // Fallback to base HTML
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(baseHtml);
}
