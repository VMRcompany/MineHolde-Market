import React, { useState } from 'react';
import { X, Package, Heart, Trash2, Check, Sparkles, User, Download, Loader2 } from 'lucide-react';
import { ProductItem, SkinPreview } from '../types';
import { soundManager } from '../utils/audio';
import { downloadMinecraftProduct } from '../utils/fileDownloader';
import { useAuth } from '../context/AuthContext';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'locker' | 'wishlist';
  ownedItems: ProductItem[];
  wishlistItems: ProductItem[];
  onSelectProduct: (product: ProductItem) => void;
  onRemoveFromWishlist: (product: ProductItem) => void;
  equippedSkin: SkinPreview | null;
  onEquipSkin: (skin: SkinPreview) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'locker',
  ownedItems,
  wishlistItems,
  onSelectProduct,
  onRemoveFromWishlist,
  equippedSkin,
  onEquipSkin,
}) => {
  const { recordDownloadedPack } = useAuth();
  const [activeTab, setActiveTab] = useState<'locker' | 'wishlist'>(initialTab);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all owned skins
  const allOwnedSkins: { skin: SkinPreview; productTitle: string }[] = [];
  ownedItems.forEach((item) => {
    if (item.skins && item.skins.length > 0) {
      item.skins.forEach((s) => {
        allOwnedSkins.push({ skin: s, productTitle: item.title });
      });
    }
  });

  const handleDownloadFile = async (e: React.MouseEvent, item: ProductItem) => {
    e.stopPropagation();
    soundManager.playClick();
    setDownloadingId(item.id);
    try {
      await downloadMinecraftProduct(item);
      soundManager.playLevelUp();
      recordDownloadedPack({
        id: item.id,
        title: item.title,
        type: item.type,
      });
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        id="inventory-modal"
        className="mc-panel w-full max-w-4xl max-h-[88vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#1f2022] p-3 sm:p-4 border-b-2 border-[#121213] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#82d458]" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Мой инвентарь MineHolde
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray w-8 h-8 flex items-center justify-center font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="bg-[#18181a] px-4 py-2 border-b border-[#2e2e30] flex items-center gap-2">
          <button
            id="tab-locker"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('locker');
            }}
            className={`px-4 py-1.5 text-xs font-bold flex items-center gap-2 ${
              activeTab === 'locker' ? 'mc-button-green' : 'mc-button-gray'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Приобретённый контент ({ownedItems.length})</span>
          </button>
          <button
            id="tab-wishlist"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('wishlist');
            }}
            className={`px-4 py-1.5 text-xs font-bold flex items-center gap-2 ${
              activeTab === 'wishlist' ? 'mc-button-green' : 'mc-button-gray'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-[#ff6b6b]" />
            <span>Список желаемого ({wishlistItems.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#232426] space-y-6">
          {activeTab === 'locker' ? (
            <div className="space-y-6">
              {/* Active Equipped Skin Box */}
              <div className="mc-panel p-4 bg-[#1b1b1d] border-2 border-[#499e30] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-16 bg-[#121213] border border-[#3e3f42] flex items-center justify-center overflow-hidden">
                    {equippedSkin ? (
                      <img
                        src={equippedSkin.textureUrl}
                        alt={equippedSkin.name}
                        className="w-full h-full object-contain p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <User className="w-8 h-8 text-[#555]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-[#82d458] font-bold uppercase tracking-wider">
                      Текущий экипированный скин
                    </div>
                    <div className="text-base font-bold text-white">
                      {equippedSkin ? equippedSkin.name : 'Стандартный Стив (Classic)'}
                    </div>
                    <div className="text-xs text-[#8e8e93]">
                      Модель: {equippedSkin ? equippedSkin.model.toUpperCase() : 'STEVE'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[#82d458] font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Активен в клиенте Minecraft</span>
                </div>
              </div>

              {/* Owned Skins Fast Switcher */}
              {allOwnedSkins.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-white uppercase mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#ffd83d]" />
                    <span>Разблокированные скины ({allOwnedSkins.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {allOwnedSkins.map(({ skin }) => {
                      const isEquipped = equippedSkin?.id === skin.id;
                      return (
                        <div
                          key={skin.id}
                          className={`mc-panel-dark p-2 flex flex-col items-center gap-1.5 text-center border ${
                            isEquipped ? 'border-[#82d458] bg-[#293d20]' : 'border-[#333]'
                          }`}
                        >
                          <div className="w-12 h-14 bg-[#111] overflow-hidden flex items-center justify-center">
                            <img src={skin.textureUrl} alt={skin.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                          </div>
                          <div className="text-[11px] font-bold text-white truncate w-full">
                            {skin.name}
                          </div>
                          <button
                            onClick={() => {
                              soundManager.playClick();
                              onEquipSkin(skin);
                            }}
                            className={`w-full text-[10px] font-bold py-1 ${
                              isEquipped ? 'mc-button-gray text-[#82d458]' : 'mc-button-green'
                            }`}
                          >
                            {isEquipped ? 'Надето' : 'Надеть'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Owned Products Grid with direct install button */}
              <div>
                <h3 className="text-xs font-bold text-white uppercase mb-2">
                  Все приобретённые пакеты и миры ({ownedItems.length})
                </h3>
                {ownedItems.length === 0 ? (
                  <div className="text-center py-12 mc-panel-dark text-xs text-[#8e8e93]">
                    У вас пока нет купленных или полученных пакетов. Изучите каталог и заберите бесплатные подарки или скин-паки!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {ownedItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          soundManager.playClick();
                          onSelectProduct(item);
                          onClose();
                        }}
                        className="mc-card p-3 flex flex-col justify-between gap-2.5 cursor-pointer hover:border-[#82d458] transition-colors"
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-16 h-16 object-cover flex-shrink-0 border border-[#333]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{item.title}</div>
                            <div className="text-[11px] text-[#8e8e93] capitalize mt-0.5">
                              Автор: {item.creator.name}
                            </div>
                            <div className="text-[10px] text-[#82d458] font-mono mt-1">
                              {item.downloadSize}
                            </div>
                          </div>
                        </div>

                        {/* Direct Install / Download file button */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
                          <button
                            onClick={(e) => handleDownloadFile(e, item)}
                            disabled={downloadingId === item.id}
                            className="flex-1 mc-button-green text-xs py-1.5 font-bold flex items-center justify-center gap-1.5"
                          >
                            {downloadingId === item.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Установка...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Установить файл</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Wishlist Tab */
            <div>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-12 mc-panel-dark text-xs text-[#8e8e93]">
                  Список желаемого пуст. Нажмите на значок сердечка на любом товаре, чтобы сохранить его!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.id}
                      className="mc-card p-3 flex flex-col justify-between gap-2"
                    >
                      <div
                        onClick={() => {
                          soundManager.playClick();
                          onSelectProduct(item);
                          onClose();
                        }}
                        className="flex gap-3 cursor-pointer"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-16 h-16 object-cover flex-shrink-0 border border-[#333]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{item.title}</div>
                          <div className="text-[11px] text-[#8e8e93] capitalize mt-0.5">
                            {item.creator.name}
                          </div>
                          <div className="text-xs font-bold text-[#ffe066] mt-1 font-mono">
                            {item.price === 0 ? 'БЕСПЛАТНО' : `${item.price.toLocaleString()} MineHolde coins`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onSelectProduct(item);
                            onClose();
                          }}
                          className="flex-1 mc-button-green text-xs py-1 font-bold"
                        >
                          Подробнее
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onRemoveFromWishlist(item);
                          }}
                          className="mc-button-gray p-1 text-[#ff6b6b]"
                          title="Удалить из списка"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
