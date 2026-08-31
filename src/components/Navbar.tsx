import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  Package,
  Heart,
  Plus,
  Sparkles,
  Layers,
  Globe,
  Tag,
  Gift,
  Users,
  AlertCircle,
  LogIn,
  User as UserIcon,
} from 'lucide-react';
import { marketplaceApi } from '../services/marketplaceApi';
import { AutoSuggestItem } from '../types';
import { soundManager } from '../utils/audio';
import { MinecoinBadge } from './MinecoinBadge';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  minecoins: number;
  onAddMinecoins: (amount: number) => void;
  onOpenInventory: () => void;
  onOpenWishlist: () => void;
  onSelectProduct: (productId: string) => void;
  onSelectCategory: (category: string) => void;
  onOpenLogin: () => void;
  onOpenAccount: () => void;
  activeCategory: string;
  wishlistCount: number;
  inventoryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  minecoins,
  onOpenInventory,
  onOpenWishlist,
  onSelectProduct,
  onSelectCategory,
  onOpenLogin,
  onOpenAccount,
  activeCategory,
  wishlistCount,
  inventoryCount,
}) => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<AutoSuggestItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [showAddCoinsModal, setShowAddCoinsModal] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced auto-suggest calling /bin/minecraft/productmanagement.autosuggest.json
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        setIsSearching(true);
        try {
          const results = await marketplaceApi.getAutoSuggest(searchTerm);
          setSuggestions(results);
          setShowDropdown(true);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close autosuggest
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSoundToggle = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) soundManager.playClick();
  };

  const navCategories = [
    { label: 'Все', value: 'All', icon: Sparkles },
    { label: 'Скин-паки', value: 'Skin Packs', icon: Layers },
    { label: 'Миры', value: 'Worlds', icon: Globe },
    { label: 'Дополнения', value: 'Add-Ons', icon: Package },
    { label: 'Скидки', value: 'Sales & Deals', icon: Tag },
    { label: 'Бесплатно', value: 'Free Gifts', icon: Gift },
    { label: 'Создатели', value: 'Creators', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#242426] border-b-4 border-[#121213] shadow-xl">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo: MineHolde Market with Minecraft Marketplace Subtitle */}
        <div
          id="mc-logo-container"
          onClick={() => {
            soundManager.playClick();
            onSelectCategory('All');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {/* Minecraft Block Icon */}
          <div className="w-10 h-10 bg-[#5b8731] border-2 border-[#81bc43] border-b-[#324f18] border-r-[#324f18] relative shadow-md flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-5 h-5 bg-[#875529] border border-[#523317]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-wider text-white drop-shadow-[0_2px_0_#111]">
                MineHolde Market
              </span>
            </div>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <span className="bg-[#499e30] text-white text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.2 border border-[#6cb546] shadow-sm">
                Minecraft Marketplace
              </span>
              <span className="text-[10px] text-[#9a9a9e] tracking-tight hidden md:inline">
                • Каталог контента Bedrock
              </span>
            </div>
          </div>
        </div>

        {/* Live Search Input */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md min-w-[220px]">
          <div className="relative flex items-center">
            <input
              id="mc-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Поиск скинов, миров, текстур, дополнений..."
              className="w-full mc-input py-2 pl-9 pr-8 text-sm placeholder:text-[#6e6e73] font-medium"
            />
            <Search className="w-4 h-4 text-[#8a8a8f] absolute left-3 pointer-events-none" />
            {isSearching && (
              <div className="absolute right-3 w-3.5 h-3.5 border-2 border-[#499e30] border-t-transparent animate-spin" />
            )}
          </div>

          {/* Autosuggest Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div
              id="mc-autosuggest-dropdown"
              className="absolute left-0 right-0 top-full mt-1 mc-panel-dark shadow-2xl z-50 max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-1.5 bg-[#121213] border-b border-[#2d2d30] text-[11px] text-[#8e8e93] uppercase flex justify-between">
                <span>Подсказки ({suggestions.length})</span>
              </div>
              <div className="divide-y divide-[#262628]">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    id={`autosuggest-item-${item.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectProduct(item.id);
                      setShowDropdown(false);
                      setSearchTerm('');
                    }}
                    className="p-2.5 flex items-center gap-3 hover:bg-[#2e2f33] cursor-pointer transition-colors"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-10 h-10 object-cover border border-[#3e3f42] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.title}</div>
                      <div className="text-xs text-[#9a9a9e] flex items-center gap-2">
                        <span>Автор: {item.creator}</span>
                        <span className="text-[#555]">•</span>
                        <span className="capitalize text-[#82d458]">{item.type}</span>
                      </div>
                    </div>
                    <MinecoinBadge amount={item.price} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* MineHolde Coins Balance Counter */}
          <div
            id="mc-navbar-coins"
            onClick={() => {
              soundManager.playClick();
              setShowAddCoinsModal(true);
            }}
            className="mc-panel px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[#343538] transition-colors"
            title="MineHolde coins — Нажмите для информации о монетах"
          >
            <div className="w-4 h-4 bg-[#f4b810] border border-[#a16f03] flex items-center justify-center">
              <div className="w-1 h-1 bg-[#5b3c00]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[#ffe066] font-bold text-sm leading-tight drop-shadow-[0_1px_0_#333]">
                {minecoins.toLocaleString()}
              </span>
              <span className="text-[9px] text-[#cca825] uppercase tracking-tighter leading-none hidden sm:block">
                MineHolde coins
              </span>
            </div>
            <button
              id="mc-add-coins-btn"
              className="w-4 h-4 bg-[#3c8527] text-white flex items-center justify-center text-xs font-bold hover:bg-[#499e30]"
              title="Пополнить MineHolde coins"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Wishlist Button */}
          <button
            id="mc-wishlist-nav-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenWishlist();
            }}
            className="mc-button-gray p-2 relative flex items-center gap-1"
            title="Список желаемого"
          >
            <Heart className="w-4 h-4 text-[#ff5c5c]" />
            <span className="hidden lg:inline text-xs font-bold text-white">Желаемое</span>
            {wishlistCount > 0 && (
              <span className="bg-[#e03131] text-white text-[10px] font-bold px-1.5 border border-[#ff8787]">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Inventory / Owned Items Button */}
          <button
            id="mc-inventory-nav-btn"
            onClick={() => {
              soundManager.playChest();
              onOpenInventory();
            }}
            className="mc-button-gray p-2 relative flex items-center gap-1.5"
            title="Мой инвентарь и установленные паки"
          >
            <Package className="w-4 h-4 text-[#82d458]" />
            <span className="hidden md:inline text-xs font-bold text-white">Инвентарь</span>
            {inventoryCount > 0 && (
              <span className="bg-[#3c8527] text-white text-[10px] font-bold px-1 border border-[#6cb546]">
                {inventoryCount}
              </span>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            id="mc-sound-toggle-btn"
            onClick={handleSoundToggle}
            className="mc-button-gray p-2 text-[#aaa]"
            title={isMuted ? 'Включить звуковые эффекты' : 'Выключить звуки'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#e05656]" /> : <Volume2 className="w-4 h-4 text-[#82d458]" />}
          </button>

          {/* User Account / Login Button */}
          {user ? (
            <button
              id="mc-user-account-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenAccount();
              }}
              className="flex items-center gap-2 bg-[#2c2d30] hover:bg-[#38393d] border-2 border-[#82d458] px-2 py-1 transition-all group shadow-md"
              title="Аккаунт MineHolde — нажмите для просмотра профиля"
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName || 'Профиль'}
                  className="w-6 h-6 rounded-full border border-[#82d458] object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#3c8527] text-white flex items-center justify-center text-xs font-bold border border-[#82d458]">
                  {profile?.firstName ? profile.firstName.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
              <div className="flex flex-col text-left hidden sm:block">
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                  {profile?.firstName || 'Аккаунт'}
                </span>
                <span className="text-[9px] text-[#a4f576] leading-none uppercase">
                  MineHolde
                </span>
              </div>
            </button>
          ) : (
            <button
              id="mc-navbar-login-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenLogin();
              }}
              className="mc-button-green px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
              title="Войти в аккаунт MineHolde"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Войти</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Categories Strip */}
      <div className="bg-[#1a1a1c] border-t border-[#313133] overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 py-1.5 min-w-max">
          {navCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                id={`nav-cat-${cat.value.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => {
                  soundManager.playClick();
                  onSelectCategory(cat.value);
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#3c8527] text-white border-t-2 border-[#82d458] border-b-2 border-[#1e4513] shadow-sm'
                    : 'text-[#a6a6ab] hover:text-white hover:bg-[#2c2d30] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#777]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add MineHolde coins Modal with Gray "Недоступно" buttons */}
      {showAddCoinsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="mc-panel p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#3e3f42] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#f4b810] border border-[#a16f03] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#5b3c00]" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase">MineHolde coins</h3>
              </div>
              <button
                id="close-add-coins-modal-btn"
                onClick={() => setShowAddCoinsModal(false)}
                className="mc-button-gray px-2 py-0.5 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Notice that obtaining coins is currently unavailable */}
            <div className="mb-4 p-3 bg-[#241a1a] border-2 border-[#7a2828] flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#e6b8b8]">
                <div className="font-bold text-[#ff8787] mb-0.5">Получение монет ограничено</div>
                В данный момент получение и покупка MineHolde coins временно недоступны.
              </div>
            </div>

            <p className="text-xs text-[#a0a0a5] mb-4">
              MineHolde coins используются для разблокировки эксклюзивных скинов, текстур, карт и дополнений в магазине MineHolde Market.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { coins: 320, bonus: '', color: 'border-[#444]' },
                { coins: 1020, bonus: '+60 Бонус', color: 'border-[#444]' },
                { coins: 1720, bonus: '+120 Бонус', color: 'border-[#444]' },
                { coins: 3500, bonus: '+300 Бонус', color: 'border-[#444]' },
              ].map((pack) => (
                <div
                  key={pack.coins}
                  id={`buy-coins-${pack.coins}`}
                  className={`mc-panel-dark p-3 text-center border-2 ${pack.color} opacity-80`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-4 h-4 bg-[#f4b810] border border-[#a16f03] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-[#5b3c00]" />
                    </div>
                    <span className="text-base font-bold text-[#ffe066] font-mono">
                      {pack.coins.toLocaleString()}
                    </span>
                  </div>
                  {pack.bonus && (
                    <div className="text-[10px] text-[#8e8e93] font-bold uppercase">{pack.bonus}</div>
                  )}
                  {/* Gray button saying "Недоступно" */}
                  <button
                    disabled
                    className="w-full mt-2 mc-button-gray opacity-60 cursor-not-allowed text-xs py-1 font-bold text-[#a0a0a5]"
                  >
                    Недоступно
                  </button>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                id="cancel-add-coins-btn"
                onClick={() => setShowAddCoinsModal(false)}
                className="mc-button-gray px-6 py-2 text-xs font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
