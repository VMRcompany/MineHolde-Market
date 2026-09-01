import { ProductItem, CreatorInfo, ItemType, MediaItem } from '../types';
import { resolveCreator } from '../data/creatorsData';
import { getDistinctArtworkForProduct } from './imageFallback';

export const FALLBACK_BEDROCK_BANNER = 'https://launchercontent.mojang.com/v2/images/MarketplacePassLauncher772x350.png';
export const FALLBACK_BEDROCK_SCREENSHOTS = [
  'https://launchercontent.mojang.com/v2/images/DimensionClashLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/OneblockOnlineLaunchLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftTreasureHuntLauncher700x466.png',
];

/**
 * Ensures any image URL string is valid and absolute.
 */
export function sanitizeImageUrl(url: any): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:image/svg+xml') && trimmed.includes('error')) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/v2/images/')) {
    return `https://launchercontent.mojang.com${trimmed}`;
  }
  if (trimmed.startsWith('/content/')) {
    return `https://www.minecraft.net${trimmed}`;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

/**
 * Extracts real thumbnail, banner, and screenshot URLs from any 3PP API response object or catalog item.
 * Supports:
 * - standard thumbnailUrl, bannerUrl, screenshots
 * - 3PP images array: [{ url, type, title }, ...]
 * - 3PP media array: [{ url, type, label }, ...]
 * - metadata.images, metadata.media, properties.images
 * - promoImages, screenShots, displayImage, heroImage, keyArt, icon, image
 */
export function extractMediaFromApiItem(raw: any): {
  thumbnailUrl: string;
  bannerUrl: string;
  screenshots: string[];
  media: MediaItem[];
} {
  const screenshotsSet = new Set<string>();
  let extractedCover: string | null = null;
  let extractedThumb: string | null = null;

  // 1. Check explicit string fields
  const directThumb = sanitizeImageUrl(
    raw.thumbnailUrl || raw.thumbnail || raw.thumbnail_url || raw.icon || raw.image || raw.displayImage
  );
  const directBanner = sanitizeImageUrl(
    raw.bannerUrl || raw.banner || raw.heroImage || raw.headerImage || raw.keyArt || raw.key_art || raw.coverUrl
  );

  if (directBanner) extractedCover = directBanner;
  if (directThumb) extractedThumb = directThumb;

  // 2. Check 3PP media array
  if (Array.isArray(raw.media)) {
    for (const item of raw.media) {
      const url = sanitizeImageUrl(typeof item === 'string' ? item : item?.url || item?.src || item?.path);
      if (!url) continue;

      const type = typeof item === 'object' ? String(item.type || item.category || '').toLowerCase() : '';
      if (type.includes('cover') || type.includes('banner') || type.includes('keyart') || type.includes('hero')) {
        if (!extractedCover) extractedCover = url;
      } else if (type.includes('thumb') || type.includes('icon')) {
        if (!extractedThumb) extractedThumb = url;
      } else {
        screenshotsSet.add(url);
      }
    }
  }

  // 3. Check 3PP images array
  if (Array.isArray(raw.images)) {
    for (const item of raw.images) {
      const url = sanitizeImageUrl(typeof item === 'string' ? item : item?.url || item?.src || item?.path);
      if (!url) continue;

      const type = typeof item === 'object' ? String(item.type || item.title || '').toLowerCase() : '';
      if (type.includes('keyart') || type.includes('banner') || type.includes('cover') || type.includes('hero')) {
        if (!extractedCover) extractedCover = url;
      } else if (type.includes('thumb') || type.includes('icon') || type.includes('logo')) {
        if (!extractedThumb) extractedThumb = url;
      } else {
        screenshotsSet.add(url);
      }
    }
  }

  // 4. Check screenshots array
  const rawScreenshots = raw.screenshots || raw.screenShots || raw.gallery || raw.previewImages;
  if (Array.isArray(rawScreenshots)) {
    for (const item of rawScreenshots) {
      const url = sanitizeImageUrl(typeof item === 'string' ? item : item?.url || item?.src);
      if (url) {
        screenshotsSet.add(url);
      }
    }
  }

  // 5. Check metadata / properties nested objects
  if (raw.metadata && typeof raw.metadata === 'object') {
    const metaMedia = extractMediaFromApiItem(raw.metadata);
    if (!extractedCover && metaMedia.bannerUrl) extractedCover = metaMedia.bannerUrl;
    if (!extractedThumb && metaMedia.thumbnailUrl) extractedThumb = metaMedia.thumbnailUrl;
    metaMedia.screenshots.forEach((s) => screenshotsSet.add(s));
  }

  // Determine final cover and thumb
  const itemIdentifier = String(raw.id || raw.title || raw.uuid || raw.name || 'product');
  const distinctDefaultBanner = getDistinctArtworkForProduct(itemIdentifier, 0);
  const distinctDefaultThumb = getDistinctArtworkForProduct(itemIdentifier, 1);

  const finalCover = extractedCover || extractedThumb || distinctDefaultBanner;
  const finalThumb = extractedThumb || extractedCover || distinctDefaultThumb;

  // Filter out duplicates of cover in screenshots
  screenshotsSet.delete(finalCover);
  screenshotsSet.delete(finalThumb);

  let cleanScreenshots = Array.from(screenshotsSet);
  if (cleanScreenshots.length === 0) {
    cleanScreenshots = [
      getDistinctArtworkForProduct(itemIdentifier, 2),
      getDistinctArtworkForProduct(itemIdentifier, 3),
      getDistinctArtworkForProduct(itemIdentifier, 4),
    ].filter((s) => s !== finalCover && s !== finalThumb);
  }

  const media: MediaItem[] = [
    {
      type: 'cover',
      label: 'Заставка пака',
      url: finalCover,
      order: 1,
    },
    ...cleanScreenshots.map((url, idx) => ({
      type: 'screenshot' as const,
      label: `Скриншот ${idx + 1}`,
      url,
      order: idx + 2,
    })),
  ];

  return {
    thumbnailUrl: finalThumb,
    bannerUrl: finalCover,
    screenshots: cleanScreenshots,
    media,
  };
}

/**
 * Universal product normalizer that safely parses both 3PP third-party creators,
 * official Mojang packs, and community content without dropping non-verified authors.
 */
export function normalizeProduct(raw: any): ProductItem {
  const mediaData = extractMediaFromApiItem(raw);

  // Normalize creator
  let creator: CreatorInfo;
  if (raw.creator && typeof raw.creator === 'object') {
    creator = {
      id: String(raw.creator.id || raw.creator.name || 'creator').toLowerCase().replace(/\s+/g, '-'),
      name: String(raw.creator.name || raw.creator.title || 'Creator'),
      avatarUrl: sanitizeImageUrl(raw.creator.avatarUrl || raw.creator.avatar || raw.creator.icon) ||
        `https://mc-heads.net/avatar/${encodeURIComponent(raw.creator.name || 'Steve')}/128`,
      verified: Boolean(raw.creator.verified),
      totalProducts: typeof raw.creator.totalProducts === 'number' ? raw.creator.totalProducts : undefined,
    };
  } else if (typeof raw.creator === 'string' || typeof raw.publisher === 'string' || typeof raw.author === 'string') {
    const name = String(raw.creator || raw.publisher || raw.author);
    creator = resolveCreator(name);
  } else {
    creator = resolveCreator('Minecraft Community');
  }

  // Normalize type
  let type: ItemType = 'world';
  const rawType = String(raw.type || raw.contentType || raw.category || 'world').toLowerCase();
  if (rawType.includes('skin') || rawType === 'skinpack' || rawType === 'skin_pack') {
    type = 'skinpack';
  } else if (rawType.includes('texture') || rawType === 'resourcepack' || rawType === 'texturepack' || rawType === 'texture_pack') {
    type = 'resourcepack';
  } else if (rawType.includes('addon') || rawType.includes('add-on') || rawType === 'addon') {
    type = 'addon';
  } else if (rawType.includes('mashup') || rawType === 'mashup') {
    type = 'mashup';
  } else if (rawType.includes('mini') || rawType.includes('game') || rawType === 'mini_game_world') {
    type = 'mini_game_world';
  } else if (rawType.includes('persona')) {
    type = 'persona';
  } else {
    type = 'world';
  }

  const price = typeof raw.price === 'number' ? raw.price : (parseInt(raw.price, 10) || 0);
  const isFree = Boolean(raw.isFree || price === 0);
  const isSale = Boolean(raw.isSale || (raw.salePrice !== undefined && raw.salePrice < price));
  const salePrice = isSale && typeof raw.salePrice === 'number' ? raw.salePrice : undefined;
  const discountPercent = isSale && raw.discountPercent
    ? raw.discountPercent
    : (isSale && salePrice !== undefined && price > 0 ? Math.round(((price - salePrice) / price) * 100) : undefined);

  return {
    id: String(raw.id || raw.productId || raw.uuid || `item-${Math.random().toString(36).substring(2, 9)}`),
    uuid: String(raw.uuid || raw.packIdentity || raw.id || '00000000-0000-0000-0000-000000000000'),
    title: String(raw.title || raw.name || raw.displayName || 'Marketplace Item'),
    description: String(raw.description || raw.summary || raw.shortDescription || 'Minecraft Marketplace community creation.'),
    shortDescription: String(raw.shortDescription || raw.description || 'Minecraft Bedrock content.').slice(0, 150),
    type,
    category: String(raw.category || (type === 'world' ? 'Worlds' : type === 'skinpack' ? 'Skin Packs' : type === 'addon' ? 'Add-Ons' : type === 'resourcepack' ? 'Textures' : 'Marketplace')),
    creator,
    price,
    salePrice,
    discountPercent,
    isSale,
    isPopular: Boolean(raw.isPopular || (raw.ratingsCount && raw.ratingsCount > 20000)),
    isFeatured: Boolean(raw.isFeatured),
    isNew: Boolean(raw.isNew || String(raw.releaseDate || '').startsWith('2026') || String(raw.releaseDate || '').startsWith('2025')),
    isFree,
    rating: typeof raw.rating === 'number' ? raw.rating : 4.8,
    ratingsCount: typeof raw.ratingsCount === 'number' ? raw.ratingsCount : 1500,
    downloadSize: String(raw.downloadSize || raw.size || '35.0 MB'),
    releaseDate: String(raw.releaseDate || raw.publishDate || raw.createdDate || '2024-01-01'),
    updatedDate: raw.updatedDate ? String(raw.updatedDate) : undefined,
    version: String(raw.version || '1.21.0+'),
    thumbnailUrl: mediaData.thumbnailUrl,
    bannerUrl: mediaData.bannerUrl,
    screenshots: mediaData.screenshots,
    media: mediaData.media,
    tags: Array.isArray(raw.tags) ? raw.tags : [creator.name, type],
    keyFeatures: Array.isArray(raw.keyFeatures) && raw.keyFeatures.length > 0
      ? raw.keyFeatures
      : ['Совместимо с актуальной версией Bedrock', 'Многопользовательская поддержка', 'Уникальный дизайн от автора'],
    skins: Array.isArray(raw.skins) ? raw.skins : [],
    worldFeatures: raw.worldFeatures || undefined,
  };
}
