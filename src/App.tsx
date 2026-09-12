/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  Package,
  Download,
  Plus,
  Sparkles,
} from 'lucide-react';
import { marketplaceApi } from './services/marketplaceApi';
import { modrinthApi, normalizeModrinthProject } from './services/modrinthApi';
import { cfwidgetApi, normalizeCFWidgetProject } from './services/cfwidgetApi';
import { ProductItem, PromotionCampaign, SkinPreview } from './types';
import { Navbar } from './components/Navbar';
import { BannerCarousel } from './components/BannerCarousel';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CategoryFilter } from './components/CategoryFilter';
import { CreatorFilterModal } from './components/CreatorFilterModal';
import { InventoryModal } from './components/InventoryModal';
import { VersionSelectModal } from './components/VersionSelectModal';
import { LoginModal } from './components/LoginModal';
import { AccountModal } from './components/AccountModal';
import { AdminPanel } from './components/AdminPanel';
import { ServersPage } from './components/ServersPage';
import { NotFoundPage } from './components/NotFoundPage';
import { CookieBanner } from './components/CookieBanner';
import { MODRINTH_MODS } from './data/products/modrinthMods';
import { soundManager } from './utils/audio';
import { useAuth } from './context/AuthContext';
import { updateProductSeo } from './utils/seo';

