import { ProductItem } from '../types';

const DEFAULT_TITLE = 'MineHolde Market — Каталог модов, текстур и миров';
const DEFAULT_DESCRIPTION =
  'MineHolde Market — каталог модов, скинов, миров, дополнений и текстур для Minecraft Java Edition.';
const DEFAULT_IMAGE = 'https://market.mineholde.pro/icons/icon-512x512.png';

/**
 * Extracts the primary/main image of a product for Google snippets and social cards.
 * Order of precedence:
 * 1. Primary pack logo / thumbnail (thumbnailUrl)
 * 2. Primary banner / media header (bannerUrl)
 * 3. First screenshot from gallery (screenshots[0])
 * 4. Default high-resolution MineHolde badge
 */
export function getProductMainImage(product: ProductItem): string {
  if (!product) return DEFAULT_IMAGE;

  let img =
    product.thumbnailUrl ||
    product.bannerUrl ||
    (Array.isArray(product.screenshots) && product.screenshots.length > 0 ? product.screenshots[0] : '') ||
    '';

  img = String(img).trim();

  // If it's an SVG data URI or empty, fallback to banner or default
  if (!img || img.startsWith('data:image/svg')) {
    if (product.bannerUrl && !product.bannerUrl.startsWith('data:image/svg')) {
      img = product.bannerUrl;
    } else {
      img = DEFAULT_IMAGE;
    }
  }

  // Ensure absolute URL for Googlebot and OpenGraph parsers
  if (img.startsWith('/')) {
    img = `https://market.mineholde.pro${img}`;
  }

  return img;
}

/**
 * Cleans product description from REST API, stripping technical markdown and HTML tags,
 * and restricting to 150 characters for optimal Google search snippets.
 */
export function cleanProductDescription(desc?: string): string {
  if (!desc) {
    return 'Скачать оригинальный мод для Minecraft Java Edition на MineHolde Market.';
  }

  const cleaned = desc
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`~>]/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Скачать оригинальный мод для Minecraft Java Edition на MineHolde Market.';
  }

  if (cleaned.length <= 150) {
    return cleaned;
  }

  // Truncate at word boundary within 150 chars
  const slice = cleaned.slice(0, 147);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 100) {
    return slice.slice(0, lastSpace).trim() + '...';
  }
  return slice.trim() + '...';
}

/**
 * Builds title strictly following SEO instruction:
 * "Скачать мод [Название мода] для Minecraft Java Edition — MineHolde Market"
 */
export function formatProductTitle(title?: string): string {
  if (!title) return DEFAULT_TITLE;
  return `Скачать мод ${title.trim()} для Minecraft Java Edition — MineHolde Market`;
}

/**
 * Helper to update or create a meta tag by name or property attribute.
 */
function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Dynamically updates document <head> SEO tags (title, description, og:image, twitter:image)
 * whenever a product card or modal is opened, and restores defaults when closed.
 */
export function updateProductSeo(product: ProductItem | null) {
  if (typeof document === 'undefined') return;

  if (product) {
    const title = formatProductTitle(product.title);
    const description = cleanProductDescription(product.description || product.shortDescription);
    const imageUrl = getProductMainImage(product);
    const productUrl = `https://market.mineholde.pro/mods/${encodeURIComponent(product.id)}`;

    // 1. Browser Title
    document.title = title;

    // 2. Google Standard Meta Description
    setMetaTag('name', 'description', description);

    // 3. OpenGraph Tags (Facebook, Discord, Telegram, VK, WhatsApp)
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', imageUrl);
    setMetaTag('property', 'og:url', productUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'MineHolde Market');

    // 4. Twitter / X Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', imageUrl);

    // 5. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', productUrl);
  } else {
    // Reset back to catalog defaults
    document.title = DEFAULT_TITLE;
    setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
    setMetaTag('property', 'og:title', DEFAULT_TITLE);
    setMetaTag('property', 'og:description', DEFAULT_DESCRIPTION);
    setMetaTag('property', 'og:image', DEFAULT_IMAGE);
    setMetaTag('property', 'og:url', 'https://market.mineholde.pro/');
    setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
    setMetaTag('name', 'twitter:description', DEFAULT_DESCRIPTION);
    setMetaTag('name', 'twitter:image', DEFAULT_IMAGE);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://market.mineholde.pro/');
    }
  }
}
