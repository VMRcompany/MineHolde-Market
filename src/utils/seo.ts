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

export function resolveProductSection(product: ProductItem): string {
  const projType = String((product as any).project_type || product.type || '').toLowerCase();
  const cat = String(product.category || '').toLowerCase();
  const tags = Array.isArray(product.tags) ? product.tags.map((t) => String(t).toLowerCase()) : [];

  if (projType === 'resourcepack' || cat.includes('ресурс') || cat.includes('resource') || cat.includes('текстур') || tags.includes('resourcepack')) {
    return 'resourcepacks';
  }
  if (projType === 'datapack' || cat.includes('данных') || cat.includes('datapack') || tags.includes('datapack')) {
    return 'datapacks';
  }
  if (projType === 'shader' || cat.includes('шейдер') || cat.includes('shader') || tags.includes('shader')) {
    return 'shaders';
  }
  if (projType === 'modpack' || cat.includes('модпак') || cat.includes('modpack') || tags.includes('modpack')) {
    return 'modpacks';
  }
  if (projType === 'plugin' || cat.includes('плагин') || cat.includes('plugin') || tags.includes('plugin')) {
    return 'plugins';
  }
  if (projType === 'server' || cat.includes('сервер') || cat.includes('server') || (product as any).is_server) {
    return 'servers';
  }
  return 'mods';
}

/**
 * Builds title strictly following SEO instruction:
 * - Моды: "Скачать мод [Название] для Minecraft Java Edition — MineHolde Market"
 * - Наборы ресурсов: "Скачать ресурс-пак [Название] для Minecraft Java Edition — MineHolde Market"
 * - Наборы данных: "Скачать дата-пак [Название] для Minecraft Java Edition — MineHolde Market"
 * - Шейдеры: "Скачать шейдер [Название] для Minecraft Java Edition — MineHolde Market"
 * - Модпаки: "Скачать модпак [Название] для Minecraft Java Edition — MineHolde Market"
 * - Плагины: "Скачать плагин [Название] для Minecraft Java Edition — MineHolde Market"
 * - Серверы: "Сервер [Название] для Minecraft Java Edition — MineHolde Market"
 */
export function formatProductTitle(title?: string, section: string = 'mods'): string {
  if (!title) return DEFAULT_TITLE;
  const name = title.trim();
  switch (section.toLowerCase()) {
    case 'resourcepacks':
      return `Скачать ресурс-пак ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'datapacks':
      return `Скачать дата-пак ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'shaders':
      return `Скачать шейдер ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'modpacks':
      return `Скачать модпак ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'plugins':
      return `Скачать плагин ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'servers':
      return `Сервер ${name} для Minecraft Java Edition — MineHolde Market`;
    case 'mods':
    default:
      return `Скачать мод ${name} для Minecraft Java Edition — MineHolde Market`;
  }
}

/**
 * Builds default SEO metadata for category root tabs.
 */
export function getCategorySeo(category: string): { title: string; description: string; url: string } {
  const norm = (category || '').toLowerCase().trim();
  if (norm.includes('ресурс') || norm.includes('resource')) {
    return {
      title: 'Каталог ресурс-паков для Minecraft Java Edition — MineHolde Market',
      description: 'Скачать текстуры и ресурс-паки для Minecraft Java Edition на MineHolde Market. Высокое качество и оптимизация.',
      url: 'https://market.mineholde.pro/resourcepacks',
    };
  }
  if (norm.includes('данных') || norm.includes('datapack')) {
    return {
      title: 'Каталог дата-паков для Minecraft Java Edition — MineHolde Market',
      description: 'Скачать дата-паки для Minecraft Java Edition на MineHolde Market. Новые механики и кастомные возможности.',
      url: 'https://market.mineholde.pro/datapacks',
    };
  }
  if (norm.includes('шейдер') || norm.includes('shader')) {
    return {
      title: 'Каталог шейдеров для Minecraft Java Edition — MineHolde Market',
      description: 'Скачать реалистичные шейдеры для Minecraft Java Edition на MineHolde Market. Красивые тени, вода и освещение.',
      url: 'https://market.mineholde.pro/shaders',
    };
  }
  if (norm.includes('модпак') || norm.includes('modpack')) {
    return {
      title: 'Каталог модпаков для Minecraft Java Edition — MineHolde Market',
      description: 'Скачать готовые сборки модов (модпаки) для Minecraft Java Edition на MineHolde Market.',
      url: 'https://market.mineholde.pro/modpacks',
    };
  }
  if (norm.includes('плагин') || norm.includes('plugin')) {
    return {
      title: 'Каталог плагинов для Minecraft Java Edition — MineHolde Market',
      description: 'Скачать плагины для серверов Minecraft Java Edition на MineHolde Market. Paper, Spigot, Purpur.',
      url: 'https://market.mineholde.pro/plugins',
    };
  }
  if (norm.includes('сервер') || norm.includes('server')) {
    return {
      title: 'Каталог серверов для Minecraft Java Edition — MineHolde Market',
      description: 'Мониторинг и список серверов Minecraft Java Edition на MineHolde Market. Подключение и онлайн.',
      url: 'https://market.mineholde.pro/servers',
    };
  }
  return {
    title: 'Каталог модов для Minecraft Java Edition — MineHolde Market',
    description: 'Скачать модификации и моды для Minecraft Java Edition на MineHolde Market. Fabric, Forge, NeoForge.',
    url: 'https://market.mineholde.pro/mods',
  };
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
 * whenever a product card or modal is opened, and restores category defaults when closed.
 */
export function updateProductSeo(product: ProductItem | null, activeCategory?: string) {
  if (typeof document === 'undefined') return;

  if (product) {
    const section = resolveProductSection(product);
    const title = formatProductTitle(product.title, section);
    const description = cleanProductDescription(product.description || product.shortDescription);
    const imageUrl = getProductMainImage(product);
    const productUrl = `https://market.mineholde.pro/${section}/${encodeURIComponent(product.id)}`;

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
    // Reset back to category tab defaults
    const categoryInfo = getCategorySeo(activeCategory || 'Mods');
    document.title = categoryInfo.title;
    setMetaTag('name', 'description', categoryInfo.description);
    setMetaTag('property', 'og:title', categoryInfo.title);
    setMetaTag('property', 'og:description', categoryInfo.description);
    setMetaTag('property', 'og:image', DEFAULT_IMAGE);
    setMetaTag('property', 'og:url', categoryInfo.url);
    setMetaTag('name', 'twitter:title', categoryInfo.title);
    setMetaTag('name', 'twitter:description', categoryInfo.description);
    setMetaTag('name', 'twitter:image', DEFAULT_IMAGE);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', categoryInfo.url);
    }
  }
}
