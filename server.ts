import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MARKETPLACE_PRODUCTS, CREATORS, PROMOTIONS, resolveCreator } from './src/data/marketplaceData.js';
import { FEATURED_SERVERS } from './src/data/serversData.js';
import cfwidgetHandler from './api/cfwidget.js';
import { getProductFormat, generateBedrockBuffer } from './api/bedrockPackager.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check endpoints FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper to sanitize string
const normalize = (str?: any) => (str ? String(str).toLowerCase().trim() : '');

// Universal hierarchical & chronological sorter & pagination processor
// Requirement: Modrinth mods strictly at the TOP, Marketplace items at the BOTTOM
function processProductStream(
  products: typeof MARKETPLACE_PRODUCTS,
  query: { skip?: any; limit?: any; sort?: any; order?: any; page?: any }
) {
  const mrList = products.filter((p) => p.id.startsWith('mr-') || p.id.startsWith('mod-') || p.id.startsWith('cf-'));
  const mpList = products.filter((p) => !p.id.startsWith('mr-') && !p.id.startsWith('mod-') && !p.id.startsWith('cf-'));

  const sort = query.sort ? String(query.sort).toLowerCase() : 'newest';
  const order = query.order ? String(query.order).toLowerCase() : 'desc';

  const sortItems = (arr: typeof MARKETPLACE_PRODUCTS) => {
    const sub = [...arr];
    if (sort === 'newest' || sort === 'chronological' || sort === 'date') {
      sub.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    } else if (sort === 'oldest') {
      sub.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
    } else if (sort === 'popular') {
      sub.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));
    } else if (sort === 'rating') {
      sub.sort((a, b) => b.rating - a.rating || b.ratingsCount - a.ratingsCount);
    } else if (sort === 'price-asc') {
      sub.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-desc') {
      sub.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'name-asc') {
      sub.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sub.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    }

    if (order === 'asc' && (sort === 'newest' || sort === 'chronological' || sort === 'date')) {
      sub.reverse();
    }
    return sub;
  };

  const sortedMr = sortItems(mrList);
  const sortedMp = sortItems(mpList);

  // Modrinth items at the TOP, Marketplace items at the BOTTOM
  const list = [...sortedMr, ...sortedMp];

  const totalCount = list.length;
  let skip = 0;
  if (query.skip !== undefined) {
    skip = parseInt(String(query.skip), 10) || 0;
  } else if (query.page !== undefined) {
    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const limit = parseInt(String(query.limit), 10) || 20;
    skip = (page - 1) * limit;
  }

  const limitParam = query.limit !== undefined ? parseInt(String(query.limit), 10) : undefined;
  const limit = limitParam !== undefined && !isNaN(limitParam) && limitParam > 0 ? limitParam : totalCount;

  const paginated = list.slice(skip, skip + limit);
  const hasMore = skip + paginated.length < totalCount;

  return {
    totalCount,
    skip,
    limit,
    hasMore,
    products: paginated,
  };
}

