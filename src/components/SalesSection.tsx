import React, { useState, useEffect } from 'react';
import { Tag, Clock } from 'lucide-react';
import { marketplaceApi } from '../services/marketplaceApi';
import { SaleProductDetail, ProductItem } from '../types';
import { MinecoinBadge } from './MinecoinBadge';
import { soundManager } from '../utils/audio';

interface SalesSectionProps {
  onSelectProduct: (product: ProductItem) => void;
  saleProductIds: string[];
}

export const SalesSection: React.FC<SalesSectionProps> = ({
  onSelectProduct,
  saleProductIds,
}) => {
  const [sales, setSales] = useState<SaleProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (saleProductIds.length === 0) return;
    marketplaceApi
      .getSaleProducts(saleProductIds)
      .then((data) => setSales(data))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [saleProductIds]);

  if (!loading && sales.length === 0) return null;

  return (
    <div id="mc-sales-section" className="mc-panel p-4 sm:p-6 mb-8 bg-[#251f1f] border-2 border-[#662222]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#442222]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#d93829] text-white">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
                СКИДКИ И АКЦИИ MARKETPLACE
              </h2>
              <span className="bg-[#d93829] text-white text-[10px] uppercase font-bold px-2 py-0.5 border border-[#ff8787]">
                СКИДКИ ДО 50%
              </span>
            </div>
            <p className="text-xs text-[#b89f9f]">
              Специальные предложения на скины, миры и дополнения ограниченное время
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#ffc9c9] bg-[#3a1818] px-3 py-1.5 border border-[#5c2424] font-mono">
          <Clock className="w-3.5 h-3.5 text-[#ff8787]" />
          <span>До конца акции: 4д 14ч 22м</span>
        </div>
      </div>

      {/* Sale Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sales.map((sale: any) => (
          <div
            key={sale.id}
            onClick={() => {
              soundManager.playClick();
              if (sale.product) onSelectProduct(sale.product);
            }}
            className="mc-card p-3 flex flex-col justify-between group cursor-pointer hover:border-[#ff6b6b] transition-all bg-[#1c1717]"
          >
            <div>
              <div className="relative aspect-video overflow-hidden mb-2 bg-[#111]">
                <img
                  src={sale.bannerUrl}
                  alt={sale.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 left-2 bg-[#d93829] text-white text-[10px] font-bold px-1.5 py-0.5 border border-[#ff8787]">
                  -{sale.discountPercent}%
                </div>
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-[#ff8787] truncate">
                {sale.title}
              </h3>
            </div>

            <div className="mt-3 pt-2 border-t border-[#3a2525] flex items-center justify-between">
              <span className="text-[10px] text-[#ff8787] font-bold">
                В игре: ~{(sale.originalPrice || 830).toLocaleString()}~
              </span>
              <div className="px-2 py-0.5 bg-[#285e1b] border border-[#54aa32] text-[#a4f576] text-[10px] font-bold uppercase">
                БЕСПЛАТНО
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
