import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MARKETPLACE_PRODUCTS, CREATORS, PROMOTIONS } from './src/data/marketplaceData.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to sanitize string
const normalize = (str?: any) => (str ? String(str).toLowerCase().trim() : '');

// Universal chronological sorter & pagination processor
function processProductStream(
  products: typeof MARKETPLACE_PRODUCTS,
  query: { skip?: any; limit?: any; sort?: any; order?: any; page?: any }
) {
  let list = [...products];

  const sort = query.sort ? String(query.sort).toLowerCase() : 'newest';
  const order = query.order ? String(query.order).toLowerCase() : 'desc';

  // Strict chronological sorting by release date by default
  if (sort === 'newest' || sort === 'chronological' || sort === 'date') {
    list.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  } else if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
  } else if (sort === 'popular') {
    list.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));
  } else if (sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating || b.ratingsCount - a.ratingsCount);
  } else if (sort === 'price-asc') {
    list.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sort === 'price-desc') {
    list.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sort === 'name-asc') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default fallback: strict chronological (newest first)
    list.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }

  if (order === 'asc' && (sort === 'newest' || sort === 'chronological' || sort === 'date')) {
    list.reverse();
  }

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

// Proxy helper with fallback
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
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          'User-Agent': 'MinecraftMarketplace/1.21.0 (Web)',
          'Accept': 'application/json',
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
    const creator = CREATORS.find(
      c => c.id.toLowerCase() === creatorId || c.name.toLowerCase() === creatorId
    );

    const items = MARKETPLACE_PRODUCTS.filter(
      p => p.creator.id.toLowerCase() === creatorId || p.creator.name.toLowerCase() === creatorId
    );

    if (items.length === 0 && !creator) {
      return null; // triggers 404 Not Found
    }

    const processed = processProductStream(items, req.query);

    return {
      statusCode: 200,
      creator: creator || { id: creatorId, name: creatorId, verified: false },
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
];

endpoints.forEach(({ path: endPath, handler }) => {
  app.get(`/bin/minecraft/${endPath}`, handler);
  app.get(`/api/bin/minecraft/${endPath}`, handler);
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
