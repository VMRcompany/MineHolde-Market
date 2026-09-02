import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MARKETPLACE_PRODUCTS, CREATORS, PROMOTIONS, resolveCreator } from './src/data/marketplaceData.js';
import { FEATURED_SERVERS } from './src/data/serversData.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to sanitize string
const normalize = (str?: any) => (str ? String(str).toLowerCase().trim() : '');

// Universal hierarchical & chronological sorter & pagination processor
// Requirement: CurseForge mods strictly at the TOP, Marketplace items at the BOTTOM
function processProductStream(
  products: typeof MARKETPLACE_PRODUCTS,
  query: { skip?: any; limit?: any; sort?: any; order?: any; page?: any }
) {
  const cfList = products.filter((p) => p.id.startsWith('cf-'));
  const mpList = products.filter((p) => !p.id.startsWith('cf-'));

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

  const sortedCf = sortItems(cfList);
  const sortedMp = sortItems(mpList);

  // CurseForge items at the TOP, Marketplace items at the BOTTOM
  const list = [...sortedCf, ...sortedMp];

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
// CURSEFORGE API SERVER-SIDE PROXY & CACHE
// Fetches mods, textures, resource packs from https://api.curseforge.com/v1/mods/search
// Parameters: gameId=432, sortField=2 (or 3), sortOrder=desc
// Protected with server-side process.env.CURSEFORGE_API_KEY
// ----------------------------------------------------
const CURATED_CURSEFORGE_MODS = [
  {
    id: 238086,
    gameId: 432,
    name: 'Just Enough Items (JEI)',
    slug: 'jei',
    summary: 'JEI — просмотр предметов и рецептов крафта для Minecraft с максимальной производительностью и стабильностью.',
    classId: 6,
    authors: [{ id: 104231, name: 'mezz' }],
    logo: {
      id: 235123,
      url: 'https://media.forgecdn.net/avatars/28/69/635838947098691094.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/28/69/256/256/635838947098691094.png',
    },
    downloadCount: 312584120,
    thumbsUpCount: 28400,
    dateReleased: '2026-02-14T10:00:00.000Z',
    dateModified: '2026-02-28T14:30:00.000Z',
    categories: [{ name: 'Map and Information' }, { name: 'Technology' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/jei' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
    latestFiles: [{ id: 5123984, downloadUrl: 'https://mediafilez.forgecdn.net/files/5123/984/jei-1.21.4.jar', fileName: 'jei-1.21.4.jar' }],
  },
  {
    id: 328085,
    gameId: 432,
    name: 'Create',
    slug: 'create',
    summary: 'Грандиозный мод на кинематическую механику, конвейеры, шестерни, поезда и автоматизацию в стиле стимпанк.',
    classId: 6,
    authors: [{ id: 457193, name: 'simibubi' }],
    logo: {
      id: 328086,
      url: 'https://media.forgecdn.net/avatars/223/841/637042588439121669.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/223/841/256/256/637042588439121669.png',
    },
    downloadCount: 89400120,
    thumbsUpCount: 45100,
    dateReleased: '2026-01-20T12:00:00.000Z',
    dateModified: '2026-02-25T18:00:00.000Z',
    categories: [{ name: 'Technology' }, { name: 'Automation' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/create' },
    latestFilesIndexes: [{ gameVersion: '1.21.2' }],
    latestFiles: [{ id: 5089124, downloadUrl: 'https://mediafilez.forgecdn.net/files/5089/124/create-1.21.2.jar', fileName: 'create-1.21.2.jar' }],
  },
  {
    id: 394468,
    gameId: 432,
    name: 'Sodium',
    slug: 'sodium',
    summary: 'Современный движок рендеринга и колоссальная оптимизация FPS для Minecraft.',
    classId: 6,
    authors: [{ id: 504192, name: 'jellysquid3_' }],
    logo: {
      id: 394469,
      url: 'https://media.forgecdn.net/avatars/282/870/637286121990425807.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/282/870/256/256/637286121990425807.png',
    },
    downloadCount: 78912400,
    thumbsUpCount: 39200,
    dateReleased: '2026-02-05T09:00:00.000Z',
    dateModified: '2026-02-27T11:00:00.000Z',
    categories: [{ name: 'Utility' }, { name: 'Performance' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/sodium' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
    latestFiles: [{ id: 5104231, downloadUrl: 'https://mediafilez.forgecdn.net/files/5104/231/sodium-1.21.4.jar', fileName: 'sodium-1.21.4.jar' }],
  },
  {
    id: 455508,
    gameId: 432,
    name: 'Iris Shaders',
    slug: 'irisshaders',
    summary: 'Новейший шейдерный загрузчик с поддержкой современных эффектов, теней, отражений и трассировки лучей.',
    classId: 6,
    authors: [{ id: 671043, name: 'coderbot' }],
    logo: {
      id: 455509,
      url: 'https://media.forgecdn.net/avatars/355/157/637514336043597148.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/355/157/256/256/637514336043597148.png',
    },
    downloadCount: 54200800,
    thumbsUpCount: 27800,
    dateReleased: '2026-01-15T15:00:00.000Z',
    dateModified: '2026-02-26T20:00:00.000Z',
    categories: [{ name: 'Graphics' }, { name: 'Performance' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/irisshaders' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
    latestFiles: [{ id: 5119842, downloadUrl: 'https://mediafilez.forgecdn.net/files/5119/842/iris-1.21.4.jar', fileName: 'iris-1.21.4.jar' }],
  },
  {
    id: 32274,
    gameId: 432,
    name: 'JourneyMap',
    slug: 'journeymap',
    summary: 'Интерактивная карта мира в реальном времени с радаром мобов, путевыми точками и веб-картой.',
    classId: 6,
    authors: [{ id: 98124, name: 'techbrew' }],
    logo: {
      id: 32275,
      url: 'https://media.forgecdn.net/avatars/21/530/635790472491295984.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/21/530/256/256/635790472491295984.png',
    },
    downloadCount: 238900400,
    thumbsUpCount: 31200,
    dateReleased: '2026-01-10T12:00:00.000Z',
    dateModified: '2026-02-24T16:00:00.000Z',
    categories: [{ name: 'Map and Information' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/journeymap' },
    latestFilesIndexes: [{ gameVersion: '1.21.3' }],
  },
  {
    id: 248787,
    gameId: 432,
    name: 'AppleSkin',
    slug: 'appleskin',
    summary: 'Отображение уровня сытости, восстановления здоровья и питательности еды в инвентаре.',
    classId: 6,
    authors: [{ id: 184561, name: 'squeek502' }],
    logo: {
      id: 248788,
      url: 'https://media.forgecdn.net/avatars/43/332/636066225585098254.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/43/332/256/256/636066225585098254.png',
    },
    downloadCount: 198400200,
    thumbsUpCount: 19400,
    dateReleased: '2026-02-01T10:00:00.000Z',
    dateModified: '2026-02-25T12:00:00.000Z',
    categories: [{ name: 'Utility' }, { name: 'Food' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/appleskin' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 650058,
    gameId: 432,
    name: 'Complementary Reimagined Shaders',
    slug: 'complementary-reimagined',
    summary: 'Революционный шейдер-пак нового поколения с реалистичной водой, динамическим светом и volumetric туманом.',
    classId: 12,
    authors: [{ id: 789123, name: 'EminGT' }],
    logo: {
      id: 650059,
      url: 'https://media.forgecdn.net/avatars/607/424/637966779532506822.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/607/424/256/256/637966779532506822.png',
    },
    downloadCount: 42100500,
    thumbsUpCount: 38900,
    dateReleased: '2026-02-12T14:00:00.000Z',
    dateModified: '2026-02-28T09:00:00.000Z',
    categories: [{ name: 'Shaders' }, { name: 'Graphics' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/customization/complementary-reimagined' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 220318,
    gameId: 432,
    name: 'Biomes O\' Plenty',
    slug: 'biomes-o-plenty',
    summary: 'Добавляет более 80 уникальных биомов в Верхний мир и Незер, новые деревья, цветы, руды и блоки.',
    classId: 6,
    authors: [{ id: 109283, name: 'Forstride' }],
    logo: {
      id: 220319,
      url: 'https://media.forgecdn.net/avatars/28/948/635841029285496468.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/28/948/256/256/635841029285496468.png',
    },
    downloadCount: 145000000,
    thumbsUpCount: 34100,
    dateReleased: '2026-01-18T11:00:00.000Z',
    dateModified: '2026-02-22T15:00:00.000Z',
    categories: [{ name: 'World Gen' }, { name: 'Biomes' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/biomes-o-plenty' },
    latestFilesIndexes: [{ gameVersion: '1.21.3' }],
  },
  {
    id: 398521,
    gameId: 432,
    name: 'Farmer\'s Delight',
    slug: 'farmers-delight',
    summary: 'Уютный кулинарный мод с новыми культурами, кастрюлями, сковородами, ножами и аппетитными блюдами.',
    classId: 6,
    authors: [{ id: 498124, name: 'vectorwing' }],
    logo: {
      id: 398522,
      url: 'https://media.forgecdn.net/avatars/287/159/637300702587570498.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/287/159/256/256/637300702587570498.png',
    },
    downloadCount: 63800200,
    thumbsUpCount: 29500,
    dateReleased: '2026-01-28T17:00:00.000Z',
    dateModified: '2026-02-23T19:00:00.000Z',
    categories: [{ name: 'Farming' }, { name: 'Food' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/farmers-delight' },
    latestFilesIndexes: [{ gameVersion: '1.21.2' }],
  },
  {
    id: 426558,
    gameId: 432,
    name: 'Alex\'s Mobs',
    slug: 'alexs-mobs',
    summary: 'Более 80 проработанных существ от крокодилов и слонов до кашалотов со сложным поведением и дропом.',
    classId: 6,
    authors: [{ id: 512948, name: 'sbom_xela' }],
    logo: {
      id: 426559,
      url: 'https://media.forgecdn.net/avatars/324/532/637424606778942200.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/324/532/256/256/637424606778942200.png',
    },
    downloadCount: 52100000,
    thumbsUpCount: 26800,
    dateReleased: '2026-01-14T13:00:00.000Z',
    dateModified: '2026-02-21T18:00:00.000Z',
    categories: [{ name: 'Mobs' }, { name: 'Creatures' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/alexs-mobs' },
    latestFilesIndexes: [{ gameVersion: '1.21.2' }],
  },
  {
    id: 245755,
    gameId: 432,
    name: 'Waystones',
    slug: 'waystones',
    summary: 'Телепортационные камни-монолиты для быстрого перемещения между базами, деревнями и мирами.',
    classId: 6,
    authors: [{ id: 181293, name: 'BlayTheNinth' }],
    logo: {
      id: 245756,
      url: 'https://media.forgecdn.net/avatars/38/547/636034199923838508.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/38/547/256/256/636034199923838508.png',
    },
    downloadCount: 161000000,
    thumbsUpCount: 22400,
    dateReleased: '2026-01-22T08:00:00.000Z',
    dateModified: '2026-02-24T10:00:00.000Z',
    categories: [{ name: 'Magic' }, { name: 'Adventure' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/waystones' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 359253,
    gameId: 432,
    name: 'Bare Bones Texture Pack',
    slug: 'bare-bones-texture-pack',
    summary: 'Оригинальный текстур-пак в стилистике официальных трейлеров Minecraft с чистыми яркими цветами.',
    classId: 12,
    authors: [{ id: 412891, name: 'RobotPantaloons' }],
    logo: {
      id: 359254,
      url: 'https://media.forgecdn.net/avatars/246/528/637151048604901594.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/246/528/256/256/637151048604901594.png',
    },
    downloadCount: 28400000,
    thumbsUpCount: 21900,
    dateReleased: '2026-01-30T16:00:00.000Z',
    dateModified: '2026-02-26T14:00:00.000Z',
    categories: [{ name: 'Resource Packs' }, { name: '16x' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/texture-packs/bare-bones-texture-pack' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 436482,
    gameId: 432,
    name: 'Faithful 32x',
    slug: 'faithful-32x',
    summary: 'Классические текстуры Minecraft в повышенном разрешении 32x32 без искажения духа игры.',
    classId: 12,
    authors: [{ id: 531092, name: 'Faithful Team' }],
    logo: {
      id: 436483,
      url: 'https://media.forgecdn.net/avatars/336/906/637459173006456345.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/336/906/256/256/637459173006456345.png',
    },
    downloadCount: 46200000,
    thumbsUpCount: 30400,
    dateReleased: '2026-02-04T12:00:00.000Z',
    dateModified: '2026-02-27T17:00:00.000Z',
    categories: [{ name: 'Resource Packs' }, { name: '32x' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/texture-packs/faithful-32x' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 228756,
    gameId: 432,
    name: 'Iron Chests',
    slug: 'iron-chests',
    summary: 'Вместительные сундуки из меди, железа, золота, алмазов, кристаллов и обсидиана.',
    classId: 6,
    authors: [{ id: 110293, name: 'ProgWML6' }],
    logo: {
      id: 228757,
      url: 'https://media.forgecdn.net/avatars/23/272/635790494801128768.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/23/272/256/256/635790494801128768.png',
    },
    downloadCount: 142000000,
    thumbsUpCount: 17800,
    dateReleased: '2026-01-11T10:00:00.000Z',
    dateModified: '2026-02-20T12:00:00.000Z',
    categories: [{ name: 'Storage' }, { name: 'Technology' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/iron-chests' },
    latestFilesIndexes: [{ gameVersion: '1.21.3' }],
  },
  {
    id: 252848,
    gameId: 432,
    name: 'Nature\'s Compass',
    slug: 'natures-compass',
    summary: 'Навигационный компас для мгновенного поиска любого биома и информации о нем.',
    classId: 6,
    authors: [{ id: 194820, name: 'Chaosyr' }],
    logo: {
      id: 252849,
      url: 'https://media.forgecdn.net/avatars/50/664/636113886566277023.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/50/664/256/256/636113886566277023.png',
    },
    downloadCount: 97800000,
    thumbsUpCount: 15400,
    dateReleased: '2026-01-19T14:00:00.000Z',
    dateModified: '2026-02-23T11:00:00.000Z',
    categories: [{ name: 'Utility' }, { name: 'Adventure' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/natures-compass' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
  {
    id: 225608,
    gameId: 432,
    name: 'WorldEdit',
    slug: 'worldedit',
    summary: 'Профессиональный редактор карт и построек в игре с мощными кистями и скриптами.',
    classId: 6,
    authors: [{ id: 102931, name: 'sk89q' }],
    logo: {
      id: 225609,
      url: 'https://media.forgecdn.net/avatars/21/544/635790472624565984.png',
      thumbnailUrl: 'https://media.forgecdn.net/avatars/thumbnails/21/544/256/256/635790472624565984.png',
    },
    downloadCount: 91400000,
    thumbsUpCount: 23100,
    dateReleased: '2026-01-25T11:00:00.000Z',
    dateModified: '2026-02-25T15:00:00.000Z',
    categories: [{ name: 'Creative' }, { name: 'Utility' }],
    links: { websiteUrl: 'https://www.curseforge.com/minecraft/mc-mods/worldedit' },
    latestFilesIndexes: [{ gameVersion: '1.21.4' }],
  },
];

async function handleCurseForgeSearch(req: Request, res: Response) {
  const gameId = req.query.gameId || '432';
  const sortField = req.query.sortField || '2';
  const sortOrder = req.query.sortOrder || 'desc';
  const index = parseInt(req.query.index as string, 10) || 0;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
  const searchFilter = (req.query.searchFilter || req.query.term || '') as string;
  const classId = req.query.classId as string;

  const cfApiKey = process.env.CURSEFORGE_API_KEY || '';

  // Try live CurseForge API upstream
  if (cfApiKey) {
    try {
      const queryParams = new URLSearchParams({
        gameId: String(gameId),
        sortField: String(sortField),
        sortOrder: String(sortOrder),
        index: String(index),
        pageSize: String(pageSize),
      });
      if (searchFilter) queryParams.append('searchFilter', searchFilter);
      if (classId) queryParams.append('classId', classId);

      const upstreamUrl = `https://api.curseforge.com/v1/mods/search?${queryParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const cfRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': cfApiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (cfRes.ok) {
        const data = await cfRes.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          return res.json(data);
        }
      }
    } catch {
      // Gracefully continue to internal curated dataset
    }
  }

  // Fallback engine: filters & chronologically sorts curated dataset
  let items = [...CURATED_CURSEFORGE_MODS];
  if (searchFilter) {
    const s = searchFilter.toLowerCase();
    items = items.filter(
      item => item.name.toLowerCase().includes(s) ||
              item.summary.toLowerCase().includes(s) ||
              item.authors.some(a => a.name.toLowerCase().includes(s))
    );
  }
  if (classId) {
    const cid = parseInt(classId, 10);
    if (!isNaN(cid)) {
      items = items.filter(item => item.classId === cid);
    }
  }

  // Enforce chronological sorting (sortField 2: dateModified, sortField 3: dateReleased)
  items.sort((a, b) => {
    const fieldA = sortField === '3' ? a.dateReleased : a.dateModified;
    const fieldB = sortField === '3' ? b.dateReleased : b.dateModified;
    const timeA = new Date(fieldA).getTime() || 0;
    const timeB = new Date(fieldB).getTime() || 0;
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const paginated = items.slice(index, index + pageSize);

  return res.json({
    data: paginated,
    pagination: {
      index,
      pageSize,
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

// Dedicated secure server-side routes for CurseForge mods
app.get('/api/curseforge', handleCurseForgeSearch);
app.get('/api/curseforge/mods', handleCurseForgeSearch);
app.get('/api/mods/search', handleCurseForgeSearch);

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
    console.log(`Minecraft Marketplace server running on http://localhost:${PORT}`);
  });
}

startServer();
