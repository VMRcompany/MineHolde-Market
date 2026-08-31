import React from 'react';
import { Star, Heart, Check, Sparkles } from 'lucide-react';
import { ProductItem } from '../types';
import { MinecoinBadge } from './MinecoinBadge';
import { soundManager } from '../utils/audio';

interface ProductCardProps {
  product: ProductItem;
  onSelect: (product: ProductItem) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: ProductItem) => void;
  isOwned: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  isWishlisted,
  onToggleWishlist,
  isOwned,
}) => {
  const currentPrice = product.isSale && product.salePrice !== undefined ? product.salePrice : product.price;

  const getTypeRussian = (type: string) => {
    switch (type) {
      case 'skin_pack':
        return 'Скин-пак';
      case 'world':
        return 'Мир';
      case 'addon':
        return 'Дополнение';
      case 'texture_pack':
        return 'Текстуры';
      case 'mashup':
        return 'Машап';
      default:
        return type;
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => {
        soundManager.playClick();
        onSelect(product);
      }}
      className="mc-card flex flex-col group cursor-pointer relative overflow-hidden transition-all duration-200"
    >
      {/* Top badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#18181a]">
        <img
          src={product.thumbnailUrl}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Sale / Free / MineHolde Free Pill */}
        {product.isSale && product.discountPercent ? (
          <div className="absolute top-2 left-2 bg-[#d93829] border border-[#ff6b6b] text-white text-[11px] font-bold px-2 py-0.5 shadow-md flex items-center gap-1 uppercase tracking-wider">
            <span>-{product.discountPercent}% В MINECRAFT</span>
          </div>
        ) : (
          <div className="absolute top-2 left-2 bg-[#235317] border border-[#54aa32] text-[#a4f576] text-[10px] font-bold px-2 py-0.5 shadow-md flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#ffd83d]" />
            <span>0 МОНЕТ В MINEHOLDE</span>
          </div>
        )}

        {/* Owned Status Tag */}
        {isOwned && (
          <div className="absolute bottom-2 left-2 bg-[#1b4311] border border-[#499e30] text-[#a4f576] text-[10px] font-bold px-1.5 py-0.5 shadow-md flex items-center gap-1">
            <Check className="w-3 h-3 text-[#82d458]" />
            <span>ДОБАВЛЕНО</span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          id={`wishlist-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            soundManager.playClick();
            onToggleWishlist(product);
          }}
          className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center border transition-colors shadow-sm ${
            isWishlisted
              ? 'bg-[#d93829] border-[#ff6b6b] text-white'
              : 'bg-[#18181a]/80 border-[#38383a] text-[#a0a0a5] hover:text-white hover:border-[#82d458]'
          }`}
          title={isWishlisted ? 'Удалить из списка желаемого' : 'Добавить в список желаемого'}
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white text-white' : ''}`} />
        </button>

        {/* Type Badge */}
        <div className="absolute bottom-2 right-2 bg-[#121213]/90 text-[#b5b5ba] text-[10px] px-1.5 py-0.5 border border-[#2d2d30] font-mono">
          {getTypeRussian(product.type)}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Creator Details */}
          <div className="flex items-center gap-1.5 mb-1">
            <img
              src={product.creator.avatarUrl}
              alt={product.creator.name}
              className="w-4 h-4 rounded-none border border-[#444]"
            />
            <span className="text-[11px] text-[#9a9a9f] hover:text-white truncate">
              {product.creator.name}
            </span>
            {product.creator.verified && (
              <span className="text-[#3c8527] text-xs font-bold" title="Проверенный автор">
                ✓
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#82d458] transition-colors">
            {product.title}
          </h3>

          {/* Short description */}
          <p className="text-[11px] text-[#8e8e93] line-clamp-2 mt-1 leading-snug">
            {product.shortDescription}
          </p>
        </div>

        {/* Bottom Bar: Rating & Price */}
        <div className="pt-2 border-t border-[#313133] flex items-center justify-between gap-2 mt-auto">
          {/* Rating */}
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 text-[#ffd83d] fill-[#ffd83d]" />
            <span className="font-bold text-[#e0e0e0]">{product.rating.toFixed(1)}</span>
            <span className="text-[10px] text-[#777]">
              ({(product.ratingsCount / 1000).toFixed(1)}k)
            </span>
          </div>

          {/* Price */}
          <MinecoinBadge
            amount={currentPrice}
            size="sm"
            isSale={product.isSale}
            originalAmount={product.isSale ? product.price : undefined}
          />
        </div>
      </div>
    </div>
  );
};
