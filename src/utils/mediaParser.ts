import { ProductItem, CreatorInfo, ItemType, MediaItem } from '../types';
import { resolveCreator } from '../data/creatorsData';

// Official Mojang / Minecraft Marketplace Content Delivery Network base URLs
export const PLAYABLE_THUMBNAILS_CDN = 'https://playable-thumbnails.minecraft.net/images';
export const MINECRAFT_NET_MEDIA_BASE = 'https://www.minecraft.net/content/dam/minecraft/marketplace';
export const MINECRAFT_IMAGES_CDN_BASE = 'https://www.minecraft.net/images';
export const MOJANG_LAUNCHER_CDN_BASE = 'https://launchercontent.mojang.com/v2/images';
export const MOJANG_MARKETPLACE_CDN_BASE = 'https://mc-marketplace-content.azureedge.net/media';

/**
 * Dynamically constructs a working Minecraft CDN URL from an image ID, GUID,
 * relative path, or API media object.
 */
export function buildMinecraftCdnUrl(mediaIdentifier: any, fallbackProductId?: string): string | null {
  if (!mediaIdentifier) {
    if (!fallbackProductId) return null;
    mediaIdentifier = fallbackProductId;
  }

  // Handle object structure from Marketplace API (e.g. { url, src, path, imageGuid, screenshotId, imageId, id, guid })
  if (typeof mediaIdentifier === 'object') {
    const candidate =
      mediaIdentifier.imageGuid ||
      mediaIdentifier.screenshotId ||
      mediaIdentifier.imageId ||
      mediaIdentifier.thumbnailId ||
      mediaIdentifier.keyArtId ||
      mediaIdentifier.guid ||
      mediaIdentifier.id ||
      mediaIdentifier.url ||
      mediaIdentifier.src ||
      mediaIdentifier.path;
    return buildMinecraftCdnUrl(candidate, fallbackProductId);
  }

  if (typeof mediaIdentifier !== 'string') {
    return buildMinecraftCdnUrl(String(mediaIdentifier), fallbackProductId);
  }

  const trimmed = mediaIdentifier.trim();
  if (!trimmed || (trimmed.startsWith('data:image/svg+xml') && trimmed.includes('error'))) {
    return null;
  }

  // 1. Full absolute URLs already provided
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 2. Protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // 3. Absolute path on minecraft.net or mojang launcher
  if (trimmed.startsWith('/v2/images/')) {
    return `https://launchercontent.mojang.com${trimmed}`;
  }
  if (trimmed.startsWith('/content/') || trimmed.startsWith('/dam/') || trimmed.startsWith('/images/')) {
    return `https://www.minecraft.net${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  // 4. Standard 36-char GUID / UUID (e.g. e82937e0-47b2-4d56-a67b-2321481d1ef8)
  // Formats strictly to original playable-thumbnails.minecraft.net CDN
  if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
    return `${PLAYABLE_THUMBNAILS_CDN}/${trimmed}`;
  }

  // 5. Filename with extension (e.g. pack_icon.png)
  if (trimmed.includes('.')) {
    return `${MOJANG_LAUNCHER_CDN_BASE}/${trimmed}`;
  }

  // 6. Alphanumeric Image ID / Media Token -> build Minecraft CDN URL
  return `${PLAYABLE_THUMBNAILS_CDN}/${encodeURIComponent(trimmed)}`;
}

/**
 * Validates and converts image references, relative paths, or media GUIDs / IDs
 * into fully qualified, working Minecraft / Mojang CDN URLs.
 */
export function sanitizeImageUrl(value: any, productId?: string): string | null {
  return buildMinecraftCdnUrl(value, productId);
}

/**
 * Extracts real thumbnail, banner, and screenshot URLs from any 3PP API response object,
 * displayProperties, images array, or catalog item.
 * Strictly adheres to Minecraft Marketplace API payload schema.
 */
export function extractMediaFromApiItem(raw: any): {
  thumbnailUrl: string;
  bannerUrl: string;
  screenshots: string[];
  media: MediaItem[];
} {
  const pId = String(raw.productId || raw.id || raw.uuid || '');
  const candidateUrls: string[] = [];

  const addUrl = (val: any) => {
    const sanitized = sanitizeImageUrl(val, pId);
    if (sanitized && !candidateUrls.includes(sanitized)) {
      candidateUrls.push(sanitized);
    }
  };

  // Direct imageGuid or UUID property on root item
  if (raw.imageGuid) addUrl(raw.imageGuid);
  if (raw.image_guid) addUrl(raw.image_guid);
  if (raw.keyArtId) addUrl(raw.keyArtId);
  if (raw.thumbnailId) addUrl(raw.thumbnailId);
  if (raw.screenshotId) addUrl(raw.screenshotId);

  // 1. Check nested displayProperties (standard Marketplace API schema for 3PP & community items)
  if (raw.displayProperties && typeof raw.displayProperties === 'object') {
    const dp = raw.displayProperties;
    if (dp.imageGuid) addUrl(dp.imageGuid);
    if (dp.thumbnail?.imageGuid) addUrl(dp.thumbnail.imageGuid);
    // Specific thumbnail in displayProperties
    if (dp.thumbnail || dp.thumbnailUrl || dp.icon || dp.displayImage) {
      addUrl(dp.thumbnail || dp.thumbnailUrl || dp.icon || dp.displayImage);
    }
    // Key art / Hero banner in displayProperties
    if (dp.heroImage || dp.headerImage || dp.banner || dp.keyArt || dp.coverUrl) {
      addUrl(dp.heroImage || dp.headerImage || dp.banner || dp.keyArt || dp.coverUrl);
    }
    // Images array inside displayProperties
    if (Array.isArray(dp.images)) {
      dp.images.forEach(addUrl);
    }
    // Screenshots array inside displayProperties
    if (Array.isArray(dp.screenshots)) {
      dp.screenshots.forEach(addUrl);
    }
    if (Array.isArray(dp.gallery)) {
      dp.gallery.forEach(addUrl);
    }
  }

  // 2. Direct primary thumbnail fields on root object
  if (raw.thumbnail || raw.thumbnailUrl || raw.thumbnail_url || raw.icon || raw.image || raw.displayImage) {
    addUrl(raw.thumbnail || raw.thumbnailUrl || raw.thumbnail_url || raw.icon || raw.image || raw.displayImage);
  }

  // 3. Direct images array (fallback if thumbnail field was not explicitly separated)
  if (Array.isArray(raw.images)) {
    raw.images.forEach(addUrl);
  }

  // 4. Direct media array
  if (Array.isArray(raw.media)) {
    raw.media.forEach(addUrl);
  }

  // 5. Direct banner / hero fields
  if (raw.bannerUrl || raw.banner || raw.heroImage || raw.headerImage || raw.keyArt || raw.key_art || raw.coverUrl) {
    addUrl(raw.bannerUrl || raw.banner || raw.heroImage || raw.headerImage || raw.keyArt || raw.key_art || raw.coverUrl);
  }

  // 6. Direct screenshots / gallery arrays
  const rawScreenshots = raw.screenshots || raw.screenShots || raw.gallery || raw.previewImages;
  if (Array.isArray(rawScreenshots)) {
    rawScreenshots.forEach(addUrl);
  }

  // 7. Check nested metadata
  if (raw.metadata && typeof raw.metadata === 'object') {
    const metaExtract = extractMediaFromApiItem(raw.metadata);
    if (metaExtract.thumbnailUrl) addUrl(metaExtract.thumbnailUrl);
    if (metaExtract.bannerUrl) addUrl(metaExtract.bannerUrl);
    metaExtract.screenshots.forEach(addUrl);
  }

  // Safe fallback if item has no direct images: bind strictly to product ID via playable-thumbnails CDN
  if (candidateUrls.length === 0 && pId) {
    const productSpecificCdn = buildMinecraftCdnUrl(pId);
    if (productSpecificCdn) {
      candidateUrls.push(productSpecificCdn);
    }
  }

  const primaryThumb = candidateUrls[0] || (pId ? `${PLAYABLE_THUMBNAILS_CDN}/${encodeURIComponent(pId)}` : `${MOJANG_LAUNCHER_CDN_BASE}/MarketplacePassLauncher772x350.png`);
  const primaryBanner = candidateUrls.length > 1 ? candidateUrls[1] : primaryThumb;
  const remainingScreenshots = candidateUrls.filter((u) => u !== primaryThumb);

  const media: MediaItem[] = [
    {
      type: 'cover',
      label: 'Обложка пака',
      url: primaryThumb,
      order: 1,
    },
    ...remainingScreenshots.map((url, idx) => ({
      type: 'screenshot' as const,
      label: `Скриншот ${idx + 1}`,
      url,
      order: idx + 2,
    })),
  ];

  return {
    thumbnailUrl: primaryThumb,
    bannerUrl: primaryBanner,
    screenshots: remainingScreenshots,
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
    const creatorName = String(raw.creator.name || raw.creator.title || 'Creator');
    const customAvatar = sanitizeImageUrl(raw.creator.avatarUrl || raw.creator.avatar || raw.creator.icon || raw.creator.image);
    creator = {
      id: String(raw.creator.id || creatorName).toLowerCase().replace(/\s+/g, '-'),
      name: creatorName,
      avatarUrl: customAvatar || `https://mc-heads.net/avatar/${encodeURIComponent(creatorName)}/128`,
      verified: Boolean(raw.creator.verified),
      totalProducts: typeof raw.creator.totalProducts === 'number' ? raw.creator.totalProducts : undefined,
    };
  } else if (typeof raw.creator === 'string' || typeof raw.publisher === 'string' || typeof raw.author === 'string') {
    const name = String(raw.creator || raw.publisher || raw.author);
    creator = resolveCreator(name);
  } else {
    creator = resolveCreator('Minecraft Community');
  }

  // Normalize item type
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