export default function App() {
  const { user, profile, updateCoins, addToInventory, toggleWishlist, recordDownloadedPack } = useAuth();

  // Core user data - Synchronized with Firebase profile when logged in, or local fallback
  const [minecoins, setMinecoins] = useState<number>(() => {
    const saved = localStorage.getItem('mc_minecoins');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mc_owned_ids') || localStorage.getItem('mc_owned');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mc_wishlist_ids') || localStorage.getItem('mc_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cached product objects for persistent wishlists & inventories across page reload
  const [cachedProductsMap, setCachedProductsMap] = useState<Record<string, ProductItem>>(() => {
    try {
      const saved = localStorage.getItem('mc_saved_products_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [equippedSkin, setEquippedSkin] = useState<SkinPreview | null>(() => {
    const saved = localStorage.getItem('mc_equipped_skin');
    return saved ? JSON.parse(saved) : null;
  });

  // 404 Not Found Page State
  const [is404, setIs404] = useState<boolean>(false);

  // Sync state from Firebase Auth profile whenever it changes without wiping local items
  useEffect(() => {
    if (profile) {
      if (typeof profile.coins === 'number' && profile.coins > 0) {
        setMinecoins(profile.coins);
      }
      if (Array.isArray(profile.inventory) && profile.inventory.length > 0) {
        setOwnedItemIds((prev) => Array.from(new Set([...prev, ...profile.inventory])));
      }
      if (Array.isArray(profile.wishlist) && profile.wishlist.length > 0) {
        setWishlistIds((prev) => Array.from(new Set([...prev, ...profile.wishlist])));
      }
    }
  }, [profile]);

  // Modals for Authentication
  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return true;
    }
    return false;
  });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Marketplace & Content Data State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const productsRef = useRef<ProductItem[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global in-memory registry of all fetched products by unique ID, UUID, numeric ID, slug
  const productRegistryRef = useRef<Map<string, ProductItem>>(new Map());

  // Helper to register product under all potential identifier representations
  const registerProductInRegistry = useCallback((product: ProductItem) => {
    const reg = productRegistryRef.current;
    const strId = String(product.id || '').trim();
    const strUuid = String(product.uuid || '').trim();

    if (strId) {
      reg.set(strId, product);
      reg.set(strId.toLowerCase(), product);
      const stripped = strId.replace(/^(mr-|cf-|mod-)/i, '');
      if (stripped) {
        reg.set(stripped, product);
        reg.set(stripped.toLowerCase(), product);
        reg.set(`mr-${stripped}`, product);
        reg.set(`cf-${stripped}`, product);
      }
    }

    if (strUuid) {
      reg.set(strUuid, product);
      reg.set(strUuid.toLowerCase(), product);
      const stripped = strUuid.replace(/^(mr-|cf-|mod-)/i, '');
      if (stripped) {
        reg.set(stripped, product);
        reg.set(stripped.toLowerCase(), product);
        reg.set(`mr-${stripped}`, product);
        reg.set(`cf-${stripped}`, product);
      }
    }

    const anyProd = product as any;
    if (anyProd.slug) {
      const slugStr = String(anyProd.slug).trim();
      reg.set(slugStr, product);
      reg.set(slugStr.toLowerCase(), product);
    }
    if (anyProd.project_id) {
      const pidStr = String(anyProd.project_id).trim();
      reg.set(pidStr, product);
      reg.set(pidStr.toLowerCase(), product);
    }
    const titleSlug = product.title.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (titleSlug) {
      reg.set(titleSlug, product);
    }
  }, []);

  // Pre-load default mod catalogue into registry on mount
  useEffect(() => {
    MODRINTH_MODS.forEach((mod) => {
      registerProductInRegistry(mod);
    });
  }, [registerProductInRegistry]);

  // REST API batch pagination state
  const [modrinthTotal, setModrinthTotal] = useState<number>(100000);
  const [modrinthOffset, setModrinthOffset] = useState<number>(0);
  const [loadingMoreMods, setLoadingMoreMods] = useState<boolean>(false);

  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);

  // Active Filters & State - default strict chronological (newest first) for Java Edition
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/resourcepacks')) return 'Resource Packs';
      if (p.startsWith('/datapacks')) return 'Data Packs';
      if (p.startsWith('/shaders')) return 'Shaders';
      if (p.startsWith('/modpacks')) return 'Modpacks';
      if (p.startsWith('/plugins')) return 'Plugins';
      if (p.startsWith('/servers')) return 'Servers';
      if (p.startsWith('/mods')) return 'Mods';
    }
    return 'Mods';
  });
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [versionSelectProduct, setVersionSelectProduct] = useState<ProductItem | null>(null);

  // Clean URL routing helpers for Java Edition categories
  const getProductRoute = (product: ProductItem): string => {
    const rawId = product.id;
    const projType = String((product as any).project_type || product.type || '').toLowerCase();
    const cat = String(product.category || activeCategory || '').toLowerCase();
    const tags = Array.isArray(product.tags) ? product.tags.map((t) => String(t).toLowerCase()) : [];

    let section = 'mods';
    if (
      projType === 'resourcepack' ||
      cat.includes('ресурс') ||
      cat.includes('resource') ||
      cat.includes('текстур') ||
      tags.includes('resourcepack')
    ) {
      section = 'resourcepacks';
    } else if (
      projType === 'datapack' ||
      cat.includes('данных') ||
      cat.includes('datapack') ||
      tags.includes('datapack')
    ) {
      section = 'datapacks';
    } else if (
      projType === 'shader' ||
      cat.includes('шейдер') ||
      cat.includes('shader') ||
      tags.includes('shader')
    ) {
      section = 'shaders';
    } else if (
      projType === 'modpack' ||
      cat.includes('модпак') ||
      cat.includes('modpack') ||
      tags.includes('modpack')
    ) {
      section = 'modpacks';
    } else if (
      projType === 'plugin' ||
      cat.includes('плагин') ||
      cat.includes('plugin') ||
      tags.includes('plugin')
    ) {
      section = 'plugins';
    } else if (
      projType === 'server' ||
      cat.includes('сервер') ||
      cat.includes('server') ||
      (product as any).is_server
    ) {
      section = 'servers';
    } else {
      section = 'mods';
    }

    return `/${section}/${rawId}`;
  };

  const handleOpenProduct = useCallback((product: ProductItem, updateUrl = true) => {
    registerProductInRegistry(product);
    setSelectedProduct(product);
    setIs404(false);

    if (updateUrl && typeof window !== 'undefined') {
      const targetUrl = getProductRoute(product);
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ productId: product.id }, '', targetUrl);
      }
    }
  }, [registerProductInRegistry]);

  const handleCloseProductModal = useCallback(() => {
    setSelectedProduct(null);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (
        currentPath.startsWith('/mods/') ||
        currentPath.startsWith('/resourcepacks/') ||
        currentPath.startsWith('/datapacks/') ||
        currentPath.startsWith('/shaders/') ||
        currentPath.startsWith('/modpacks/') ||
        currentPath.startsWith('/plugins/') ||
        currentPath.startsWith('/servers/') ||
        currentPath.startsWith('/skins/')
      ) {
        const catMap: Record<string, string> = {
          'Resource Packs': '/resourcepacks',
          'Data Packs': '/datapacks',
          Shaders: '/shaders',
          Modpacks: '/modpacks',
          Plugins: '/plugins',
          Servers: '/servers',
          Mods: '/mods',
        };
        const fallbackPath = catMap[activeCategory] || '/';
        window.history.pushState(null, '', fallbackPath);
      }
    }
  }, [activeCategory]);

  // Synchronize dynamic SEO metadata (title, description, og:image, twitter:image)
  useEffect(() => {
    updateProductSeo(selectedProduct, activeCategory);
  }, [selectedProduct, activeCategory]);

  // Handle Product Selection by string or numeric ID (handles id, project_id, slug, uuid)
  const handleSelectProductById = useCallback(
    async (rawId: string | number, initialProduct?: ProductItem, updateUrl = true) => {
      const id = String(rawId || '').trim();
      if (!id) {
        setIs404(true);
        return;
      }

      // 0. If product object was passed directly, use it immediately
      if (initialProduct) {
        handleOpenProduct(initialProduct, updateUrl);
        return;
      }

      const lowerId = id.toLowerCase();
      const strippedId = id.replace(/^(mr-|cf-|mod-)/i, '');
      const strippedLower = lowerId.replace(/^(mr-|cf-|mod-)/, '');

      // 1. Check in global registry
      const reg = productRegistryRef.current;
      const cached =
        reg.get(id) ||
        reg.get(lowerId) ||
        reg.get(strippedId) ||
        reg.get(strippedLower) ||
        reg.get(`mr-${strippedId}`) ||
        reg.get(`mr-${strippedLower}`) ||
        reg.get(`cf-${strippedId}`) ||
        reg.get(`cf-${strippedLower}`) ||
        cachedProductsMap[id] ||
        cachedProductsMap[lowerId] ||
        cachedProductsMap[strippedId];

      if (cached) {
        handleOpenProduct(cached, updateUrl);
        return;
      }

      // 2. Check current in-memory products array (via productsRef)
      const currentProducts = productsRef.current;
      const localFound = currentProducts.find((p) => {
        const pId = String(p.id);
        const pIdLower = pId.toLowerCase();
        const pUuid = String(p.uuid || '');
        const pUuidLower = pUuid.toLowerCase();
        const pSlug = String((p as any).slug || '').toLowerCase();
        const pProjectId = String((p as any).project_id || '');
        const pProjectIdLower = pProjectId.toLowerCase();
        const pTitleSlug = p.title.toLowerCase().replace(/[^a-z0-9_-]/g, '');

        return (
          pId === id ||
          pIdLower === lowerId ||
          pUuid === id ||
          pUuidLower === lowerId ||
          pProjectId === id ||
          pProjectIdLower === lowerId ||
          pSlug === lowerId ||
          pSlug === strippedLower ||
          pId.replace(/^(mr-|cf-|mod-)/i, '') === strippedId ||
          pIdLower.replace(/^(mr-|cf-|mod-)/, '') === strippedLower ||
          pUuid.replace(/^(mr-|cf-|mod-)/i, '') === strippedId ||
          pUuidLower.replace(/^(mr-|cf-|mod-)/, '') === strippedLower ||
          pTitleSlug === strippedLower
        );
      });

      if (localFound) {
        handleOpenProduct(localFound, updateUrl);
        return;
      }

      // 3. Fast background request to our backend REST API (/api/product-lookup)
      // Checks Marketplace, Modrinth, and CFWidget simultaneously on the server
      try {
        const lookupRes = await fetch(`/api/product-lookup?id=${encodeURIComponent(id)}`, {
          headers: { Accept: 'application/json' },
        });
        if (lookupRes.ok) {
          const resData = await lookupRes.json();
          if (resData.found && resData.product) {
            let normalized: ProductItem;
            if (resData.source === 'modrinth') {
              normalized = normalizeModrinthProject(resData.product);
            } else if (resData.source === 'cfwidget') {
              normalized = normalizeCFWidgetProject(resData.product);
            } else {
              normalized = resData.product;
            }

            registerProductInRegistry(normalized);
            setProducts((prev) => (prev.some((p) => p.id === normalized.id) ? prev : [normalized, ...prev]));
            handleOpenProduct(normalized, updateUrl);
            return;
          }
        }
      } catch (err) {
        console.warn('REST API product lookup notice:', err);
      }

      // 4. Secondary fallback: Direct Modrinth API lookup (with case-preserved ID and slug)
      try {
        const mrIdsToTry = [strippedId, strippedLower, id];
        for (const mid of Array.from(new Set(mrIdsToTry))) {
          if (!mid) continue;
          const mrRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(mid)}`, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
            },
          });
          if (mrRes.ok) {
            const hit = await mrRes.json();
            if (hit && (hit.id || hit.slug)) {
              const normalized = normalizeModrinthProject(hit);
              if (normalized) {
                registerProductInRegistry(normalized);
                setProducts((prev) => (prev.some((p) => p.id === normalized.id) ? prev : [normalized, ...prev]));
                handleOpenProduct(normalized, updateUrl);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Modrinth direct project lookup notice:', err);
      }

      // 5. Secondary fallback: CFWidget API search via our backend proxy
      try {
        const cfSearch = await cfwidgetApi.searchMods({ query: strippedLower, limit: 10 });
        if (cfSearch.products && cfSearch.products.length > 0) {
          const matched = cfSearch.products.find((p) => {
            const pId = String(p.id).toLowerCase();
            const pUuid = String(p.uuid || '').toLowerCase();
            const pTitle = p.title.toLowerCase();
            const pStripped = pId.replace(/^(mr-|cf-)/, '');
            return (
              pId === lowerId ||
              pUuid === lowerId ||
              pStripped === strippedLower ||
              pTitle === strippedLower ||
              pTitle.replace(/\s+/g, '-') === strippedLower
            );
          });
          if (matched) {
            registerProductInRegistry(matched);
            setProducts((prev) => (prev.some((p) => p.id === matched.id) ? prev : [matched, ...prev]));
            handleOpenProduct(matched, updateUrl);
            return;
          }
        }
      } catch (err) {
        console.warn('CFWidget search fallback notice:', err);
      }

      // 6. If REST API confirmed product does not exist in nature -> ONLY then 404!
      setIs404(true);
      setSelectedProduct(null);
    },
    [handleOpenProduct, registerProductInRegistry, cachedProductsMap]
  );

  const handleSelectProductByIdRef = useRef(handleSelectProductById);
  useEffect(() => {
    handleSelectProductByIdRef.current = handleSelectProductById;
  }, [handleSelectProductById]);

  // Return to home page / reset routing
  const handleGoHome = useCallback(() => {
    setIs404(false);
    setSelectedProduct(null);
    setShowLoginModal(false);
    setActiveCategory('Mods');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  // Initial URL check on mount (deep linking & route handling - runs ONCE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;

    if (path === '/login') {
      setShowLoginModal(true);
      setIs404(false);
      return;
    }

    if (path === '/' || path === '' || path === '/mods') {
      setActiveCategory('Mods');
      setIs404(false);
      return;
    }
    if (path === '/resourcepacks') {
      setActiveCategory('Resource Packs');
      setIs404(false);
      return;
    }
    if (path === '/datapacks') {
      setActiveCategory('Data Packs');
      setIs404(false);
      return;
    }
    if (path === '/shaders') {
      setActiveCategory('Shaders');
      setIs404(false);
      return;
    }
    if (path === '/modpacks') {
      setActiveCategory('Modpacks');
      setIs404(false);
      return;
    }
    if (path === '/plugins') {
      setActiveCategory('Plugins');
      setIs404(false);
      return;
    }
    if (path === '/servers') {
      setActiveCategory('Servers');
      setIs404(false);
      return;
    }

    const match = path.match(/^\/(mods|resourcepacks|datapacks|shaders|modpacks|plugins|servers|skins)\/([^/]+)/);
    if (match) {
      const section = match[1];
      const idFromUrl = decodeURIComponent(match[2]);
      setIs404(false);
      if (section === 'resourcepacks') setActiveCategory('Resource Packs');
      else if (section === 'datapacks') setActiveCategory('Data Packs');
      else if (section === 'shaders') setActiveCategory('Shaders');
      else if (section === 'modpacks') setActiveCategory('Modpacks');
      else if (section === 'plugins') setActiveCategory('Plugins');
      else if (section === 'servers') {
        setActiveCategory('Servers');
        setSelectedServerId(idFromUrl);
        return;
      }
      else if (section === 'mods') setActiveCategory('Mods');

      handleSelectProductByIdRef.current(idFromUrl, undefined, false);
      return;
    }

    // Any other unrecognized route triggers 404
    setIs404(true);
  }, []);

  // Sync with browser history (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;

      if (path === '/login') {
        setShowLoginModal(true);
        setIs404(false);
        return;
      }

      setShowLoginModal(false);

      if (path === '/' || path === '' || path === '/mods') {
        setActiveCategory('Mods');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/resourcepacks') {
        setActiveCategory('Resource Packs');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/datapacks') {
        setActiveCategory('Data Packs');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/shaders') {
        setActiveCategory('Shaders');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/modpacks') {
        setActiveCategory('Modpacks');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/plugins') {
        setActiveCategory('Plugins');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }
      if (path === '/servers') {
        setActiveCategory('Servers');
        setSelectedProduct(null);
        setSelectedServerId(null);
        setIs404(false);
        return;
      }

      const match = path.match(/^\/(mods|resourcepacks|datapacks|shaders|modpacks|plugins|servers|skins)\/([^/]+)/);
      if (match) {
        const section = match[1];
        const idFromUrl = decodeURIComponent(match[2]);
        setIs404(false);
        if (section === 'servers') {
          setActiveCategory('Servers');
          setSelectedServerId(idFromUrl);
          setSelectedProduct(null);
          return;
        }
        handleSelectProductByIdRef.current(idFromUrl, undefined, false);
        return;
      }

      setIs404(true);
      setSelectedProduct(null);
      setSelectedServerId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeCategory]);

  // Category switch handler with URL synchronization
  const handleSelectCategory = (cat: string) => {
    setSelectedCreatorId(null);
    setActiveCategory(cat);
    setSelectedProduct(null);
    setSelectedServerId(null);
    setIs404(false);

    const categoryPathMap: Record<string, string> = {
      'Resource Packs': '/resourcepacks',
      'Наборы ресурсов': '/resourcepacks',
      'Data Packs': '/datapacks',
      'Наборы данных': '/datapacks',
      Shaders: '/shaders',
      'Шейдеры': '/shaders',
      Modpacks: '/modpacks',
      'Модпаки': '/modpacks',
      Plugins: '/plugins',
      'Плагины': '/plugins',
      Servers: '/servers',
      'Серверы': '/servers',
      Mods: '/mods',
      'Моды': '/mods',
    };

    const targetPath = categoryPathMap[cat] || (cat === 'Mods' ? '/' : `/${cat.toLowerCase()}`);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ category: cat }, '', targetPath);
    }
  };

  // Modals
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<'locker' | 'wishlist'>('locker');

  // Save persistent state
  useEffect(() => {
    localStorage.setItem('mc_minecoins', minecoins.toString());
  }, [minecoins]);

  useEffect(() => {
    localStorage.setItem('mc_owned_ids', JSON.stringify(ownedItemIds));
    localStorage.setItem('mc_owned', JSON.stringify(ownedItemIds));
  }, [ownedItemIds]);

  useEffect(() => {
    localStorage.setItem('mc_wishlist_ids', JSON.stringify(wishlistIds));
    localStorage.setItem('mc_wishlist', JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem('mc_saved_products_map', JSON.stringify(cachedProductsMap));
    } catch (e) {
      console.warn('Could not save product cache to localStorage', e);
    }
  }, [cachedProductsMap]);

  useEffect(() => {
    if (equippedSkin) {
      localStorage.setItem('mc_equipped_skin', JSON.stringify(equippedSkin));
    }
  }, [equippedSkin]);

  // Load promo campaigns (for banners) from marketplaceApi
  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const promoRes = await marketplaceApi.getPromotionDetails();
        setCampaigns(promoRes.campaigns || []);
      } catch (err) {
        console.error('Failed to load marketplace promotions / banner data', err);
      }
    }
    loadAuxiliaryData();
  }, []);

  // Category to Modrinth search parameters helper
  const getCategoryModrinthParams = (category: string) => {
    const norm = (category || '').toLowerCase().trim();
    if (norm.includes('ресурс') || norm.includes('resource')) {
      return { facets: JSON.stringify([['project_type:resourcepack']]), query: '', section: 'resourcepacks' };
    }
    if (norm.includes('данных') || norm.includes('datapack') || norm.includes('data')) {
      return { facets: JSON.stringify([['project_type:datapack']]), query: '', section: 'datapacks' };
    }
    if (norm.includes('шейдер') || norm.includes('shader')) {
      return { facets: JSON.stringify([['project_type:shader']]), query: '', section: 'shaders' };
    }
    if (norm.includes('модпак') || norm.includes('modpack')) {
      return { facets: JSON.stringify([['project_type:modpack']]), query: '', section: 'modpacks' };
    }
    if (norm.includes('плагин') || norm.includes('plugin')) {
      return { facets: JSON.stringify([['project_type:plugin']]), query: '', section: 'plugins' };
    }
    if (norm.includes('сервер') || norm.includes('server')) {
      return { facets: undefined, query: 'server', section: 'servers' };
    }
    // Default to mods
    return { facets: JSON.stringify([['project_type:mod']]), query: '', section: 'mods' };
  };

  // Fetch all products: Modrinth items strictly in the feed
  const fetchAllProducts = useCallback(
    async (category: string, sort: string) => {
      if (category === 'Servers' || category === 'Серверы') {
        setLoading(false);
        setProducts([]);
        setModrinthTotal(0);
        setModrinthOffset(0);
        return;
      }

      setLoading(true);

      try {
        const { facets, query } = getCategoryModrinthParams(category);
        const resolvedSort = sort === 'oldest' ? 'oldest' : 'newest';

        const mrRes = await modrinthApi
          .searchMods({
            query: query || '',
            sort: resolvedSort,
            limit: 60,
            offset: 0,
            facets,
          })
          .catch((err) => {
            console.warn('Modrinth fetch error', err);
            return { products: [], totalCount: 0, hasMore: false, offset: 0, limit: 60 };
          });

        const mrProducts = mrRes.products || [];
        const total = mrRes.totalCount || mrProducts.length;
        setModrinthTotal(total);
        setModrinthOffset(mrProducts.length);

        const uniqueMap = new Map<string, ProductItem>();
        for (const item of mrProducts) {
          registerProductInRegistry(item);
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        }

        const finalList = Array.from(uniqueMap.values());
        setProducts(finalList);
        setTotalCount(total);
      } catch (err) {
        console.error('Failed to fetch catalog from Modrinth', err);
      } finally {
        setLoading(false);
      }
    },
    [registerProductInRegistry]
  );

  // Live search across Modrinth REST API whenever searchQuery changes
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      fetchAllProducts(activeCategory, sortBy);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { facets } = getCategoryModrinthParams(activeCategory);
        const mrRes = await modrinthApi
          .searchMods({
            query: term,
            limit: 50,
            sort: 'newest',
            facets: activeCategory === 'Servers' ? undefined : facets,
          })
          .catch(() => ({ products: [] as ProductItem[], totalCount: 0, hasMore: false, offset: 0, limit: 50 }));

        const searchProducts = mrRes.products || [];
        const uniqueMap = new Map<string, ProductItem>();
        for (const item of searchProducts) {
          registerProductInRegistry(item);
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        }
        const searchList = Array.from(uniqueMap.values());
        setProducts(searchList);
        setTotalCount(mrRes.totalCount || searchList.length);
      } catch (err) {
        console.warn('Search query error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, sortBy, fetchAllProducts, registerProductInRegistry]);

  // Load More items directly from Modrinth REST API
  const handleLoadMoreMods = async (amount: number = 60) => {
    if (loadingMoreMods) return;
    setLoadingMoreMods(true);
    soundManager.playClick();

    try {
      const nextOffset = modrinthOffset;
      const { facets, query } = getCategoryModrinthParams(activeCategory);

      const mrRes = await modrinthApi
        .searchMods({
          query: query || '',
          sort: sortBy === 'oldest' ? 'oldest' : 'newest',
          limit: amount,
          offset: nextOffset,
          facets,
        })
        .catch(() => ({ products: [] }));

      const newMods = mrRes.products || [];
      if (newMods.length > 0) {
        setModrinthOffset(nextOffset + newMods.length);

        setProducts((prev) => {
          const uniqueMap = new Map<string, ProductItem>();
          for (const item of prev) {
            uniqueMap.set(item.id, item);
            registerProductInRegistry(item);
          }
          for (const item of newMods) {
            registerProductInRegistry(item);
            if (!uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item);
            }
          }
          const merged = Array.from(uniqueMap.values());
          setTotalCount(merged.length);
          return merged;
        });

        soundManager.playLevelUp();
      }
    } catch (err) {
      console.warn('Failed to load more from Modrinth:', err);
    } finally {
      setLoadingMoreMods(false);
    }
  };

  // Trigger load whenever category or sort changes (when not searching)
  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchAllProducts(activeCategory, sortBy);
    }
  }, [activeCategory, sortBy, fetchAllProducts, searchQuery]);

  // Add Minecoins
  const handleAddMinecoins = (amount: number) => {
    const nextVal = minecoins + amount;
    setMinecoins(nextVal);
    if (user) {
      updateCoins(nextVal);
    }
  };

  // Toggle Wishlist
  const handleToggleWishlist = (product: ProductItem) => {
    soundManager.playClick();
    registerProductInRegistry(product);

    const isPresent = wishlistIds.includes(product.id);
    const nextList = isPresent
      ? wishlistIds.filter((id) => id !== product.id)
      : [...wishlistIds, product.id];
    setWishlistIds(nextList);

    setCachedProductsMap((prev) => {
      const updated = { ...prev };
      if (!isPresent) {
        updated[product.id] = product;
        if (product.uuid) updated[product.uuid] = product;
      }
      return updated;
    });

    if (user) {
      toggleWishlist(product.id);
    }
  };

  // Purchase / Claim Product (Always 100% Free on MineHolde)
  const handlePurchaseProduct = (product: ProductItem) => {
    registerProductInRegistry(product);
    if (!ownedItemIds.includes(product.id)) {
      const nextOwned = [...ownedItemIds, product.id];
      setOwnedItemIds(nextOwned);

      setCachedProductsMap((prev) => {
        const updated = { ...prev };
        updated[product.id] = product;
        if (product.uuid) updated[product.uuid] = product;
        return updated;
      });

      if (user) {
        addToInventory(product.id);
      }
    }

    // Auto-equip first skin if it's a skin pack and user doesn't have an equipped skin yet
    if (product.skins && product.skins.length > 0 && !equippedSkin) {
      setEquippedSkin(product.skins[0]);
    }

    soundManager.playLevelUp();
  };

  // Record pack download
  const handleRecordDownload = (pack: { id: string; title: string; type: string }) => {
    if (user) {
      recordDownloadedPack(pack);
    }
  };

  // Owned & Wishlist items objects: combines in-memory products, registry and local cache
  const ownedItems = products
    .filter((p) => ownedItemIds.includes(p.id))
    .concat(
      ownedItemIds
        .filter((id) => !products.some((p) => p.id === id))
        .map((id) => productRegistryRef.current.get(id) || cachedProductsMap[id])
        .filter((p): p is ProductItem => Boolean(p))
    );

  const wishlistItems = products
    .filter((p) => wishlistIds.includes(p.id))
    .concat(
      wishlistIds
        .filter((id) => !products.some((p) => p.id === id))
        .map((id) => productRegistryRef.current.get(id) || cachedProductsMap[id])
        .filter((p): p is ProductItem => Boolean(p))
    );

  // Sale Product IDs for sales section
  const saleItemIds = products.filter((p) => p.isSale).map((p) => p.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#1b1b1d] text-[#e0e0e0]">
      {/* Top Navbar */}
      <Navbar
        minecoins={minecoins}
        onAddMinecoins={handleAddMinecoins}
        onOpenInventory={() => {
          setInventoryTab('locker');
          setShowInventory(true);
        }}
        onOpenWishlist={() => {
          setInventoryTab('wishlist');
          setShowInventory(true);
        }}
        onOpenLogin={() => {
          setShowLoginModal(true);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.history.pushState({ login: true }, '', '/login');
          }
        }}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onSelectProduct={(id, p) => handleSelectProductById(id, p)}
        onSelectCategory={handleSelectCategory}
        activeCategory={activeCategory}
        wishlistCount={wishlistIds.length}
        inventoryCount={ownedItemIds.length}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {is404 ? (
          <NotFoundPage onGoHome={handleGoHome} />
        ) : (
          <>
            {/* Banner Carousel */}
            <BannerCarousel
              campaigns={campaigns}
              onSelectPromotion={(promo) => {
                if (promo.targetCategory) {
                  handleSelectCategory(promo.targetCategory);
                } else if (promo.featuredProductIds.length > 0) {
                  handleSelectProductById(promo.featuredProductIds[0]);
                }
              }}
            />

            {activeCategory === 'Servers' ? (
              <section id="mc-servers-section" className="space-y-4">
                <CategoryFilter
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  itemCount={0}
                />
                <ServersPage
                  onSelectProduct={(id) => handleSelectProductById(id)}
                  onOpenCreator={(creatorId) => setSelectedCreatorId(creatorId)}
                  initialServerId={selectedServerId}
                />
              </section>
            ) : (
              /* Category & Content Catalog */
              <section id="mc-catalog-section">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <CategoryFilter
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  itemCount={products.length}
                />

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 self-end sm:self-auto -mt-3 sm:mt-0">
                  <span className="text-xs text-[#8e8e93] flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Сортировка:</span>
                  </span>
                  <select
                    id="mc-sort-select"
                    value={sortBy}
                    onChange={(e) => {
                      soundManager.playClick();
                      setSortBy(e.target.value);
                    }}
                    className="mc-input px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="newest">Сначала самые новые (2026 → 2017)</option>
                    <option value="oldest">Сначала самые старые (2017 → 2026)</option>
                    <option value="popular">По популярности</option>
                    <option value="rating">Высокий рейтинг</option>
                    <option value="name-asc">По названию (А-Я / A-Z)</option>
                    <option value="price-asc">Сначала дешевле</option>
                    <option value="price-desc">Сначала дороже</option>
                  </select>
                </div>
              </div>

              {/* Product Grid - Displays ALL items */}
              {loading ? (
                <div className="text-center py-20 mc-panel-dark flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#82d458]" />
                  <span className="text-sm font-bold text-white">
                    Загрузка каталога дополнений и модификаций...
                  </span>
                  <span className="text-xs text-[#8e8e93]">
                    Синхронизация модов, текстур, скин-паков и миров
                  </span>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 mc-panel-dark text-sm text-[#8e8e93]">
                  По выбранному фильтру товары не найдены. Попробуйте выбрать категорию «Все» или воспользуйтесь поиском!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => handleOpenProduct(p, true)}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      isOwned={ownedItemIds.includes(prod.id)}
                      onOpenVersionSelect={(p) => setVersionSelectProduct(p)}
                    />
                  ))}
                </div>
              )}

              {/* Load More Section */}
              {!loading && products.length > 0 && (
                <div
                  id="mc-catalog-load-more-section"
                  className="mt-6 p-4 sm:p-5 mc-panel-dark border-2 border-[#3c8527] bg-[#1a2e15]/40 flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-left w-full md:w-auto">
                    <div className="w-10 h-10 bg-[#255218] border border-[#499e30] flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-[#82d458]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Каталог модификаций и дополнений
                        </span>
                        <span className="bg-[#499e30] text-white text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                          ОНЛАЙН КАТАЛОГ
                        </span>
                      </div>
                      <p className="text-xs text-[#a6a6ab] mt-0.5">
                        В ленте сейчас: <strong className="text-[#82d458]">{products.length}</strong> дополнений из более чем <strong className="text-white">{(modrinthTotal || 100000).toLocaleString('ru-RU')}</strong> доступных в каталоге
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
                    <button
                      id="mc-load-more-100-btn"
                      disabled={loadingMoreMods}
                      onClick={() => handleLoadMoreMods(100)}
                      className="mc-button px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loadingMoreMods ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>+100 модов</span>
                    </button>

                    <button
                      id="mc-load-more-250-btn"
                      disabled={loadingMoreMods}
                      onClick={() => handleLoadMoreMods(250)}
                      className="mc-button px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-[#3c8527] border-[#82d458]"
                    >
                      {loadingMoreMods ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>+250 модов</span>
                    </button>

                    <button
                      id="mc-load-more-500-btn"
                      disabled={loadingMoreMods}
                      onClick={() => handleLoadMoreMods(500)}
                      className="mc-button px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-[#255218] hover:bg-[#2f661f] border-[#499e30]"
                    >
                      {loadingMoreMods ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#f39c12]" />
                      )}
                      <span>Загрузить 500 модов</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-[#141416] border-t-4 border-[#0d0d0e] py-8 text-xs text-[#8e8e93]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#5b8731] border border-[#81bc43] flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-[#875529]" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">MineHolde Market</div>
              <div>Каталог модификаций, текстур, скин-паков и миров</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span>Шрифт: Mojangles</span>
            <span className="text-[#444]">|</span>
            <span>Форматы: оригинальные файлы Java Edition (.jar, .zip)</span>
            <span className="text-[#444]">|</span>
            <span>Хронологический каталог 2026 → 2017</span>
          </div>
        </div>
      </footer>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseProductModal}
          minecoins={minecoins}
          isOwned={ownedItemIds.includes(selectedProduct.id)}
          isWishlisted={wishlistIds.includes(selectedProduct.id)}
          onPurchase={handlePurchaseProduct}
          onToggleWishlist={handleToggleWishlist}
          onSelectCreator={(cId) => setSelectedCreatorId(cId)}
          onEquipSkin={(skin) => setEquippedSkin(skin)}
          equippedSkinId={equippedSkin?.id}
        />
      )}

      {/* Creator Profile Modal */}
      {selectedCreatorId && (
        <CreatorFilterModal
          creatorId={selectedCreatorId}
          onClose={() => setSelectedCreatorId(null)}
          onSelectProduct={(p) => handleOpenProduct(p, true)}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          ownedIds={ownedItemIds}
        />
      )}

      {/* Locker & Wishlist Modal */}
      <InventoryModal
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        initialTab={inventoryTab}
        ownedItems={ownedItems}
        wishlistItems={wishlistItems}
        onSelectProduct={(p) => handleOpenProduct(p, true)}
        onRemoveFromWishlist={handleToggleWishlist}
        equippedSkin={equippedSkin}
        onEquipSkin={(skin) => setEquippedSkin(skin)}
      />

      {/* Login Modal with Google and Guest options */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            window.history.pushState(null, '', '/');
          }
        }}
      />

      {/* User Account Profile Modal (Аккаунт MineHolde) */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onOpenInventory={() => {
          setInventoryTab('locker');
          setShowInventory(true);
        }}
        onOpenWishlist={() => {
          setInventoryTab('wishlist');
          setShowInventory(true);
        }}
      />

      {/* Firebase Admin Panel Modal */}
      <AdminPanel
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* Dynamic Modrinth Version Selection Modal */}
      <VersionSelectModal
        product={versionSelectProduct}
        isOpen={!!versionSelectProduct}
        onClose={() => setVersionSelectProduct(null)}
      />

      {/* Minecraft Pixel Cookie Consent Notification */}
      <CookieBanner />
    </div>
  );
}