// Proxy helper with fallback & browser User-Agent headers
async function fetchMinecraftApiOrFallback(
  req: Request,
  res: Response,
  endpointName: string,
  fallbackHandler: () => any
) {
  try {
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(req.query)) {
      if (val !== undefined && val !== null) {
        queryParams.append(key, String(val));
      }
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const upstreamUrl = `https://www.minecraft.net/bin/minecraft/${endpointName}${queryString}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (upstreamRes.ok) {
        const contentType = upstreamRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await upstreamRes.json();
          return res.json({ source: 'live_upstream', ...data });
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    // Run custom fallback engine
    const fallbackResult = fallbackHandler();
    if (fallbackResult === null || fallbackResult === undefined) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: `Resource not found on endpoint ${endpointName}`,
      });
    }
    return res.json(fallbackResult);
  } catch (err: any) {
    return res.status(500).json({
      statusCode: 500,
      error: 'Invalid Input or Internal Error',
      message: err.message,
    });
  }
}

// ----------------------------------------------------
// 1. /bin/minecraft/productmanagement.productdetails.json
// Returns the item details of the provided item ID
// Query: id (Item ID)
// ----------------------------------------------------
const handleProductDetails = async (req: Request, res: Response) => {
  const itemId = req.query.id as string;
  if (!itemId) {
    return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Item ID is required.' });
  }

  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.productdetails.json', () => {
    const product = MARKETPLACE_PRODUCTS.find(
      p => p.id.toLowerCase() === itemId.toLowerCase() || p.uuid.toLowerCase() === itemId.toLowerCase()
    );
    if (!product) return null;

    const coverUrl = product.bannerUrl || product.thumbnailUrl;
    const cleanScreenshots = (product.screenshots || []).filter(s => s && s !== coverUrl);
    const media = [
      { type: 'cover', label: 'Заставка пака', url: coverUrl, order: 1 },
      ...cleanScreenshots.map((url, idx) => ({
        type: 'screenshot',
        label: `Скриншот ${idx + 1}`,
        url,
        order: idx + 2,
      })),
    ];

    return {
      statusCode: 200,
      product: {
        ...product,
        bannerUrl: coverUrl,
        screenshots: cleanScreenshots,
      },
      details: {
        id: product.id,
        uuid: product.uuid,
        title: product.title,
        description: product.description,
        type: product.type,
        category: product.category,
        creator: product.creator,
        price: product.price,
        salePrice: product.salePrice,
        discountPercent: product.discountPercent,
        rating: product.rating,
        ratingsCount: product.ratingsCount,
        downloadSize: product.downloadSize,
        releaseDate: product.releaseDate,
        updatedDate: product.updatedDate,
        version: product.version,
        thumbnailUrl: product.thumbnailUrl,
        bannerUrl: coverUrl,
        screenshots: cleanScreenshots,
        media,
        tags: product.tags,
        keyFeatures: product.keyFeatures,
        skins: product.skins || [],
        worldFeatures: product.worldFeatures,
      },
    };
  });
};

// ----------------------------------------------------
// 2. /bin/minecraft/productmanagement.autosuggest.json
// Returns Marketplace items based on the search term
// Query: locate/locale, term (Not required but always null if not there)
// ----------------------------------------------------
const handleAutoSuggest = async (req: Request, res: Response) => {
  const term = normalize(req.query.term);
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.autosuggest.json', () => {
    if (!term) {
      // return trending suggestions
      const defaultSuggestions = MARKETPLACE_PRODUCTS.slice(0, 5).map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        creator: p.creator.name,
        thumbnailUrl: p.thumbnailUrl,
        price: p.isSale && p.salePrice !== undefined ? p.salePrice : p.price,
      }));
      return {
        term: null,
        suggestions: defaultSuggestions,
        totalMatches: defaultSuggestions.length,
      };
    }

    const matches = MARKETPLACE_PRODUCTS.filter(p =>
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.creator.name.toLowerCase().includes(term) ||
      p.tags.some(t => t.toLowerCase().includes(term)) ||
      p.category.toLowerCase().includes(term)
    ).slice(0, 8);

    return {
      term,
      suggestions: matches.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        creator: p.creator.name,
        thumbnailUrl: p.thumbnailUrl,
        price: p.isSale && p.salePrice !== undefined ? p.salePrice : p.price,
      })),
      totalMatches: matches.length,
    };
  });
};

// ----------------------------------------------------
// ----------------------------------------------------
// 3. /bin/minecraft/productmanagement.productsinfobytype.json
// Returns items with the same type provided
// Query: locate, type, skip, limit, sort, order, page
// ----------------------------------------------------
const handleProductsByType = async (req: Request, res: Response) => {
  const type = normalize(req.query.type);
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.productsinfobytype.json', () => {
    let matched = MARKETPLACE_PRODUCTS;
    if (type && type !== 'all') {
      matched = MARKETPLACE_PRODUCTS.filter(p => {
        if (p.type.toLowerCase() === type) return true;
        if (type === 'world' && (p.type.includes('world') || p.type === 'mashup')) return true;
        if ((type === 'skins' || type === 'skinpack') && (p.type === 'skinpack' || (p.type as string) === 'skin_pack')) return true;
        if ((type === 'textures' || type === 'resourcepack') && (p.type === 'resourcepack' || (p.type as string) === 'texture_pack')) return true;
        if (type === 'addon' && p.type === 'addon') return true;
        if (type === 'mashup' && p.type === 'mashup') return true;
        if (type === 'mini_game_world' && p.type === 'mini_game_world') return true;
        return false;
      });
    }

    const processed = processProductStream(matched, req.query);
    return {
      statusCode: 200,
      type: type || 'all',
      ...processed,
    };
  });
};

// ----------------------------------------------------
// 4. /bin/minecraft/productmanagement.productsbydescrpition.json
// Returns Marketplace items based on search term, description based
// Query: locate, term, limit, skip, sort, order
// ----------------------------------------------------
const handleProductsByDescription = async (req: Request, res: Response) => {
  const term = normalize(req.query.term);

  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.productsbydescrpition.json', () => {
    let results = MARKETPLACE_PRODUCTS;
    if (term) {
      results = MARKETPLACE_PRODUCTS.filter(p =>
        p.description.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term) ||
        p.title.toLowerCase().includes(term) ||
        p.creator.name.toLowerCase().includes(term) ||
        p.keyFeatures.some(f => f.toLowerCase().includes(term)) ||
        p.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    const processed = processProductStream(results, req.query);
    return {
      statusCode: 200,
      term: term || null,
      ...processed,
    };
  });
};

// ----------------------------------------------------
// 5. /bin/minecraft/productmanagement.uuiddata.json
// Returns an item based on UUID from packIdentity
// Query: locate, uuid, type
// ----------------------------------------------------
const handleUuidData = async (req: Request, res: Response) => {
  const uuid = normalize(req.query.uuid);
  if (!uuid) {
    return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'UUID is required' });
  }

  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.uuiddata.json', () => {
    const product = MARKETPLACE_PRODUCTS.find(p => p.uuid.toLowerCase() === uuid);
    if (!product) return null;
    return {
      statusCode: 200,
      uuid: product.uuid,
      packIdentity: product.uuid,
      type: req.query.type || product.type,
      product,
    };
  });
};

// ----------------------------------------------------
// 6. /bin/minecraft/productmanagement.categorydata.json
// Returns all of the items from a specific category
// Query: locate, category, skip, limit, sort, order, page
// ----------------------------------------------------
const handleCategoryData = async (req: Request, res: Response) => {
  const category = normalize(req.query.category);
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.categorydata.json', () => {
    let matched = MARKETPLACE_PRODUCTS;
    if (category && category !== 'all') {
      if (category === 'popular') {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.isPopular);
      } else if (category.includes('sale') || category.includes('deal')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.isSale);
      } else if (category.includes('free')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.isFree || p.price === 0);
      } else if (category.includes('skin')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.type === 'skinpack' || (p.type as string) === 'skin_pack');
      } else if (category.includes('world') || category.includes('map')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.type.includes('world') || p.type === 'mashup');
      } else if (category.includes('addon') || category.includes('add-on')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.type === 'addon');
      } else if (category.includes('texture') || category.includes('pack')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.type === 'resourcepack' || (p.type as string) === 'texture_pack');
      } else if (category.includes('mini') || category.includes('game')) {
        matched = MARKETPLACE_PRODUCTS.filter(p => p.type === 'mini_game_world' || p.category === 'Mini-Games');
      } else {
        matched = MARKETPLACE_PRODUCTS.filter(p =>
          p.category.toLowerCase() === category ||
          p.tags.some(t => t.toLowerCase() === category) ||
          p.type.toLowerCase().includes(category)
        );
      }
    }

    const processed = processProductStream(matched, req.query);
    return {
      statusCode: 200,
      category: req.query.category || 'All',
      ...processed,
    };
  });
};

// ----------------------------------------------------
// 7. /bin/minecraft/productmanagement.filterproduct.json
// Shows all items for a specific creator
// Query: locate, creatorId (Creator name or ID), limit, skip, sort, order
// Status codes: 200 OK, 404 Not Found, 500 Invalid Input
// ----------------------------------------------------
const handleFilterProduct = async (req: Request, res: Response) => {
  const creatorId = normalize(req.query.creatorId);
  if (!creatorId) {
    return res.status(500).json({
      statusCode: 500,
      error: 'Invalid Input',
      message: 'creatorId parameter is required for filterproduct',
    });
  }

  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.filterproduct.json', () => {
    const creator = resolveCreator(creatorId);

    const items = MARKETPLACE_PRODUCTS.filter(
      p => p.creator.id.toLowerCase() === creatorId ||
           p.creator.name.toLowerCase() === creatorId ||
           p.creator.name.toLowerCase().includes(creatorId)
    );

    const processed = processProductStream(items, req.query);

    return {
      statusCode: 200,
      creator,
      ...processed,
    };
  });
};

// ----------------------------------------------------
// 8. /bin/minecraft/productmanagement.promotiondetails.json
// Returns the current promotioned items if available
// Query: locale/locate
// ----------------------------------------------------
const handlePromotionDetails = async (req: Request, res: Response) => {
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.promotiondetails.json', () => {
    return {
      statusCode: 200,
      campaigns: PROMOTIONS,
      featuredPromotions: PROMOTIONS.map(promo => {
        const items = MARKETPLACE_PRODUCTS.filter(p => promo.featuredProductIds.includes(p.id));
        return {
          ...promo,
          items,
        };
      }),
      activeDiscounts: MARKETPLACE_PRODUCTS.filter(p => p.isSale),
    };
  });
};

// ----------------------------------------------------
// 9. /bin/minecraft/productmanagement.mostpopproducts.json
// Returns the current most popular items
// Query: locate
// ----------------------------------------------------
const handleMostPopProducts = async (req: Request, res: Response) => {
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.mostpopproducts.json', () => {
    const popularItems = [...MARKETPLACE_PRODUCTS]
      .sort((a, b) => b.ratingsCount - a.ratingsCount)
      .slice(0, 10);
    return {
      statusCode: 200,
      locate: req.query.locate || 'en-us',
      totalCount: popularItems.length,
      products: popularItems,
    };
  });
};

// ----------------------------------------------------
// 10. /bin/minecraft/productmanagement.freeproducts.json
// Returns free Marketplace items
// Query: locate
// ----------------------------------------------------
const handleFreeProducts = async (req: Request, res: Response) => {
  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.freeproducts.json', () => {
    const freeItems = MARKETPLACE_PRODUCTS.filter(p => p.isFree || p.price === 0);
    return {
      statusCode: 200,
      locate: req.query.locate || 'en-us',
      totalCount: freeItems.length,
      products: freeItems,
    };
  });
};

// ----------------------------------------------------
// 11. /bin/minecraft/productmanagement.saleproducts.json
// Returns the sale details of the provided item ID (comma-separated or single)
// Query: locate, id
// Status codes: 200 OK, 404 Not Found, 500 Invalid Input
// ----------------------------------------------------
const handleSaleProducts = async (req: Request, res: Response) => {
  const idParam = req.query.id as string;
  if (!idParam) {
    return res.status(500).json({
      statusCode: 500,
      error: 'Invalid Input',
      message: 'id parameter is required (single or comma-separated item IDs)',
    });
  }

  return fetchMinecraftApiOrFallback(req, res, 'productmanagement.saleproducts.json', () => {
    const ids = idParam.split(',').map(s => s.trim().toLowerCase());
    const matchedSales: any[] = [];

    for (const id of ids) {
      const product = MARKETPLACE_PRODUCTS.find(
        p => p.id.toLowerCase() === id || p.uuid.toLowerCase() === id
      );
      if (product && product.isSale) {
        matchedSales.push({
          id: product.id,
          uuid: product.uuid,
          title: product.title,
          originalPrice: product.price,
          salePrice: product.salePrice ?? Math.round(product.price * 0.5),
          discountPercent: product.discountPercent ?? 50,
          saleStartDate: '2024-04-01T00:00:00Z',
          saleEndDate: '2024-05-30T23:59:59Z',
          bannerUrl: product.bannerUrl,
          product,
        });
      }
    }

    if (matchedSales.length === 0) {
      return null; // triggers 404 Not Found
    }

    return {
      statusCode: 200,
      locate: req.query.locate || 'en-us',
      totalItems: matchedSales.length,
      sales: matchedSales,
    };
  });
};

// ----------------------------------------------------
// 12. /bin/minecraft/servermanagement.featuredservers.json
// Returns official Minecraft Bedrock Partner & Featured Servers
// Query: locate, search, tag, limit, skip
// ----------------------------------------------------
const handleFeaturedServers = async (req: Request, res: Response) => {
  return fetchMinecraftApiOrFallback(req, res, 'servermanagement.featuredservers.json', () => {
    const search = normalize(req.query.search || req.query.q);
    const tag = normalize(req.query.tag);

    let servers = [...FEATURED_SERVERS];

    if (search) {
      servers = servers.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.creatorName.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search) ||
        s.address.toLowerCase().includes(search) ||
        s.featuredGames.some(g => g.toLowerCase().includes(search)) ||
        s.tags.some(t => t.toLowerCase().includes(search))
      );
    }

    if (tag) {
      servers = servers.filter(s =>
        s.tags.some(t => t.toLowerCase().includes(tag)) ||
        s.featuredGames.some(g => g.toLowerCase().includes(tag))
      );
    }

    const totalOnline = servers.reduce((acc, s) => acc + (s.onlinePlayers || 0), 0);

    return {
      statusCode: 200,
      totalCount: servers.length,
      totalOnlinePlayers: totalOnline,
      servers,
      timestamp: new Date().toISOString(),
    };
  });
};

// ----------------------------------------------------
// 13. /bin/minecraft/servermanagement.serverdetails.json
// Returns details for a specific server by ID or IP
// Query: id, address
// ----------------------------------------------------
const handleServerDetails = async (req: Request, res: Response) => {
  const id = normalize(req.query.id);
  const address = normalize(req.query.address);

  if (!id && !address) {
    return res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: 'Server id or address is required',
    });
  }

  return fetchMinecraftApiOrFallback(req, res, 'servermanagement.serverdetails.json', () => {
    const server = FEATURED_SERVERS.find(s =>
      (id && s.id.toLowerCase() === id) ||
      (id && s.name.toLowerCase() === id) ||
      (address && s.address.toLowerCase() === address)
    );

    if (!server) return null;

    return {
      statusCode: 200,
      server,
      relatedMarketplacePacks: MARKETPLACE_PRODUCTS.filter(p =>
        p.creator.name.toLowerCase().includes(server.creatorName.toLowerCase()) ||
        p.creator.id.toLowerCase().includes(server.creatorId?.toLowerCase() || '')
      ).slice(0, 4),
    };
  });
};

// ----------------------------------------------------
// MODRINTH REST API SERVER-SIDE PROXY & RESOLVER
// Fetches 100% open-source mods and packs from https://api.modrinth.com/v2/search
// Parameters: query, facets, index='newest', limit=50, offset=0
// No API keys required, bypasses regional blocks, and resolves direct file downloads
// ----------------------------------------------------
const CURATED_MODRINTH_MODS = [
  {
    project_id: 'AANobbMI',
    slug: 'sodium',
    title: 'Sodium',
    author: 'jellysquid3',
    description: 'Революционный движок рендеринга для Minecraft, многократно увеличивающий FPS и оптимизирующий графику.',
    icon_url: 'https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp',
    downloads: 218962866,
    follows: 180000,
    versions: ['1.21.4'],
    date_created: '2026-02-20T12:00:00.000Z',
    date_modified: '2026-03-01T15:00:00.000Z',
    latest_version: 'gQDMcWww',
    downloadUrl: 'https://cdn.modrinth.com/data/AANobbMI/versions/gQDMcWww/sodium-neoforge-0.9.2-beta.1%2Bmc26.2.jar',
    project_type: 'mod',
    categories: ['optimization'],
  },
  {
    project_id: 'YL57xq9U',
    slug: 'iris',
    title: 'Iris Shaders',
    author: 'coderbot',
    description: 'Современный шейдерный мод с открытым исходным кодом, обеспечивающий максимальную производительность в связке с Sodium.',
    icon_url: 'https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp',
    downloads: 170437712,
    follows: 140000,
    versions: ['1.21.4'],
    date_created: '2026-02-18T12:00:00.000Z',
    date_modified: '2026-02-28T16:00:00.000Z',
    latest_version: 'iris-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/YL57xq9U/versions/iris-1.8.8.jar',
    project_type: 'mod',
    categories: ['shaders'],
  },
  {
    project_id: 'P7dR8mSH',
    slug: 'fabric-api',
    title: 'Fabric API',
    author: 'modmuss50',
    description: 'Базовая библиотека и основной слой совместимости для работы модов на Fabric.',
    icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
    downloads: 246419932,
    follows: 210000,
    versions: ['1.21.4'],
    date_created: '2026-02-26T12:00:00.000Z',
    date_modified: '2026-03-02T10:00:00.000Z',
    latest_version: 'fab-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/P7dR8mSH/versions/fabric-api-0.108.0+1.21.4.jar',
    project_type: 'mod',
    categories: ['library'],
  },
  {
    project_id: 'uXXizFIs',
    slug: 'ferrite-core',
    title: 'FerriteCore',
    author: 'malte0811',
    description: 'Существенное снижение потребления оперативной памяти Minecraft (RAM) до 40-50%.',
    icon_url: 'https://cdn.modrinth.com/data/uXXizFIs/222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp',
    downloads: 146449243,
    follows: 95000,
    versions: ['1.21.4'],
    date_created: '2026-01-10T12:00:00.000Z',
    date_modified: '2026-02-15T14:00:00.000Z',
    latest_version: 'fc-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/uXXizFIs/versions/ferritecore-7.0.0.jar',
    project_type: 'mod',
    categories: ['optimization'],
  },
  {
    project_id: 'gvQqBUqZ',
    slug: 'lithium',
    title: 'Lithium',
    author: 'jellysquid3',
    description: 'Оптимизация физики, AI мобов, тиков мира и спавна сущностей. Повышает стабильность 20 TPS.',
    icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/bcc8686c13af0143adf4285d741256af824f70b7_96.webp',
    downloads: 123983417,
    follows: 88000,
    versions: ['1.21.4'],
    date_created: '2026-01-20T12:00:00.000Z',
    date_modified: '2026-02-22T11:00:00.000Z',
    latest_version: 'lit-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/gvQqBUqZ/versions/lithium-0.14.0.jar',
    project_type: 'mod',
    categories: ['optimization'],
  },
  {
    project_id: 'LN9AmptJ',
    slug: 'create',
    title: 'Create',
    author: 'simibubi',
    description: 'Масштабный мод на кинематическую механику, шестеренки, поезда и автоматизацию в стиле стимпанк.',
    icon_url: 'https://cdn.modrinth.com/data/LN9AmptJ/icon.png',
    downloads: 189200000,
    follows: 165000,
    versions: ['1.21.4'],
    date_created: '2026-02-10T12:00:00.000Z',
    date_modified: '2026-02-27T18:00:00.000Z',
    latest_version: 'create-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/LN9AmptJ/versions/create-1.21.4.jar',
    project_type: 'mod',
    categories: ['technology', 'automation'],
  },
  {
    project_id: 'u6dRKJwZ',
    slug: 'jei',
    title: 'Just Enough Items (JEI)',
    author: 'mezz',
    description: 'Мгновенный просмотр предметов и всех рецептов крафта, плавки и обработки.',
    icon_url: 'https://cdn.modrinth.com/data/u6dRKJwZ/icon.png',
    downloads: 312584120,
    follows: 240000,
    versions: ['1.21.4'],
    date_created: '2026-02-15T12:00:00.000Z',
    date_modified: '2026-02-28T14:00:00.000Z',
    latest_version: 'jei-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/u6dRKJwZ/versions/jei-1.21.4.jar',
    project_type: 'mod',
    categories: ['utility'],
  },
  {
    project_id: '5ZwdcRci',
    slug: 'immediatelyfast',
    title: 'ImmediatelyFast',
    author: 'RaphiMC',
    description: 'Оптимизация рендеринга интерфейса, текста чата и частиц без просадки FPS.',
    icon_url: 'https://cdn.modrinth.com/data/5ZwdcRci/e57b6b451425692ac17ad322d5e14bea686a383a_96.webp',
    downloads: 119747223,
    follows: 82000,
    versions: ['1.21.4'],
    date_created: '2026-01-25T12:00:00.000Z',
    date_modified: '2026-02-20T12:00:00.000Z',
    latest_version: 'if-latest',
    downloadUrl: 'https://cdn.modrinth.com/data/5ZwdcRci/versions/immediatelyfast-1.3.jar',
    project_type: 'mod',
    categories: ['optimization'],
  },
  {
    project_id: 'Ms6IzmIe',
    slug: 'foliant',
    title: 'Foliant',
    author: 'chifir4ik',
    description: 'Серверно-клиентская синхронизация профилей и интерактивная книга знаний.',
    icon_url: 'https://cdn.modrinth.com/data/Ms6IzmIe/13a343d34acb9cd5c01466905bc780caa06c3f1a_96.webp',
    downloads: 320,
    follows: 15,
    versions: ['1.21.11'],
    date_created: '2026-09-03T11:56:42.524Z',
    date_modified: '2026-09-03T11:56:42.524Z',
    latest_version: 'pfxB7FZn',
    downloadUrl: 'https://cdn.modrinth.com/data/Ms6IzmIe/versions/pfxB7FZn/FoliantSync-1.1.jar',
    project_type: 'mod',
    categories: ['social', 'fabric'],
  },
];;

async function handleModrinthSearch(req: Request, res: Response) {
  const query = (req.query.query || req.query.searchFilter || req.query.term || '') as string;
  const index = (req.query.index || req.query.sort || 'newest') as string;
  // Allow fetching up to 1000 mods at once from Modrinth REST API
  const limit = Math.min(1000, Math.max(1, parseInt((req.query.limit || req.query.pageSize || '100') as string, 10)));
  const offset = Math.max(0, parseInt((req.query.offset || req.query.index || '0') as string, 10));
  const facets = (req.query.facets as string) || JSON.stringify([['project_type:mod']]);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let hits: any[] = [];
    let totalHits = 0;

    if (limit <= 100) {
      const queryParams = new URLSearchParams({
        index,
        limit: String(limit),
        offset: String(offset),
        facets,
      });
      if (query) {
        queryParams.set('query', query);
      }

      const upstreamUrl = `https://api.modrinth.com/v2/search?${queryParams.toString()}`;
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
        signal: controller.signal,
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        hits = Array.isArray(data.hits) ? data.hits : [];
        totalHits = data.total_hits || hits.length;
      }
    } else {
      // Modrinth caps individual search requests at 100; batch in parallel up to limit
      const batchCount = Math.ceil(limit / 100);
      const batchPromises = [];

      for (let b = 0; b < batchCount; b++) {
        const batchOffset = offset + (b * 100);
        const batchLimit = Math.min(100, limit - (b * 100));
        const qParams = new URLSearchParams({
          index,
          limit: String(batchLimit),
          offset: String(batchOffset),
          facets,
        });
        if (query) qParams.set('query', query);

        batchPromises.push(
          fetch(`https://api.modrinth.com/v2/search?${qParams.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
            },
            signal: controller.signal,
          })
            .then(async (r) => {
              if (r.ok) return await r.json();
              return null;
            })
            .catch(() => null)
        );
      }

      const batchResults = await Promise.all(batchPromises);
      const seenIds = new Set<string>();

      for (const resData of batchResults) {
        if (resData && Array.isArray(resData.hits)) {
          if (resData.total_hits && resData.total_hits > totalHits) {
            totalHits = resData.total_hits;
          }
          for (const item of resData.hits) {
            const itemId = item.project_id || item.id;
            if (itemId && !seenIds.has(itemId)) {
              seenIds.add(itemId);
              hits.push(item);
            }
          }
        }
      }
    }
    clearTimeout(timeoutId);

    if (hits.length > 0) {
      // Collect latest_version IDs to batch-resolve direct file URLs
      const versionIds = hits
        .map((h: any) => h.latest_version)
        .filter((v: any) => typeof v === 'string' && v.length > 0);

      const versionFileMap = new Map<string, { url: string; filename: string; size: number }>();

      if (versionIds.length > 0) {
        try {
          const vController = new AbortController();
          const vTimeout = setTimeout(() => vController.abort(), 6000);

          // Resolve versions in chunks of 80 to avoid URL length constraints
          const chunks: string[][] = [];
          for (let i = 0; i < Math.min(versionIds.length, 320); i += 80) {
            chunks.push(versionIds.slice(i, i + 80));
          }

          await Promise.all(
            chunks.map(async (chunk) => {
              try {
                const vRes = await fetch(
                  `https://api.modrinth.com/v2/versions?ids=${encodeURIComponent(JSON.stringify(chunk))}`,
                  {
                    headers: {
                      'Accept': 'application/json',
                      'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
                    },
                    signal: vController.signal,
                  }
                );
                if (vRes.ok) {
                  const vData = await vRes.json();
                  if (Array.isArray(vData)) {
                    for (const ver of vData) {
                      if (ver.id && Array.isArray(ver.files) && ver.files.length > 0) {
                        const primaryFile = ver.files.find((f: any) => f.primary) || ver.files[0];
                        if (primaryFile?.url) {
                          versionFileMap.set(ver.id, {
                            url: primaryFile.url,
                            filename: primaryFile.filename || '',
                            size: primaryFile.size || 0,
                          });
                        }
                      }
                    }
                  }
                }
              } catch {
                // Non-blocking version chunk failure
              }
            })
          );
          clearTimeout(vTimeout);
        } catch {
          // Non-blocking version resolution
        }
      }

      // Attach direct download URLs and ensure icon_url is strictly bound to project_id
      const enrichedHits = hits.map((hit: any) => {
        const pId = hit.project_id || hit.id;
        const iconUrl = hit.icon_url || (pId ? `https://cdn.modrinth.com/data/${pId}/icon.png` : '');
        const fileInfo = hit.latest_version ? versionFileMap.get(hit.latest_version) : undefined;

        return {
          ...hit,
          icon_url: iconUrl,
          downloadUrl: fileInfo?.url || (hit.latest_version ? `https://cdn.modrinth.com/data/${pId}/versions/${hit.latest_version}/${hit.slug || pId}.jar` : `https://modrinth.com/mod/${hit.slug || pId}`),
          downloadFilename: fileInfo?.filename,
          downloadSize: fileInfo?.size ? `${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        };
      });

      return res.json({
        hits: enrichedHits,
        data: enrichedHits,
        total_hits: totalHits || enrichedHits.length,
        limit,
        offset,
        pagination: {
          index: offset,
          pageSize: limit,
          resultCount: enrichedHits.length,
          totalCount: totalHits || enrichedHits.length,
        },
      });
    }
  } catch (err) {
    console.warn('Modrinth live search error:', err);
  }

  // Fallback engine: filters & chronologically sorts curated Modrinth dataset
  let items = [...CURATED_MODRINTH_MODS];
  if (query) {
    const s = query.toLowerCase();
    items = items.filter(
      item => item.title.toLowerCase().includes(s) ||
              item.description.toLowerCase().includes(s) ||
              item.author.toLowerCase().includes(s) ||
              item.slug.toLowerCase().includes(s)
    );
  }

  items.sort((a, b) => {
    const timeA = new Date(a.date_created).getTime() || 0;
    const timeB = new Date(b.date_created).getTime() || 0;
    return index === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  const paginated = items.slice(offset, offset + limit);

  return res.json({
    hits: paginated,
    data: paginated,
    total_hits: items.length,
    limit,
    offset,
    pagination: {
      index: offset,
      pageSize: limit,
      resultCount: paginated.length,
      totalCount: items.length,
    },
  });
}

// Register routes on both direct path and prefixed path
const endpoints = [
  { path: 'productmanagement.productdetails.json', handler: handleProductDetails },
  { path: 'productmanagement.autosuggest.json', handler: handleAutoSuggest },
  { path: 'productmanagement.productsinfobytype.json', handler: handleProductsByType },
  { path: 'productmanagement.productsbydescrpition.json', handler: handleProductsByDescription },
  { path: 'productmanagement.uuiddata.json', handler: handleUuidData },
  { path: 'productmanagement.categorydata.json', handler: handleCategoryData },
  { path: 'productmanagement.filterproduct.json', handler: handleFilterProduct },
  { path: 'productmanagement.promotiondetails.json', handler: handlePromotionDetails },
  { path: 'productmanagement.mostpopproducts.json', handler: handleMostPopProducts },
  { path: 'productmanagement.freeproducts.json', handler: handleFreeProducts },
  { path: 'productmanagement.saleproducts.json', handler: handleSaleProducts },
  { path: 'servermanagement.featuredservers.json', handler: handleFeaturedServers },
  { path: 'servermanagement.serverdetails.json', handler: handleServerDetails },
];

endpoints.forEach(({ path: endPath, handler }) => {
  app.get(`/bin/minecraft/${endPath}`, handler);
  app.get(`/api/bin/minecraft/${endPath}`, handler);
});

// Dedicated convenient API routes for servers
app.get('/api/servers', handleFeaturedServers);
app.get('/api/servers/:id', (req, res) => {
  req.query.id = req.params.id;
  return handleServerDetails(req, res);
});

// Dedicated server-side proxy routes for Modrinth REST API (100% open, bypasses regional limits)
app.get('/api/modrinth', handleModrinthSearch);
app.get('/api/modrinth/mods', handleModrinthSearch);
app.get('/api/modrinth/search', handleModrinthSearch);
app.get('/api/mods/search', handleModrinthSearch);
app.get('/api/curseforge', handleModrinthSearch);
app.get('/api/curseforge/mods', handleModrinthSearch);

// Dedicated server-side proxy routes for CFWidget REST API (CurseForge open API)
app.get('/api/cfwidget', cfwidgetHandler);
app.get('/api/cfwidget/mods', cfwidgetHandler);
app.get('/api/cfwidget/search', cfwidgetHandler);

// ----------------------------------------------------
// Modrinth Versions REST API Proxy
// Returns dynamic list of versions with direct physical file URLs
// ----------------------------------------------------
app.get('/api/mod-versions', async (req: Request, res: Response) => {
  const rawId = String(req.query.id || '').trim();
  const slugOrId = rawId.replace(/^mr-/, '');
  if (!slugOrId) {
    return res.status(400).json({ error: 'id required' });
  }

  try {
    const response = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ success: true, versions: data });
    }
    return res.status(response.status).json({ error: 'Failed to fetch versions from Modrinth API', status: response.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REST API Database File Resolver
// Resolves actual original download files directly from REST APIs (Modrinth, CFWidget, Marketplace)
// ----------------------------------------------------
app.get('/api/product-file', async (req: Request, res: Response) => {
  const rawId = String(req.query.id || '').trim();
  if (!rawId) {
    return res.status(400).json({ error: 'id required' });
  }

  // 1. Modrinth REST API Resolver
  if (rawId.startsWith('mr-')) {
    const slugOrId = rawId.replace(/^mr-/, '');
    try {
      const vRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
      });

      if (vRes.ok) {
        const versions = await vRes.json();
        if (Array.isArray(versions) && versions.length > 0) {
          const latest = versions[0];
          const primaryFile = latest.files?.find((f: any) => f.primary) || latest.files?.[0];
          if (primaryFile?.url) {
            return res.json({
              success: true,
              source: 'modrinth',
              id: rawId,
              format: 'jar',
              url: `/api/download?id=${encodeURIComponent(rawId)}`,
              downloadUrl: primaryFile.url,
              filename: primaryFile.filename || `${slugOrId}.jar`,
              size: primaryFile.size,
              version: latest.version_number,
              loaders: latest.loaders,
              game_versions: latest.game_versions,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Modrinth version file lookup error:', e);
    }
  }

  // 2. CFWidget / CurseForge REST API Resolver
  if (rawId.startsWith('cf-')) {
    const slugOrId = rawId.replace(/^cf-/, '');
    try {
      // Check Modrinth mirror first for direct high-speed CDN binary
      const mrCheck = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
      });
      if (mrCheck.ok) {
        const versions = await mrCheck.json();
        if (Array.isArray(versions) && versions.length > 0) {
          const latest = versions[0];
          const primaryFile = latest.files?.find((f: any) => f.primary) || latest.files?.[0];
          if (primaryFile?.url) {
            return res.json({
              success: true,
              source: 'modrinth_cdn',
              id: rawId,
              format: 'jar',
              url: `/api/download?id=${encodeURIComponent(rawId)}`,
              downloadUrl: primaryFile.url,
              filename: primaryFile.filename || `${slugOrId}.jar`,
              size: primaryFile.size,
              version: latest.version_number,
            });
          }
        }
      }

      // Fetch from CFWidget API
      const cfRes = await fetch(`https://api.cfwidget.com/minecraft/mc-mods/${encodeURIComponent(slugOrId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
        },
      });
      if (cfRes.ok) {
        const cfData = await cfRes.json();
        const latestFile = Array.isArray(cfData.files) && cfData.files.length > 0 ? cfData.files[0] : null;
        const downloadUrl = cfData.download?.url || latestFile?.url;
        const filename = latestFile?.name || `${slugOrId}.jar`;
        if (downloadUrl) {
          return res.json({
            success: true,
            source: 'cfwidget',
            id: rawId,
            format: 'jar',
            url: `/api/download?id=${encodeURIComponent(rawId)}`,
            downloadUrl,
            filename,
            size: latestFile?.filesize,
          });
        }
      }
    } catch (e) {
      console.warn('CFWidget file lookup error:', e);
    }
  }

  // 3. Marketplace dataset item check (Add-ons, Worlds, Skins, Textures)
  const foundMp = MARKETPLACE_PRODUCTS.find(
    p => p.id.toLowerCase() === rawId.toLowerCase() || p.uuid.toLowerCase() === rawId.toLowerCase()
  );
  if (foundMp) {
    const { format, filename, mime } = getProductFormat(foundMp);
    return res.json({
      success: true,
      source: 'marketplace_api',
      id: foundMp.id,
      title: foundMp.title,
      type: foundMp.type,
      format, // e.g. 'mcaddon', 'mcworld', 'mcpack'
      filename, // e.g. 'TRANSFORMERS_Add_On.mcaddon'
      mime,
      url: `/api/download?id=${encodeURIComponent(foundMp.id)}`,
      downloadUrl: `/api/download?id=${encodeURIComponent(foundMp.id)}`,
      size: foundMp.downloadSize,
      version: foundMp.version || '1.21.0+',
    });
  }

  // 4. Modrinth direct slug fallback
  try {
    const mrDirect = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(rawId)}/version`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
      },
    });
    if (mrDirect.ok) {
      const versions = await mrDirect.json();
      if (Array.isArray(versions) && versions.length > 0) {
        const latest = versions[0];
        const primaryFile = latest.files?.find((f: any) => f.primary) || latest.files?.[0];
        if (primaryFile?.url) {
          return res.json({
            success: true,
            source: 'modrinth',
            id: rawId,
            format: 'jar',
            url: `/api/download?id=${encodeURIComponent(rawId)}`,
            downloadUrl: primaryFile.url,
            filename: primaryFile.filename || `${rawId}.jar`,
            size: primaryFile.size,
            version: latest.version_number,
          });
        }
      }
    }
  } catch {}

  // 5. Generic item format fallback
  const genericFormat = rawId.includes('addon') ? 'mcaddon' : rawId.includes('world') ? 'mcworld' : 'mcpack';
  return res.json({
    success: true,
    source: 'rest_api',
    id: rawId,
    format: genericFormat,
    filename: `${rawId}.${genericFormat}`,
    url: `/api/download?id=${encodeURIComponent(rawId)}`,
    downloadUrl: `/api/download?id=${encodeURIComponent(rawId)}`,
  });
});

// ----------------------------------------------------
// REST API Direct Binary Download Proxy
// Direct binary stream from upstream CDN or Bedrock packager with Content-Disposition attachment header
// Automatically replaces .zip with .mcaddon for Bedrock Edition downloads
// ----------------------------------------------------
app.get('/api/download', async (req: Request, res: Response) => {
  const id = String(req.query.id || '').trim();
  let fileUrl = req.query.url as string;
  let fileName = (req.query.filename as string) || '';
  const requestedEdition = String(req.query.edition || '').toLowerCase();

  // If ID is provided, resolve from REST API
  if (id) {
    // 1. Modrinth mod
    if (id.startsWith('mr-')) {
      const slugOrId = id.replace(/^mr-/, '');
      try {
        const vRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
          },
        });
        if (vRes.ok) {
          const versions = await vRes.json();
          const primaryFile = versions[0]?.files?.find((f: any) => f.primary) || versions[0]?.files?.[0];
          if (primaryFile?.url) {
            fileUrl = primaryFile.url;
            fileName = fileName || primaryFile.filename || `${slugOrId}.jar`;
          }
        }
      } catch (e) {
        console.warn('Modrinth download version lookup error:', e);
      }
    } else if (id.startsWith('cf-')) {
      // 2. CFWidget mod
      const slugOrId = id.replace(/^cf-/, '');
      try {
        const mrCheck = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
          },
        });
        if (mrCheck.ok) {
          const versions = await mrCheck.json();
          const primaryFile = versions[0]?.files?.find((f: any) => f.primary) || versions[0]?.files?.[0];
          if (primaryFile?.url) {
            fileUrl = primaryFile.url;
            fileName = fileName || primaryFile.filename || `${slugOrId}.jar`;
          }
        }
      } catch {}
    } else {
      // 3. Bedrock product (Marketplace item) -> 100% Bedrock Edition
      const foundMp = MARKETPLACE_PRODUCTS.find(
        p => p.id.toLowerCase() === id.toLowerCase() || p.uuid.toLowerCase() === id.toLowerCase()
      ) || {
        id,
        title: id.replace(/[-_]/g, ' '),
        type: id.includes('addon') ? 'addon' : id.includes('world') ? 'world' : 'resourcepack',
      };

      const { format, filename: resolvedName, mime } = getProductFormat(foundMp);
      let downloadName = fileName || resolvedName;

      // Ensure .zip is converted to .mcaddon for Bedrock
      if (downloadName.toLowerCase().endsWith('.zip')) {
        downloadName = downloadName.replace(/\.zip$/i, '.mcaddon');
      }

      try {
        const buffer = await generateBedrockBuffer(foundMp, format);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
        res.setHeader('Content-Type', mime || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      } catch (genErr) {
        console.error('Error generating Bedrock package:', genErr);
      }
    }
  }

  // If upstream fileUrl resolved or provided, proxy/stream it
  if (fileUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const upstreamRes = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Inferred or provided filename
      let finalName = fileName;
      if (!finalName && fileUrl) {
        try {
          const parsed = new URL(fileUrl);
          const seg = parsed.pathname.split('/').pop();
          if (seg) finalName = decodeURIComponent(seg);
        } catch {}
      }
      if (!finalName) finalName = 'minecraft_file';

      // Detect if this download is Bedrock:
      const isBedrock =
        requestedEdition === 'bedrock' ||
        finalName.toLowerCase().endsWith('.mcaddon') ||
        finalName.toLowerCase().endsWith('.mcpack') ||
        finalName.toLowerCase().endsWith('.mcworld') ||
        (!id.startsWith('mr-') && !id.startsWith('cf-') && !finalName.toLowerCase().endsWith('.jar'));

      // If Bedrock and original extension is .zip, force-rename to .mcaddon
      if (isBedrock && finalName.toLowerCase().endsWith('.zip')) {
        finalName = finalName.replace(/\.zip$/i, '.mcaddon');
      } else if (isBedrock && !finalName.includes('.')) {
        finalName = `${finalName}.mcaddon`;
      }

      const contentType = finalName.endsWith('.mcaddon')
        ? 'application/octet-stream'
        : (upstreamRes.headers.get('content-type') || 'application/octet-stream');

      if (!upstreamRes.ok) {
        // Fallback package instead of redirecting
        const fallbackBuffer = Buffer.from(
          JSON.stringify({
            marketplace: 'MineHolde Market',
            filename: finalName,
            status: 'packaged',
          })
        );
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalName)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.send(fallbackBuffer);
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader('Content-Type', contentType);

      const arrayBuffer = await upstreamRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err: any) {
      console.error('Download proxy error:', err);
      res.status(502).json({ error: 'Proxy download temporarily unavailable. Please try again.' });
      return;
    }
  }

  return res.status(400).send('Product ID or File URL required');
});

// Endpoint list catalog API for the UI debugger
app.get('/api/endpoints', (req, res) => {
  res.json({
    description: 'Minecraft Marketplace API Endpoints Catalog',
    endpoints: [
      { path: '/bin/minecraft/productmanagement.productdetails.json', desc: 'Item details by ID', params: ['id'] },
      { path: '/bin/minecraft/productmanagement.autosuggest.json', desc: 'Search auto-suggestions', params: ['locate', 'term'] },
      { path: '/bin/minecraft/productmanagement.productsinfobytype.json', desc: 'Items filtered by type', params: ['locate', 'type'] },
      { path: '/bin/minecraft/productmanagement.productsbydescrpition.json', desc: 'Items matching description', params: ['locate', 'term', 'limit'] },
      { path: '/bin/minecraft/productmanagement.uuiddata.json', desc: 'Item by packIdentity UUID', params: ['locate', 'uuid', 'type'] },
      { path: '/bin/minecraft/productmanagement.categorydata.json', desc: 'Items from a category', params: ['locate', 'category'] },
      { path: '/bin/minecraft/productmanagement.filterproduct.json', desc: 'Items by creator', params: ['locate', 'creatorId', 'limit', 'skip'] },
      { path: '/bin/minecraft/productmanagement.promotiondetails.json', desc: 'Current promotions & campaigns', params: ['locale'] },
      { path: '/bin/minecraft/productmanagement.mostpopproducts.json', desc: 'Most popular Marketplace items', params: ['locate'] },
      { path: '/bin/minecraft/productmanagement.freeproducts.json', desc: 'Free Marketplace items (0 Minecoins)', params: ['locate'] },
      { path: '/bin/minecraft/productmanagement.saleproducts.json', desc: 'Sale details of item IDs', params: ['locate', 'id'] },
    ],
  });
});

async function startServer() {
  // Serve static public assets (manifest.json, sw.js, icons)
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
