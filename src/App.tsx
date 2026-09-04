/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame,
  RefreshCw,
  SlidersHorizontal,
  Package,
  Download,
  Plus,
  Sparkles,
} from 'lucide-react';
import { marketplaceApi } from './services/marketplaceApi';
import { modrinthApi } from './services/modrinthApi';
import { cfwidgetApi } from './services/cfwidgetApi';
import { ProductItem, PromotionCampaign, SkinPreview } from './types';
import { Navbar } from './components/Navbar';
import { BannerCarousel } from './components/BannerCarousel';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { SalesSection } from './components/SalesSection';
import { FreeItemsSection } from './components/FreeItemsSection';
import { CategoryFilter } from './components/CategoryFilter';
import { CreatorFilterModal } from './components/CreatorFilterModal';
import { InventoryModal } from './components/InventoryModal';
import { VersionSelectModal } from './components/VersionSelectModal';
import { LoginModal } from './components/LoginModal';
import { AccountModal } from './components/AccountModal';
import { AdminPanel } from './components/AdminPanel';
import { ServersPage } from './components/ServersPage';
import { soundManager } from './utils/audio';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, profile, updateCoins, addToInventory, toggleWishlist, recordDownloadedPack } = useAuth();

  // Core user data - Synchronized with Firebase profile when logged in, or local fallback
  const [minecoins, setMinecoins] = useState<number>(() => {
    const saved = localStorage.getItem('mc_minecoins');
    return saved !== null ? parseInt(saved, 10) : 0; // Default 0 MineHolde coins
  });

  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('mc_owned');
    return saved ? JSON.parse(saved) : ['item-anniversary-celebration'];
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('mc_wishlist');
    return saved ? JSON.parse(saved) : ['item-dragon-riders'];
  });

  const [equippedSkin, setEquippedSkin] = useState<SkinPreview | null>(() => {
    const saved = localStorage.getItem('mc_equipped_skin');
    return saved ? JSON.parse(saved) : null;
  });

  // Sync state from Firebase Auth profile whenever it changes
  useEffect(() => {
    if (profile) {
      setMinecoins(profile.coins ?? 0);
      setOwnedItemIds(profile.inventory ?? ['item-anniversary-celebration']);
      setWishlistIds(profile.wishlist ?? ['item-dragon-riders']);
    }
  }, [profile]);

  // Modals for Authentication
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Marketplace & Modrinth & CFWidget Content Data State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global in-memory registry of all fetched products by unique ID & UUID
  // Ensures selecting any item opens the exact matching product, even across dynamic pagination and search
  const productRegistryRef = useRef<Map<string, ProductItem>>(new Map());

  // REST API batch pagination state
  const [modrinthTotal, setModrinthTotal] = useState<number>(100000);
  const [modrinthOffset, setModrinthOffset] = useState<number>(0);
  const [loadingMoreMods, setLoadingMoreMods] = useState<boolean>(false);

  const [popularProducts, setPopularProducts] = useState<ProductItem[]>([]);
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);

  // Active Filters & State - default strict chronological (newest first)
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/servers')) {
      return 'Servers';
    }
    return 'All';
  });
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [versionSelectProduct, setVersionSelectProduct] = useState<ProductItem | null>(null);

  // Sync with browser history (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/servers')) {
        setActiveCategory('Servers');
      } else {
        setActiveCategory('All');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Category switch handler with URL synchronization
  const handleSelectCategory = (cat: string) => {
    if (cat === 'Creators') {
      setSelectedCreatorId('noxcrew');
    } else if (cat === 'Servers') {
      setActiveCategory('Servers');
      if (window.location.pathname !== '/servers') {
        window.history.pushState(null, '', '/servers');
      }
    } else {
      setActiveCategory(cat);
      if (window.location.pathname.startsWith('/servers')) {
        window.history.pushState(null, '', '/');
      }
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
    localStorage.setItem('mc_owned', JSON.stringify(ownedItemIds));
  }, [ownedItemIds]);

  useEffect(() => {
    localStorage.setItem('mc_wishlist', JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    if (equippedSkin) {
      localStorage.setItem('mc_equipped_skin', JSON.stringify(equippedSkin));
    }
  }, [equippedSkin]);

  // Load promo campaigns & popular items once
  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const promoRes = await marketplaceApi.getPromotionDetails();
        setCampaigns(promoRes.campaigns || []);

        const popRes = await marketplaceApi.getMostPopularProducts();
        setPopularProducts(popRes || []);
      } catch (err) {
        console.error('Failed to load marketplace promotions / popular data', err);
      }
    }
    loadAuxiliaryData();
  }, []);

  // Fetch all products: CFWidget + Modrinth items strictly in the feed
  const fetchAllProducts = useCallback(
    async (category: string, sort: string) => {
      setLoading(true);

      try {
        const isModCat = category === 'Mods';
        const modLimit = isModCat ? 100 : 50;

        // Fetch from both CFWidget and Modrinth in parallel
        const [cfRes, mrRes] = await Promise.all([
          cfwidgetApi
            .searchMods({
              query: '',
              sort: sort === 'oldest' ? 'oldest' : 'newest',
              limit: modLimit,
              offset: 0,
            })
            .catch((err) => {
              console.warn('CFWidget fetch error', err);
              return { products: [], totalCount: 0, hasMore: false, offset: 0, limit: modLimit };
            }),
          modrinthApi
            .searchMods({
              query: '',
              sort: sort === 'oldest' ? 'oldest' : 'newest',
              limit: modLimit,
              offset: 0,
              facets:
                category === 'Textures'
                  ? JSON.stringify([['project_type:resourcepack']])
                  : JSON.stringify([['project_type:mod']]),
            })
            .catch((err) => {
              console.warn('Modrinth fetch error', err);
              return { products: [], totalCount: 0, hasMore: false, offset: 0, limit: modLimit };
            }),
        ]);

        const cfProducts = cfRes.products || [];
        const mrProducts = mrRes.products || [];

        // Save total count
        const total = (cfRes.totalCount || 0) + (mrRes.totalCount || 74600);
        setModrinthTotal(total);
        setModrinthOffset(mrProducts.length);

        // Merge keeping CFWidget and Modrinth items
        const combined = [...cfProducts, ...mrProducts];

        // Unique map preserving order & update global registry
        const uniqueMap = new Map<string, ProductItem>();
        for (const item of combined) {
          productRegistryRef.current.set(item.id, item);
          if (item.uuid) productRegistryRef.current.set(item.uuid, item);
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        }

        const finalList = Array.from(uniqueMap.values());
        setProducts(finalList);
        setTotalCount(finalList.length);
      } catch (err) {
        console.error('Failed to fetch catalog', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Live search across open REST APIs whenever searchQuery changes
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      if (activeCategory !== 'Servers') {
        fetchAllProducts(activeCategory, sortBy);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [cfRes, mrRes] = await Promise.all([
          cfwidgetApi.searchMods({ query: term, limit: 50 }).catch(() => ({ products: [] })),
          modrinthApi.searchMods({ query: term, limit: 50 }).catch(() => ({ products: [] })),
        ]);

        const combined = [...(cfRes.products || []), ...(mrRes.products || [])];
        const uniqueMap = new Map<string, ProductItem>();
        for (const item of combined) {
          productRegistryRef.current.set(item.id, item);
          if (item.uuid) productRegistryRef.current.set(item.uuid, item);
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        }
        const searchList = Array.from(uniqueMap.values());
        setProducts(searchList);
        setTotalCount(searchList.length);
      } catch (err) {
        console.warn('Search query error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, sortBy, fetchAllProducts]);

  // Load More Mods directly from CFWidget and Modrinth REST APIs
  const handleLoadMoreMods = async (amount: number = 100) => {
    if (loadingMoreMods) return;
    setLoadingMoreMods(true);
    soundManager.playClick();

    try {
      const halfAmount = Math.ceil(amount / 2);
      const nextOffset = modrinthOffset;

      const [cfRes, mrRes] = await Promise.all([
        cfwidgetApi
          .searchMods({
            query: '',
            sort: sortBy === 'oldest' ? 'oldest' : 'newest',
            limit: halfAmount,
            offset: nextOffset,
          })
          .catch(() => ({ products: [] })),
        modrinthApi
          .searchMods({
            query: '',
            sort: sortBy === 'oldest' ? 'oldest' : 'newest',
            limit: halfAmount,
            offset: nextOffset,
            facets:
              activeCategory === 'Textures'
                ? JSON.stringify([['project_type:resourcepack']])
                : JSON.stringify([['project_type:mod']]),
          })
          .catch(() => ({ products: [] })),
      ]);

      const newMods = [...(cfRes.products || []), ...(mrRes.products || [])];
      if (newMods.length > 0) {
        setModrinthOffset(nextOffset + halfAmount);

        setProducts((prev) => {
          const uniqueMap = new Map<string, ProductItem>();
          for (const item of prev) {
            uniqueMap.set(item.id, item);
            productRegistryRef.current.set(item.id, item);
          }
          for (const item of newMods) {
            productRegistryRef.current.set(item.id, item);
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
      console.warn('Failed to load more mods:', err);
    } finally {
      setLoadingMoreMods(false);
    }
  };

  // Trigger load whenever category or sort changes (when not searching)
  useEffect(() => {
    if (!searchQuery.trim() && activeCategory !== 'Servers') {
      fetchAllProducts(activeCategory, sortBy);
    }
  }, [activeCategory, sortBy, fetchAllProducts, searchQuery]);

  // Handle Product Selection by unique ID (ensures 100% accurate product modal opening)
  const handleSelectProductById = async (id: string, initialProduct?: ProductItem) => {
    // 0. If product object was passed directly, use it immediately
    if (initialProduct && (initialProduct.id === id || !id)) {
      productRegistryRef.current.set(initialProduct.id, initialProduct);
      setSelectedProduct(initialProduct);
      return;
    }

    // 1. Check in global registry
    if (productRegistryRef.current.has(id)) {
      setSelectedProduct(productRegistryRef.current.get(id)!);
      return;
    }

    // 2. Check current in-memory products array
    const localFound = products.find((p) => p.id === id || p.uuid === id);
    if (localFound) {
      productRegistryRef.current.set(id, localFound);
      setSelectedProduct(localFound);
      return;
    }

    // 3. Check popular products
    const popFound = popularProducts.find((p) => p.id === id || p.uuid === id);
    if (popFound) {
      productRegistryRef.current.set(id, popFound);
      setSelectedProduct(popFound);
      return;
    }

    // 4. If CFWidget product (cf-...)
    if (id.startsWith('cf-')) {
      try {
        const slugOrId = id.replace(/^cf-/, '');
        const cfRes = await cfwidgetApi.searchMods({ query: slugOrId, limit: 5 });
        const exact =
          (cfRes.products || []).find((p) => p.id === id) || (cfRes.products && cfRes.products[0]);
        if (exact) {
          productRegistryRef.current.set(exact.id, exact);
          setSelectedProduct(exact);
          return;
        }
      } catch (err) {
        console.warn('Error fetching CFWidget item by id', err);
      }
    }

    // 5. If Modrinth product (mr-...)
    if (id.startsWith('mr-')) {
      try {
        const slugOrId = id.replace(/^mr-/, '');
        const mrRes = await modrinthApi.searchMods({ query: slugOrId, limit: 5 });
        const exact =
          (mrRes.products || []).find((p) => p.id === id) || (mrRes.products && mrRes.products[0]);
        if (exact) {
          productRegistryRef.current.set(exact.id, exact);
          setSelectedProduct(exact);
          return;
        }
      } catch (err) {
        console.warn('Error fetching Modrinth item by id', err);
      }
    }

    // 6. Otherwise try Marketplace API details
    try {
      const details = await marketplaceApi.getProductDetails(id);
      if (details && details.id) {
        productRegistryRef.current.set(details.id, details);
        setSelectedProduct(details);
      }
    } catch {
      // Not found
    }
  };

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
    const isPresent = wishlistIds.includes(product.id);
    const nextList = isPresent
      ? wishlistIds.filter((id) => id !== product.id)
      : [...wishlistIds, product.id];
    setWishlistIds(nextList);

    if (user) {
      toggleWishlist(product.id);
    }
  };

  // Purchase / Claim Product (Always 100% Free on MineHolde)
  const handlePurchaseProduct = (product: ProductItem) => {
    if (!ownedItemIds.includes(product.id)) {
      const nextOwned = [...ownedItemIds, product.id];
      setOwnedItemIds(nextOwned);
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

  // Owned items objects
  const ownedItems = products.filter((p) => ownedItemIds.includes(p.id));
  const wishlistItems = products.filter((p) => wishlistIds.includes(p.id));

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
        onOpenLogin={() => setShowLoginModal(true)}
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
        {activeCategory === 'Servers' ? (
          /* Official Minecraft Bedrock Partner Servers View */
          <ServersPage
            onSelectProduct={handleSelectProductById}
            onOpenCreator={(creatorId) => setSelectedCreatorId(creatorId)}
          />
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

            {/* Free Items Shelf */}
            {activeCategory === 'All' && (
              <FreeItemsSection
                onSelectProduct={(p) => setSelectedProduct(p)}
                ownedIds={ownedItemIds}
              />
            )}

            {/* Sales Shelf */}
            {activeCategory === 'All' && saleItemIds.length > 0 && (
              <SalesSection
                onSelectProduct={(p) => setSelectedProduct(p)}
                saleProductIds={saleItemIds}
              />
            )}

            {/* Category & Content Catalog */}
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
                      onSelect={(p) => {
                        productRegistryRef.current.set(p.id, p);
                        setSelectedProduct(p);
                      }}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      isOwned={ownedItemIds.includes(prod.id)}
                      onOpenVersionSelect={(p) => setVersionSelectProduct(p)}
                    />
                  ))}
                </div>
              )}

              {/* Load More Section */}
              {!loading && (activeCategory === 'Mods' || activeCategory === 'All' || activeCategory === 'Textures' || activeCategory === 'Add-Ons') && (
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

            {/* Most Popular Shelf */}
            {activeCategory === 'All' && popularProducts.length > 0 && (
              <section id="mc-popular-shelf" className="mc-panel p-4 sm:p-6 bg-[#212224]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#333]">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#f39c12]" />
                    <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                      ПОПУЛЯРНОЕ И В ТРЕНДЕ
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {popularProducts.slice(0, 4).map((prod) => (
                    <ProductCard
                      key={`pop-${prod.id}`}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      isOwned={ownedItemIds.includes(prod.id)}
                      onOpenVersionSelect={(p) => setVersionSelectProduct(p)}
                    />
                  ))}
                </div>
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
            <span>Форматы: .mcaddon, .mcworld, .mcpack</span>
            <span className="text-[#444]">|</span>
            <span>Хронологический каталог 2026 → 2017</span>
          </div>
        </div>
      </footer>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
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
          onSelectProduct={(p) => setSelectedProduct(p)}
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
        onSelectProduct={(p) => setSelectedProduct(p)}
        onRemoveFromWishlist={handleToggleWishlist}
        equippedSkin={equippedSkin}
        onEquipSkin={(skin) => setEquippedSkin(skin)}
      />

      {/* Login Modal with Google and Guest options */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
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
    </div>
  );
}

