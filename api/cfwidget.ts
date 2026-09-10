import type { Request, Response } from 'express';

// In-memory cache for CFWidget items to ensure lightning-fast responses
interface CachedMod {
  id: number | string;
  title: string;
  name?: string;
  summary: string;
  description: string;
  thumbnail: string;
  logo?: { url: string; thumbnailUrl?: string };
  attachments?: Array<{ isDefault?: boolean; url: string; title?: string }>;
  downloads: { total: number; monthly?: number };
  downloadUrl: string;
  downloadFilename?: string;
  downloadSize?: string;
  created_at: string;
  uploaded_at?: string;
  categories: string[];
  versions: string[];
  members?: Array<{ id: number; username: string; title?: string }>;
  urls?: { curseforge?: string; project?: string };
}

const MEMORY_CACHE = new Map<string, { data: CachedMod; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Curated list of high-quality, popular, and actively updated Minecraft mods on CurseForge
const DEFAULT_CF_SLUGS = [
  'jei',
  'journeymap',
  'curios',
  'sodium',
  'iris',
  'appleskin',
  'mouse-tweaks',
  'clumps',
  'spark',
  'iron-chests',
  'biomes-o-plenty',
  'alexs-mobs',
  'waystones',
  'tinkers-construct',
  'create',
  'applied-energistics-2',
  'botania',
  'farmers-delight',
  'twilight-forest',
  'optifine',
  'sodium-extra',
  'reese-sodium-options',
  'architectury-api',
  'cloth-config',
  'ferritecore',
  'geckolib',
  'entity-culling',
  'valkyrien-skies',
  'storage-drawers',
  'supplementaries',
  'patchouli',
  'mekanism',
  'configured',
  'controlling',
  'fast-leaf-decay',
  'ftb-quests',
  'gravestone-mod',
  'jade',
  'xaeros-minimap',
  'xaeros-world-map',
  'neat',
  'rubidium',
  'embeddium',
  'dynamic-lights',
  'tombstone',
  'comforts',
  'quark',
  'immersive-engineering',
  'thermal-expansion',
  'iron-furnaces',
];

// Fetch single mod from CFWidget REST API (https://cfwidget.com/minecraft/mc-mods/[slug_or_id])
async function fetchCFWidgetMod(slugOrId: string | number): Promise<CachedMod | null> {
  const cacheKey = String(slugOrId).toLowerCase().trim();
  const cached = MEMORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const urlsToTry = [
    `https://api.cfwidget.com/minecraft/mc-mods/${encodeURIComponent(slugOrId)}`,
    `https://api.cfwidget.com/${encodeURIComponent(slugOrId)}`,
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && (data.id || data.title)) {
          const modId = data.id || slugOrId;
          const thumbnail = data.thumbnail || data.logo?.url || '';
          const logoUrl = data.logo?.url || thumbnail;

          // Native attachments array strictly for unique images
          const attachments: Array<{ isDefault?: boolean; url: string; title?: string }> = [];
          if (logoUrl) {
            attachments.push({ isDefault: true, url: logoUrl, title: data.title });
          }
          if (Array.isArray(data.attachments)) {
            for (const att of data.attachments) {
              const u = typeof att === 'string' ? att : att?.url;
              if (u && !attachments.some((a) => a.url === u)) {
                attachments.push({ isDefault: false, url: u, title: att.title || data.title });
              }
            }
          }

          // Direct downloadUrl resolution
          const latestFile = Array.isArray(data.files) && data.files.length > 0 ? data.files[0] : null;
          const downloadUrl =
            data.download?.url ||
            latestFile?.url ||
            data.downloadUrl ||
            data.urls?.curseforge ||
            `https://www.curseforge.com/minecraft/mc-mods/${modId}`;

          const createdDate = data.created_at || latestFile?.uploaded_at || new Date().toISOString();

          const formatted: CachedMod = {
            id: modId,
            title: data.title || data.name || String(slugOrId),
            name: data.title || data.name || String(slugOrId),
            summary: data.summary || data.description || '',
            description: data.description || data.summary || '',
            thumbnail,
            logo: { url: logoUrl, thumbnailUrl: thumbnail },
            attachments,
            downloads: {
              total: typeof data.downloads === 'number' ? data.downloads : (data.downloads?.total || 0),
              monthly: data.downloads?.monthly || 0,
            },
            downloadUrl,
            downloadFilename: latestFile?.name || `${slugOrId}.jar`,
            downloadSize: latestFile?.filesize
              ? `${(latestFile.filesize / (1024 * 1024)).toFixed(1)} MB`
              : '2.5 MB',
            created_at: createdDate,
            uploaded_at: latestFile?.uploaded_at || createdDate,
            categories: Array.isArray(data.categories) ? data.categories : ['Mods', 'Utility'],
            versions: Array.isArray(data.versions)
              ? (Array.isArray(data.versions[0]) ? data.versions[0] : data.versions)
              : (latestFile?.versions || ['1.21', '1.20']),
            members: Array.isArray(data.members) ? data.members : [],
            urls: data.urls || {
              curseforge: `https://www.curseforge.com/minecraft/mc-mods/${slugOrId}`,
              project: `https://www.curseforge.com/minecraft/mc-mods/${slugOrId}`,
            },
          };

          MEMORY_CACHE.set(cacheKey, { data: formatted, timestamp: Date.now() });
          MEMORY_CACHE.set(String(formatted.id), { data: formatted, timestamp: Date.now() });
          return formatted;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  return null;
}

// Handler for Vercel Serverless Function and Express route
export default async function handler(req: Request, res: Response) {
  const query = (req.query.query || req.query.searchFilter || req.query.term || req.query.q || '') as string;
  const sort = (req.query.sort || req.query.index || 'newest') as string;
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit || req.query.pageSize || '30') as string, 10)));
  const offset = Math.max(0, parseInt((req.query.offset || req.query.index || '0') as string, 10));

  try {
    let rawItems: CachedMod[] = [];

    // If a search query is specified, look up matching slug / search term
    if (query.trim().length > 0) {
      const sanitized = query.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
      // Direct query to CFWidget for the searched slug / project
      const direct = await fetchCFWidgetMod(sanitized);
      if (direct) {
        rawItems.push(direct);
      }

      // Also search through known slugs that match query
      const matchingSlugs = DEFAULT_CF_SLUGS.filter((s) => s.includes(sanitized) || sanitized.includes(s));
      const matchPromises = matchingSlugs.slice(0, 10).map((s) => fetchCFWidgetMod(s));
      const matchResults = await Promise.all(matchPromises);
      for (const m of matchResults) {
        if (m && !rawItems.some((item) => String(item.id) === String(m.id))) {
          rawItems.push(m);
        }
      }
    } else {
      // Mass fetch of curated CFWidget mods
      const targetSlugs = DEFAULT_CF_SLUGS.slice(0, Math.min(DEFAULT_CF_SLUGS.length, limit + offset + 10));
      const fetchPromises = targetSlugs.map((slug) => fetchCFWidgetMod(slug));
      const fetchedMods = await Promise.all(fetchPromises);

      for (const m of fetchedMods) {
        if (m && !rawItems.some((item) => String(item.id) === String(m.id))) {
          rawItems.push(m);
        }
      }
    }

    // Sort chronologically from newest to oldest by default
    rawItems.sort((a, b) => {
      const timeA = new Date(a.created_at || a.uploaded_at || 0).getTime();
      const timeB = new Date(b.created_at || b.uploaded_at || 0).getTime();
      if (sort === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });

    const paginated = rawItems.slice(offset, offset + limit);

    return res.json({
      hits: paginated,
      data: paginated,
      total_hits: rawItems.length,
      limit,
      offset,
      pagination: {
        index: offset,
        pageSize: limit,
        resultCount: paginated.length,
        totalCount: rawItems.length,
      },
    });
  } catch (error) {
    console.error('CFWidget API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch CFWidget mods',
      hits: [],
      data: [],
      total_hits: 0,
    });
  }
}
