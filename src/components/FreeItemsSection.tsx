import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, Download, Check } from 'lucide-react';
import { marketplaceApi } from '../services/marketplaceApi';
import { ProductItem } from '../types';
import { soundManager } from '../utils/audio';

interface FreeItemsSectionProps {
  onSelectProduct: (product: ProductItem) => void;
  ownedIds: string[];
}

export const FreeItemsSection: React.FC<FreeItemsSectionProps> = ({
  onSelectProduct,
  ownedIds,
}) => {
  const [freeItems, setFreeItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi
      .getFreeProducts()
      .then((items) => setFreeItems(items))
      .catch(() => setFreeItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && freeItems.length === 0) return null;

  return (
    <div id="mc-free-section" className="mc-panel p-4 sm:p-6 mb-8 bg-[#1a2918] border-2 border-[#3c8527]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#2d521f]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#3c8527] text-white">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
                БЕСПЛАТНЫЕ ПОДАРКИ, КАРТЫ И СКИНЫ
              </h2>
              <span className="bg-[#3c8527] text-white text-[10px] uppercase font-bold px-2 py-0.5 border border-[#6cb546]">
                0 МОНЕТ
              </span>
            </div>
            <p className="text-xs text-[#a3c997]">
              Забирайте праздничные карты, игры и скины для персонажей в свой инвентарь
            </p>
          </div>
        </div>

        <div className="text-xs text-[#82d458] font-bold bg-[#142412] px-3 py-1 border border-[#2b4d1d]">
          100% БЕСПЛАТНО
        </div>
      </div>

      {/* Free Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {freeItems.map((item) => {
          const isOwned = ownedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => {
                soundManager.playClick();
                onSelectProduct(item);
              }}
              className="mc-card p-3.5 flex flex-col justify-between group cursor-pointer hover:border-[#82d458] transition-all bg-[#141f12]"
            >
              <div>
                <div className="relative aspect-video overflow-hidden mb-2.5 bg-[#111]">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-2 left-2 bg-[#2e6d1c] text-[#9df266] text-[10px] font-bold px-2 py-0.5 border border-[#54aa32] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#9df266]" />
                    <span>БЕСПЛАТНО</span>
                  </div>
                  {isOwned && (
                    <div className="absolute bottom-2 left-2 bg-[#1b4311] text-[#82d458] text-[9px] font-bold px-1.5 py-0.5 border border-[#499e30] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>ПОЛУЧЕНО</span>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-[#82d458] truncate">
                  {item.title}
                </h3>
                <p className="text-xs text-[#8e8e93] line-clamp-2 mt-1">
                  {item.shortDescription}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-[#294220] flex items-center justify-between">
                <span className="text-xs text-[#9a9a9e]">Автор: {item.creator.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    onSelectProduct(item);
                  }}
                  className="mc-button-green px-3 py-1 text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isOwned ? 'Открыть' : 'Забрать'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
