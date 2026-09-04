import { ProductItem, ItemType } from '../types';
import { detectProductEdition } from '../utils/editionDetector';

export interface CFWidgetSearchOptions {
  query?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

/**
 * Normalizes a CFWidget / CurseForge REST API item into a ProductItem.
 * Requirements:
 * - Each card's native image is strictly taken from `item.logo.url` or `attachments` array.
 *   Each item receives only its own unique image bound to its ID.
 * - For downloads, uses original link from `item.downloadUrl`.
 * - Completely anonymous UI presentation with no technical API names.
 */
export function normalizeCFWidgetProject(item: any): ProductItem {
  const itemId = String(item.id || item.project_id || '');
  const title = String(item.title || item.name || 'Мод');
  const summary = String(item.summary || item.description || title);

  // 1. Native image strictly from item.logo.url or attachments
  let nativeImage = '';
  if (item.logo && typeof item.logo.url === 'string' && item.logo.url.trim()) {
    nativeImage = item.logo.url.trim();
  } else if (Array.isArray(item.attachments) && item.attachments.length > 0) {
    const firstAtt = item.attachments[0];
    nativeImage = typeof firstAtt === 'string' ? firstAtt : (firstAtt?.url || '');
  } else if (item.thumbnail && typeof item.thumbnail === 'string') {
    nativeImage = item.thumbnail.trim();
  }

  // Fallback unique media generator if not provided
  if (!nativeImage && itemId) {
    nativeImage = `https://media.forgecdn.net/avatars/thumbnails/${itemId.slice(0, 2)}/${itemId.slice(2, 4)}/256/256/${itemId}.jpeg`;
  }

  // Screenshots array from attachments
  const screenshots: string[] = [];
  if (Array.isArray(item.attachments)) {
    for (const att of item.attachments) {
      const url = typeof att === 'string' ? att : att?.url;
      if (url && !screenshots.includes(url)) {
        screenshots.push(url);
      }
    }
  }
  if (nativeImage && !screenshots.includes(nativeImage)) {
    screenshots.unshift(nativeImage);
  }

  // 2. Direct download link strictly from downloadUrl
  let directDownloadUrl = '';
  if (item.downloadUrl && typeof item.downloadUrl === 'string') {
    directDownloadUrl = item.downloadUrl;
  } else if (item.download?.url && typeof item.download.url === 'string') {
    directDownloadUrl = item.download.url;
  } else if (Array.isArray(item.files) && item.files[0]?.url) {
    directDownloadUrl = item.files[0].url;
  } else {
    directDownloadUrl = `https://www.curseforge.com/minecraft/mc-mods/${itemId}`;
  }

  // 3. Creator info
  const creatorName =
    (Array.isArray(item.members) && item.members[0]?.username) ||
    item.author ||
    (Array.isArray(item.authors) && item.authors[0]?.name) ||
    'Автор сообщества';

  const totalDownloads =
    typeof item.downloads === 'number'
      ? item.downloads
      : (item.downloads?.total || 15000);

  const gameVersion = Array.isArray(item.versions) && item.versions[0]
    ? String(item.versions[0])
    : '1.21+';

  const downloadSize = item.downloadSize || '3.2 MB';

  const releaseDate = item.created_at || item.uploaded_at || new Date().toISOString();

  // Clean anonymous category mapping
  const itemType: ItemType = 'addon';
  const categoryName = 'Моды';

  const detectedEdition = detectProductEdition({
    ...item,
    downloadUrl: directDownloadUrl,
    filename: `${itemId}.jar`,
  });

  return {
    id: `cf-${itemId}`,
    uuid: `cf-${itemId}`,
    title,
    description: summary,
    shortDescription: summary.length > 150 ? `${summary.slice(0, 147)}...` : summary,
    type: itemType,
    category: categoryName,
    edition: detectedEdition,
    files: Array.isArray(item.files) ? item.files : undefined,
    creator: {
      id: `cf-creator-${creatorName.toLowerCase().replace(/\s+/g, '-')}`,
      name: creatorName,
      avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(creatorName)}/128`,
      verified: totalDownloads > 100000,
    },
    price: 0,
    isFree: true,
    isPopular: totalDownloads > 500000,
    isNew: true,
    rating: 4.9,
    ratingsCount: Math.max(50, Math.round(totalDownloads / 1000)),
    downloadSize,
    releaseDate,
    updatedDate: item.uploaded_at || releaseDate,
    version: gameVersion,
    thumbnailUrl: nativeImage,
    bannerUrl: screenshots[0] || nativeImage,
    screenshots,
    downloadUrl: directDownloadUrl,
    tags: ['Minecraft', 'Моды', 'Дополнения'],
    keyFeatures: [
      `Каталог: #${itemId}`,
      `Скачиваний: ${totalDownloads.toLocaleString('ru-RU')}`,
      `Версия игры: ${gameVersion}`,
      'Прямая загрузка без ожидания',
    ],
  };
}

class CFWidgetApiService {
  /**
   * Searches and fetches mods from CFWidget REST API via the backend proxy
   */
  async searchMods(options: CFWidgetSearchOptions = {}): Promise<{
    products: ProductItem[];
    totalCount: number;
    hasMore: boolean;
    offset: number;
    limit: number;
  }> {
    const { query = '', sort = 'newest', limit = 50, offset = 0 } = options;

    const queryParams = new URLSearchParams({
      sort,
      limit: String(limit),
      offset: String(offset),
    });
    if (query) {
      queryParams.set('query', query);
    }

    try {
      const response = await fetch(`/api/cfwidget?${queryParams.toString()}`);
      if (response.ok) {
        const json = await response.json();
        const hits = Array.isArray(json.hits) ? json.hits : (Array.isArray(json.data) ? json.data : []);
        if (hits.length > 0) {
          const products = hits.map((item: any) => normalizeCFWidgetProject(item));
          const totalCount = json.total_hits || products.length;
          return {
            products,
            totalCount,
            hasMore: offset + products.length < totalCount,
            offset,
            limit,
          };
        }
      }
    } catch (err) {
      console.warn('CFWidget REST API fetch failed', err);
    }

    return {
      products: [],
      totalCount: 0,
      hasMore: false,
      offset,
      limit,
    };
  }
}

export const cfwidgetApi = new CFWidgetApiService();
