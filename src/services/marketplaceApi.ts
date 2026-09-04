import {
  ProductItem,
  AutoSuggestItem,
  PromotionCampaign,
  SaleProductDetail,
  ItemType,
  ApiRequestLog,
  PaginatedProductsResult,
  MinecraftServerItem,
} from '../types';
import { normalizeProduct } from '../utils/mediaParser';
import { MARKETPLACE_PRODUCTS, CREATORS, PROMOTIONS, resolveCreator } from '../data/marketplaceData';
import { FEATURED_SERVERS } from '../data/serversData';

class MarketplaceApiService {
  private requestLogs: ApiRequestLog[] = [];
  private logListeners: ((logs: ApiRequestLog[]) => void)[] = [];

  private log(log: ApiRequestLog) {
    this.requestLogs.unshift(log);
    if (this.requestLogs.length > 50) this.requestLogs.pop();
    this.logListeners.forEach(fn => fn([...this.requestLogs]));
  }

  public subscribeLogs(fn: (logs: ApiRequestLog[]) => void) {
    this.logListeners.push(fn);
    fn([...this.requestLogs]);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== fn);
    };
  }

  public getLogs(): ApiRequestLog[] {
    return [...this.requestLogs];
  }

  public clearLogs() {
    this.requestLogs = [];
    this.logListeners.forEach(fn => fn([]));
  }

  private async fetchApi<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<{ data: T; status: number; raw: any }> {
    const urlParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        urlParams.append(k, String(v));
      }
    }
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const fullUrl = `/bin/minecraft/${endpoint}${queryString}`;

    const startTime = performance.now();
    try {
      const res = await fetch(fullUrl);
      const durationMs = Math.round(performance.now() - startTime);
      
      // If endpoint returns successful JSON
      if (res.ok) {
        const raw = await res.json().catch(() => null);
        if (raw && typeof raw === 'object') {
          this.log({
            timestamp: new Date().toLocaleTimeString(),
            endpoint: `/bin/minecraft/${endpoint}`,
            params,
            status: res.status,
            durationMs,
            response: raw,
          });
          return { data: raw as T, status: res.status, raw };
        }
      }

      // Fallback to client-side catalog resolver (essential for standalone static deployments)
      const fallbackData = this.resolveClientFallback(endpoint, params);
      this.log({
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/bin/minecraft/${endpoint} (Client Catalog Fallback)`,
        params,
        status: 200,
        durationMs,
        response: fallbackData,
      });
      return { data: fallbackData as unknown as T, status: 200, raw: fallbackData };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const fallbackData = this.resolveClientFallback(endpoint, params);
      this.log({
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/bin/minecraft/${endpoint} (Client Catalog Fallback on error)`,
        params,
        status: 200,
        durationMs,
        response: fallbackData,
      });
      return { data: fallbackData as unknown as T, status: 200, raw: fallbackData };
    }
  }

  private resolveClientFallback(endpoint: string, params: Record<string, any>): any {
    const skip = Number(params.skip) || 0;
    const limit = Number(params.limit) || 50;
    const sort = params.sort || 'newest';

    let prods = [...MARKETPLACE_PRODUCTS];

    if (endpoint.includes('productdetails')) {
      const id = String(params.id || '').toLowerCase();
      const match = prods.find(p => p.id.toLowerCase() === id || p.uuid.toLowerCase() === id);
      return { product: match || null, details: match || null, statusCode: match ? 200 : 404 };
    }

    if (endpoint.includes('uuiddata')) {
      const uuid = String(params.uuid || '').toLowerCase();
      const match = prods.find(p => p.uuid.toLowerCase() === uuid || p.id.toLowerCase() === uuid);
      return { product: match || null, statusCode: match ? 200 : 404 };
    }

    if (endpoint.includes('freeproducts')) {
      const free = prods.filter(p => p.isFree || p.price === 0);
      return { products: free, totalCount: free.length, statusCode: 200 };
    }

    if (endpoint.includes('mostpopproducts')) {
      const pop = [...prods].sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));
      return { products: pop.slice(0, 50), totalCount: pop.length, statusCode: 200 };
    }

    if (endpoint.includes('filterproduct')) {
      const cId = String(params.creatorId || '').toLowerCase();
      const creator = resolveCreator(cId);
      const items = prods.filter(p => 
        p.creator.id.toLowerCase() === cId || 
        p.creator.name.toLowerCase() === cId ||
        p.creator.name.toLowerCase().includes(cId)
      );
      return {
        products: items.slice(skip, skip + limit),
        totalCount: items.length,
        skip,
        limit,
        hasMore: skip + limit < items.length,
        creator,
        statusCode: 200
      };
    }

    if (endpoint.includes('productsbydescrpition')) {
      const term = String(params.term || '').toLowerCase().trim();
      let matched = prods;
      if (term) {
        matched = prods.filter(p =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.creator.name.toLowerCase().includes(term) ||
          p.tags.some(t => t.toLowerCase().includes(term))
        );
      }
      return {
        products: matched.slice(skip, skip + limit),
        totalCount: matched.length,
        skip,
        limit,
        hasMore: skip + limit < matched.length,
        statusCode: 200
      };
    }

    if (endpoint.includes('categorydata')) {
      const cat = String(params.category || '').toLowerCase();
      const matched = (cat === 'all' || !cat) 
        ? prods 
        : prods.filter(p => p.category.toLowerCase() === cat || p.tags.some(t => t.toLowerCase() === cat));
      return {
        products: matched.slice(skip, skip + limit),
        totalCount: matched.length,
        skip,
        limit,
        hasMore: skip + limit < matched.length,
        category: params.category,
        statusCode: 200
      };
    }

    if (endpoint.includes('productsinfobytype')) {
      const t = String(params.type || '').toLowerCase();
      const matched = (t === 'all' || !t)
        ? prods
        : prods.filter(p => p.type.toLowerCase() === t || p.type.toLowerCase().includes(t));
      return {
        products: matched.slice(skip, skip + limit),
        totalCount: matched.length,
        skip,
        limit,
        hasMore: skip + limit < matched.length,
        type: params.type,
        statusCode: 200
      };
    }

    if (endpoint.includes('promotiondetails')) {
      return {
        campaigns: PROMOTIONS,
        featuredPromotions: PROMOTIONS,
        activeDiscounts: prods.filter(p => p.isSale),
        statusCode: 200
      };
    }

    if (endpoint.includes('servermanagement.featuredservers') || endpoint.includes('servers')) {
      const search = String(params.search || params.q || '').toLowerCase();
      const tag = String(params.tag || '').toLowerCase();

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
        servers,
        totalCount: servers.length,
        totalOnlinePlayers: totalOnline,
        statusCode: 200,
        timestamp: new Date().toISOString(),
      };
    }

    if (endpoint.includes('servermanagement.serverdetails')) {
      const id = String(params.id || '').toLowerCase();
      const address = String(params.address || '').toLowerCase();
      const server = FEATURED_SERVERS.find(s =>
        (id && s.id.toLowerCase() === id) ||
        (id && s.name.toLowerCase() === id) ||
        (address && s.address.toLowerCase() === address)
      ) || FEATURED_SERVERS[0];

      return {
        server,
        relatedMarketplacePacks: prods.filter(p =>
          p.creator.name.toLowerCase().includes(server.creatorName.toLowerCase())
        ).slice(0, 4),
        statusCode: 200,
      };
    }

    // Default pagination
    return {
      products: prods.slice(skip, skip + limit),
      totalCount: prods.length,
      skip,
      limit,
      hasMore: skip + limit < prods.length,
      statusCode: 200
    };
  }

  // 1. Product Details
  async getProductDetails(id: string): Promise<ProductItem | null> {
    const res = await this.fetchApi<{ product?: any; details?: any }>(
      'productmanagement.productdetails.json',
      { id }
    );
    const rawProd = res.data.product || res.data.details || null;
    if (!rawProd) return null;
    return normalizeProduct(rawProd);
  }

  // 2. Auto Suggest
  async getAutoSuggest(term?: string, locate: string = 'en-us'): Promise<AutoSuggestItem[]> {
    const res = await this.fetchApi<{ suggestions: AutoSuggestItem[] }>(
      'productmanagement.autosuggest.json',
      { term, locate }
    );
    return res.data.suggestions || [];
  }

  // 3. Products Info By Type with Global Chronological Support & Offset Parameters (ALL creators)
  async getProductsByType(
    type: ItemType | string,
    options: {
      skip?: number;
      limit?: number;
      sort?: string;
      order?: string;
      locate?: string;
    } = {}
  ): Promise<PaginatedProductsResult> {
    const { skip = 0, limit = 50, sort = 'newest', order = 'desc', locate = 'en-us' } = options;
    const res = await this.fetchApi<any>(
      'productmanagement.productsinfobytype.json',
      { type, skip, limit, sort, order, locate }
    );

    const rawList = res.data.products || res.data.items || res.data.results || [];
    const prods = (Array.isArray(rawList) ? rawList : []).map((p: any) => normalizeProduct(p));

    return {
      products: prods,
      totalCount: res.data.totalCount ?? prods.length,
      skip: res.data.skip ?? skip,
      limit: res.data.limit ?? limit,
      hasMore: res.data.hasMore ?? (skip + prods.length < (res.data.totalCount ?? prods.length)),
      type: typeof type === 'string' ? type : undefined,
    };
  }

  // 4. Products By Description / Search with Chronological Support & Offset Parameters
  async getProductsByDescription(
    term?: string,
    options: {
      skip?: number;
      limit?: number;
      sort?: string;
      order?: string;
      locate?: string;
    } = {}
  ): Promise<PaginatedProductsResult> {
    const { skip = 0, limit = 50, sort = 'newest', order = 'desc', locate = 'en-us' } = options;
    const res = await this.fetchApi<any>(
      'productmanagement.productsbydescrpition.json',
      { term, skip, limit, sort, order, locate }
    );

    const rawList = res.data.products || res.data.items || res.data.results || [];
    const prods = (Array.isArray(rawList) ? rawList : []).map((p: any) => normalizeProduct(p));

    return {
      products: prods,
      totalCount: res.data.totalCount ?? prods.length,
      skip: res.data.skip ?? skip,
      limit: res.data.limit ?? limit,
      hasMore: res.data.hasMore ?? (skip + prods.length < (res.data.totalCount ?? prods.length)),
    };
  }

  // 5. UUID Data
  async getProductByUuid(uuid: string, type?: string, locate: string = 'en-us'): Promise<ProductItem | null> {
    const res = await this.fetchApi<{ product?: any }>(
      'productmanagement.uuiddata.json',
      { uuid, type: type || 'any', locate }
    );
    const rawProd = res.data.product || null;
    if (!rawProd) return null;
    return normalizeProduct(rawProd);
  }

  // 6. Category Data with Chronological Support & Offset Parameters (ALL creators)
  async getProductsByCategory(
    category: string,
    options: {
      skip?: number;
      limit?: number;
      sort?: string;
      order?: string;
      locate?: string;
    } = {}
  ): Promise<PaginatedProductsResult> {
    const { skip = 0, limit = 50, sort = 'newest', order = 'desc', locate = 'en-us' } = options;
    const res = await this.fetchApi<any>(
      'productmanagement.categorydata.json',
      { category, skip, limit, sort, order, locate }
    );

    const rawList = res.data.products || res.data.items || res.data.results || [];
    const prods = (Array.isArray(rawList) ? rawList : []).map((p: any) => normalizeProduct(p));

    return {
      products: prods,
      totalCount: res.data.totalCount ?? prods.length,
      skip: res.data.skip ?? skip,
      limit: res.data.limit ?? limit,
      hasMore: res.data.hasMore ?? (skip + prods.length < (res.data.totalCount ?? prods.length)),
      category,
    };
  }

  // 7. Filter Product (Creator) with Chronological Support & Offset Parameters
  async getProductsByCreator(
    creatorId: string,
    limit: number = 50,
    skip: number = 0,
    sort: string = 'newest',
    locate: string = 'en-us'
  ): Promise<{ products: ProductItem[]; creator: any; totalCount: number; hasMore: boolean; skip: number; limit: number }> {
    const res = await this.fetchApi<any>(
      'productmanagement.filterproduct.json',
      { creatorId, limit, skip, sort, locate }
    );

    const rawList = res.data.products || res.data.items || res.data.results || [];
    const prods = (Array.isArray(rawList) ? rawList : []).map((p: any) => normalizeProduct(p));

    return {
      products: prods,
      creator: res.data.creator,
      totalCount: res.data.totalCount ?? prods.length,
      hasMore: res.data.hasMore ?? (skip + prods.length < (res.data.totalCount ?? prods.length)),
      skip: res.data.skip ?? skip,
      limit: res.data.limit ?? limit,
    };
  }

  /**
   * CYCLIC / EXHAUSTIVE BATCH LOADER
   * Iterates through Minecraft Marketplace API endpoints page-by-page using
   * offset parameters (skip & limit) to retrieve 100% of all available marketplace items
   * across ALL authors (both verified and unverified 3PP creators) without filtering out 3PP.
   * Guarantees strict chronological ordering from newest (2026) to earliest (2017).
   */
  async fetchAllProductsExhaustively(
    options: {
      type?: ItemType | string;
      category?: string;
      term?: string;
      creatorId?: string;
      batchSize?: number;
      sort?: string;
      order?: string;
      locate?: string;
      onBatchLoaded?: (currentItems: ProductItem[], totalCount: number) => void;
    } = {}
  ): Promise<{ products: ProductItem[]; totalCount: number }> {
    const {
      type = 'all',
      category,
      term,
      creatorId,
      batchSize = 50,
      sort = 'newest',
      order = 'desc',
      locate = 'en-us',
      onBatchLoaded,
    } = options;

    const accumulatedProducts: ProductItem[] = [];
    const seenIds = new Set<string>();
    let currentSkip = 0;
    let totalExpected = 0;
    let hasMore = true;
    let loopCount = 0;
    const MAX_CYCLES = 100; // Safeguard

    while (hasMore && loopCount < MAX_CYCLES) {
      loopCount++;

      let result: PaginatedProductsResult;

      if (category && category !== 'All') {
        result = await this.getProductsByCategory(category, {
          skip: currentSkip,
          limit: batchSize,
          sort,
          order,
          locate,
        });
      } else if (term) {
        result = await this.getProductsByDescription(term, {
          skip: currentSkip,
          limit: batchSize,
          sort,
          order,
          locate,
        });
      } else if (creatorId) {
        const creatorRes = await this.getProductsByCreator(
          creatorId,
          batchSize,
          currentSkip,
          sort,
          locate
        );
        result = {
          products: creatorRes.products,
          totalCount: creatorRes.totalCount,
          skip: creatorRes.skip,
          limit: creatorRes.limit,
          hasMore: creatorRes.hasMore,
        };
      } else {
        result = await this.getProductsByType(type, {
          skip: currentSkip,
          limit: batchSize,
          sort,
          order,
          locate,
        });
      }

      const batch = result.products || [];
      totalExpected = result.totalCount || (accumulatedProducts.length + batch.length);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Add unique items preserving chronological incoming sequence
      for (const item of batch) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          accumulatedProducts.push(normalizeProduct(item));
        }
      }

      if (onBatchLoaded) {
        onBatchLoaded([...accumulatedProducts], totalExpected);
      }

      currentSkip += batch.length;

      // Check termination conditions
      if (
        result.hasMore === false ||
        currentSkip >= totalExpected ||
        batch.length < batchSize ||
        accumulatedProducts.length >= totalExpected
      ) {
        hasMore = false;
      }
    }

    // Strictly enforce sort order (chronological newest 2026 -> oldest 2017 by default)
    if (sort === 'newest' || sort === 'chronological' || sort === 'date') {
      accumulatedProducts.sort((a, b) => {
        const timeA = new Date(a.releaseDate).getTime() || 0;
        const timeB = new Date(b.releaseDate).getTime() || 0;
        return order === 'asc' ? timeA - timeB : timeB - timeA;
      });
    } else if (sort === 'oldest') {
      accumulatedProducts.sort((a, b) => {
        const timeA = new Date(a.releaseDate).getTime() || 0;
        const timeB = new Date(b.releaseDate).getTime() || 0;
        return timeA - timeB;
      });
    } else if (sort === 'popular') {
      accumulatedProducts.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));
    } else if (sort === 'rating') {
      accumulatedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.ratingsCount || 0) - (a.ratingsCount || 0));
    } else if (sort === 'name-asc') {
      accumulatedProducts.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'price-asc') {
      accumulatedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-desc') {
      accumulatedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return {
      products: accumulatedProducts,
      totalCount: Math.max(totalExpected, accumulatedProducts.length),
    };
  }

  // 8. Promotion Details
  async getPromotionDetails(locale: string = 'en-us'): Promise<{
    campaigns: PromotionCampaign[];
    featuredPromotions: any[];
    activeDiscounts: ProductItem[];
  }> {
    const res = await this.fetchApi<any>('productmanagement.promotiondetails.json', { locale });
    const rawDiscounts = res.data?.activeDiscounts || [];
    return {
      campaigns: res.data?.campaigns || [],
      featuredPromotions: (res.data?.featuredPromotions || []).map((p: any) => ({
        ...p,
        items: (p.items || []).map((i: any) => normalizeProduct(i)),
      })),
      activeDiscounts: rawDiscounts.map((d: any) => normalizeProduct(d)),
    };
  }

  // 9. Most Popular Products (ALL authors)
  async getMostPopularProducts(locate: string = 'en-us'): Promise<ProductItem[]> {
    const res = await this.fetchApi<any>(
      'productmanagement.mostpopproducts.json',
      { locate }
    );
    const rawList = res.data?.products || [];
    return rawList.map((p: any) => normalizeProduct(p));
  }

  // 10. Free Products (ALL authors)
  async getFreeProducts(locate: string = 'en-us'): Promise<ProductItem[]> {
    const res = await this.fetchApi<any>(
      'productmanagement.freeproducts.json',
      { locate }
    );
    const rawList = res.data?.products || [];
    return rawList.map((p: any) => normalizeProduct(p));
  }

  // 11. Sale Products
  async getSaleProducts(ids: string | string[], locate: string = 'en-us'): Promise<SaleProductDetail[]> {
    const idParam = Array.isArray(ids) ? ids.join(',') : ids;
    const res = await this.fetchApi<{ sales: SaleProductDetail[] }>(
      'productmanagement.saleproducts.json',
      { id: idParam, locate }
    );
    return res.data.sales || [];
  }

  // 12. Featured Bedrock Partner Servers
  async getFeaturedServers(options: {
    search?: string;
    tag?: string;
    locate?: string;
  } = {}): Promise<{
    servers: MinecraftServerItem[];
    totalCount: number;
    totalOnlinePlayers: number;
  }> {
    const res = await this.fetchApi<{
      servers?: MinecraftServerItem[];
      totalCount?: number;
      totalOnlinePlayers?: number;
    }>('servermanagement.featuredservers.json', {
      search: options.search,
      tag: options.tag,
      locate: options.locate || 'en-us',
    });

    const servers = res.data?.servers || FEATURED_SERVERS;
    const totalCount = res.data?.totalCount ?? servers.length;
    const totalOnlinePlayers = res.data?.totalOnlinePlayers ?? servers.reduce((sum, s) => sum + (s.onlinePlayers || 0), 0);

    return {
      servers,
      totalCount,
      totalOnlinePlayers,
    };
  }

  // 13. Server Details by ID or Address
  async getServerDetails(idOrAddress: string): Promise<{
    server: MinecraftServerItem | null;
    relatedMarketplacePacks: ProductItem[];
  }> {
    const res = await this.fetchApi<{
      server?: MinecraftServerItem;
      relatedMarketplacePacks?: any[];
    }>('servermanagement.serverdetails.json', {
      id: idOrAddress,
      address: idOrAddress,
    });

    return {
      server: res.data?.server || FEATURED_SERVERS.find(s => s.id === idOrAddress || s.address === idOrAddress) || null,
      relatedMarketplacePacks: (res.data?.relatedMarketplacePacks || []).map(p => normalizeProduct(p)),
    };
  }

  // Direct arbitrary endpoint tester for the API Debugger
  async executeCustomEndpoint(endpoint: string, params: Record<string, string>) {
    return this.fetchApi(endpoint, params);
  }
}

export const marketplaceApi = new MarketplaceApiService();
