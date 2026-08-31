/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { marketplaceApi } from './services/marketplaceApi';
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
import { LoginModal } from './components/LoginModal';
import { AccountModal } from './components/AccountModal';
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

  // Marketplace Content Data State (All items loaded directly)
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [popularProducts, setPopularProducts] = useState<ProductItem[]>([]);
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);

  // Active Filters & State - default strict chronological (newest first)
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

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

  // Fetch all products iteratively and exhaustively from Marketplace API with strict chronological ordering
  const fetchAllProducts = useCallback(
    async (category: string, sort: string) => {
      setLoading(true);

      try {
        const result = await marketplaceApi.fetchAllProductsExhaustively({
          type: 'all',
          category: category === 'All' ? undefined : category,
          sort,
          order: sort === 'oldest' ? 'asc' : 'desc',
          batchSize: 50,
          onBatchLoaded: (currentItems, totalExpected) => {
            setProducts(currentItems);
            setTotalCount(totalExpected);
          },
        });

        setProducts(result.products || []);
        setTotalCount(result.totalCount || (result.products || []).length);
      } catch (err) {
        console.error('Failed to fetch products from Marketplace API', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger load whenever category or sort changes
  useEffect(() => {
    fetchAllProducts(activeCategory, sortBy);
  }, [activeCategory, sortBy, fetchAllProducts]);

  // Handle Product Selection
  const handleSelectProductById = async (id: string) => {
    try {
      const details = await marketplaceApi.getProductDetails(id);
      if (details) {
        setSelectedProduct(details);
      }
    } catch {
      const found = products.find((p) => p.id === id);
      if (found) setSelectedProduct(found);
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
        onSelectProduct={handleSelectProductById}
        onSelectCategory={(cat) => {
          if (cat === 'Creators') {
            setSelectedCreatorId('noxcrew');
          } else {
            setActiveCategory(cat);
          }
        }}
        activeCategory={activeCategory}
        wishlistCount={wishlistIds.length}
        inventoryCount={ownedItemIds.length}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Banner Carousel */}
        <BannerCarousel
          campaigns={campaigns}
          onSelectPromotion={(promo) => {
            if (promo.targetCategory) {
              setActiveCategory(promo.targetCategory);
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
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
              }}
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
                Загрузка каталога Minecraft Marketplace...
              </span>
              <span className="text-xs text-[#8e8e93]">
                Синхронизация миров, скин-паков, текстур и аддонов
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
                  onSelect={(p) => setSelectedProduct(p)}
                  isWishlisted={wishlistIds.includes(prod.id)}
                  onToggleWishlist={handleToggleWishlist}
                  isOwned={ownedItemIds.includes(prod.id)}
                />
              ))}
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
                />
              ))}
            </div>
          </section>
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
              <div>Minecraft Marketplace • Прямой API-поток Bedrock Edition</div>
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
    </div>
  );
}

