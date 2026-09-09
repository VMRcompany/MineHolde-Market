import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw } from 'lucide-react';
import { marketplaceApi } from '../services/marketplaceApi';
import { ProductItem } from '../types';
import { ProductCard } from './ProductCard';
import { VersionSelectModal } from './VersionSelectModal';
import { soundManager } from '../utils/audio';

interface CreatorFilterModalProps {
  creatorId: string | null;
  onClose: () => void;
  onSelectProduct: (product: ProductItem) => void;
  wishlistIds: string[];
  onToggleWishlist: (product: ProductItem) => void;
  ownedIds: string[];
}

export const CreatorFilterModal: React.FC<CreatorFilterModalProps> = ({
  creatorId,
  onClose,
  onSelectProduct,
  wishlistIds,
  onToggleWishlist,
  ownedIds,
}) => {
  const [creator, setCreator] = useState<any>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionSelectProduct, setVersionSelectProduct] = useState<ProductItem | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    setLoading(true);
    marketplaceApi
      .getProductsByCreator(creatorId, 50, 0, 'newest')
      .then((res) => {
        setCreator(res.creator);
        setProducts(res.products);
      })
      .catch(() => {
        setCreator(null);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [creatorId]);

  if (!creatorId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        id="creator-filter-modal"
        className="mc-panel w-full max-w-5xl max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header with Creator banner */}
        <div className="bg-[#1e1f21] p-4 sm:p-6 border-b-2 border-[#121213] relative">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 mc-button-gray w-8 h-8 flex items-center justify-center font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>

          {creator && (
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={creator.avatarUrl}
                alt={creator.name}
                className="w-16 h-16 rounded-none border-2 border-[#82d458] shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                    {creator.name}
                  </h2>
                  {creator.verified && (
                    <span className="bg-[#3c8527] text-white text-xs px-2 py-0.5 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Официальный партнёр</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#a0a0a5] mt-1">
                  Официальный разработчик Minecraft Bedrock • {products.length} релизов в каталоге
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#232426]">
          {loading ? (
            <div className="text-center py-16 text-xs text-[#8e8e93] flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#82d458]" />
              <span>Загрузка каталога автора...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 mc-panel-dark text-xs text-[#8e8e93]">
              Товары данного автора не найдены.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onSelect={(p) => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  isWishlisted={wishlistIds.includes(prod.id)}
                  onToggleWishlist={onToggleWishlist}
                  isOwned={ownedIds.includes(prod.id)}
                  onOpenVersionSelect={(p) => setVersionSelectProduct(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Version Selection Modal */}
      <VersionSelectModal
        product={versionSelectProduct}
        isOpen={!!versionSelectProduct}
        onClose={() => setVersionSelectProduct(null)}
      />
    </div>
  );
};
