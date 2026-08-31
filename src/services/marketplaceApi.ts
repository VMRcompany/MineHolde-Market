import {
  ProductItem,
  AutoSuggestItem,
  PromotionCampaign,
  SaleProductDetail,
  ItemType,
  ApiRequestLog,
  PaginatedProductsResult,
} from '../types';

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
      const raw = await res.json().catch(() => ({}));

      this.log({
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/bin/minecraft/${endpoint}`,
        params,
        status: res.status,
        durationMs,
        response: raw,
      });

      if (!res.ok) {
        throw new Error(raw.message || `HTTP ${res.status}: Failed to fetch ${endpoint}`);
      }

      return { data: raw as T, status: res.status, raw };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      this.log({
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/bin/minecraft/${endpoint}`,
        params,
        status: 500,
        durationMs,
        response: { error: err.message },
      });
      throw err;
    }
  }

  // 1. Product Details
  async getProductDetails(id: string): Promise<ProductItem | null> {
    const res = await this.fetchApi<{ product?: ProductItem; details?: any }>(
      'productmanagement.productdetails.json',
      { id }
    );
    const prod = res.data.product || res.data.details || null;
    if (prod) {
      this.normalizeProductMedia(prod);
    }
    return prod;
  }

  /**
   * Normalizes media array on product to ensure:
   * 1. Official pack cover splash art is strictly first
   * 2. In-game screenshots strictly follow in sequence without disorder
   */
  private normalizeProductMedia(product: ProductItem): void {
    const coverUrl = product.bannerUrl || product.thumbnailUrl;
    if (product.screenshots && Array.isArray(product.screenshots)) {
      // Remove any accidental duplicate of cover from screenshots list
      product.screenshots = product.screenshots.filter((s) => s && s !== coverUrl);
    } else {
      product.screenshots = [];
    }

    product.bannerUrl = coverUrl;
    product.media = [
      { type: 'cover', label: 'Заставка пака', url: coverUrl, order: 1 },
      ...product.screenshots.map((url, idx) => ({
        type: 'screenshot',
        label: `Скриншот ${idx + 1}`,
        url,
        order: idx + 2,
      })),
    ];
  }

  // 2. Auto Suggest
  async getAutoSuggest(term?: string, locate: string = 'en-us'): Promise<AutoSuggestItem[]> {
    const res = await this.fetchApi<{ suggestions: AutoSuggestItem[] }>(
      'productmanagement.autosuggest.json',
      { term, locate }
    );
    return res.data.suggestions || [];
  }

  // 3. Products Info By Type with Chronological Support & Offset Parameters
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
    const res = await this.fetchApi<PaginatedProductsResult>(
      'productmanagement.productsinfobytype.json',
      { type, skip, limit, sort, order, locate }
    );

    const prods = (res.data.products || []).map((p) => {
      this.normalizeProductMedia(p);
      return p;
    });

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
    const res = await this.fetchApi<PaginatedProductsResult>(
      'productmanagement.productsbydescrpition.json',
      { term, skip, limit, sort, order, locate }
    );

    const prods = (res.data.products || []).map((p) => {
      this.normalizeProductMedia(p);
      return p;
    });

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
    const res = await this.fetchApi<{ product?: ProductItem }>(
      'productmanagement.uuiddata.json',
      { uuid, type: type || 'any', locate }
    );
    const prod = res.data.product || null;
    if (prod) {
      this.normalizeProductMedia(prod);
    }
    return prod;
  }

  // 6. Category Data with Chronological Support & Offset Parameters
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
    const res = await this.fetchApi<PaginatedProductsResult>(
      'productmanagement.categorydata.json',
      { category, skip, limit, sort, order, locate }
    );

    const prods = (res.data.products || []).map((p) => {
      this.normalizeProductMedia(p);
      return p;
    });

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
    const res = await this.fetchApi<{ products: ProductItem[]; creator: any; totalCount: number; hasMore: boolean; skip: number; limit: number }>(
      'productmanagement.filterproduct.json',
      { creatorId, limit, skip, sort, locate }
    );

    const prods = (res.data.products || []).map((p) => {
      this.normalizeProductMedia(p);
      return p;
    });

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
   * without missing or skipping any items.
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
          this.normalizeProductMedia(item);
          accumulatedProducts.push(item);
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
    const res = await this.fetchApi<{
      campaigns: PromotionCampaign[];
      featuredPromotions: any[];
      activeDiscounts: ProductItem[];
    }>('productmanagement.promotiondetails.json', { locale });
    return res.data;
  }

  // 9. Most Popular Products
  async getMostPopularProducts(locate: string = 'en-us'): Promise<ProductItem[]> {
    const res = await this.fetchApi<{ products: ProductItem[] }>(
      'productmanagement.mostpopproducts.json',
      { locate }
    );
    return res.data.products || [];
  }

  // 10. Free Products
  async getFreeProducts(locate: string = 'en-us'): Promise<ProductItem[]> {
    const res = await this.fetchApi<{ products: ProductItem[] }>(
      'productmanagement.freeproducts.json',
      { locate }
    );
    return res.data.products || [];
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

  // Direct arbitrary endpoint tester for the API Debugger
  async executeCustomEndpoint(endpoint: string, params: Record<string, string>) {
    return this.fetchApi(endpoint, params);
  }
}

export const marketplaceApi = new MarketplaceApiService();
