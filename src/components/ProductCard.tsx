import React, { useState } from 'react';
import { Star, Heart, Check, Sparkles, Download, Share2 } from 'lucide-react';
import { ProductItem } from '../types';
import { soundManager } from '../utils/audio';
import { VERIFIED_BEDROCK_IMAGES, getMinecraftSvgFallback } from '../utils/imageFallback';
import { detectProductEdition } from '../utils/editionDetector';

interface ProductCardProps {
  product: ProductItem;
  onSelect: (product: ProductItem) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: ProductItem) => void;
  isOwned: boolean;
  onOpenVersionSelect?: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  isWishlisted,
  onToggleWishlist,
  isOwned,
  onOpenVersionSelect,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const edition = product.edition || detectProductEdition(product);
  const isJava = edition === 'java';
  const editionLabel = isJava ? 'Java Edition' : 'Bedrock Edition';

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();

    const isSkin =
      product.type === 'skinpack' ||
      product.type === 'persona' ||
      (product.type as string) === 'skin_pack' ||
      product.category === 'Skins' ||
      (product.category && product.category.toLowerCase().includes('skin'));

    const section = isSkin ? 'skins' : 'mods';
    const cleanUrl = `https://market.mineholde.pro/${section}/${product.id}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = cleanUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== product.bannerUrl && product.bannerUrl && !target.src.startsWith('data:image/svg')) {
              target.src = product.bannerUrl;
            } else if (!target.src.startsWith('data:image/svg')) {
              target.src = getMinecraftSvgFallback(product.title, product.category);
            }
          }}
        />

        {/* Sale / Free / MineHolde Free Pill */}
        {product.isSale && product.discountPercent ? (
          <div className="absolute top-2 left-2 bg-[#d93829] border border-[#ff6b6b] text-white text-[11px] font-bold px-2 py-0.5 shadow-md flex items-center gap-1 uppercase tracking-wider">
            <span>-{product.discountPercent}% В MINECRAFT</span>
          </div>
        ) : (
          <div className="absolute top-2 left-2 bg-[#235317] border border-[#54aa32] text-[#a4f576] text-[10px] font-bold px-2 py-0.5 shadow-md flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#ffd83d]" />
            <span>БЕСПЛАТНО В MINEHOLDE</span>
          </div>
        )}

        {/* Owned Status Tag */}
        {isOwned && (
          <div className="absolute bottom-2 left-2 bg-[#1b4311] border border-[#499e30] text-[#a4f576] text-[10px] font-bold px-1.5 py-0.5 shadow-md flex items-center gap-1">
            <Check className="w-3 h-3 text-[#82d458]" />
            <span>ДОБАВЛЕНО</span>
          </div>
        )}

        {/* Top-Right Action Buttons: Share & Wishlist */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {/* Share Button */}
          <button
            id={`share-card-btn-${product.id}`}
            onClick={handleShare}
            className={`w-7 h-7 flex items-center justify-center border transition-colors shadow-sm ${
              copiedLink
                ? 'bg-[#275c1c] border-[#4ea92f] text-white'
                : 'bg-[#18181a]/80 border-[#38383a] text-[#a0a0a5] hover:text-white hover:border-[#82d458]'
            }`}
            title={copiedLink ? 'Ссылка скопирована!' : 'Поделиться ссылкой'}
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-[#82d458]" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Wishlist Button */}
          <button
            id={`wishlist-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onToggleWishlist(product);
            }}
            className={`w-7 h-7 flex items-center justify-center border transition-colors shadow-sm ${
              isWishlisted
                ? 'bg-[#d93829] border-[#ff6b6b] text-white'
                : 'bg-[#18181a]/80 border-[#38383a] text-[#a0a0a5] hover:text-white hover:border-[#82d458]'
            }`}
            title={isWishlisted ? 'Удалить из списка желаемого' : 'Добавить в список желаемого'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white text-white' : ''}`} />
          </button>
        </div>

        {/* Edition & Type Badges */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div
            className={`text-[10px] px-1.5 py-0.5 border font-mono font-bold shadow-sm ${
              isJava
                ? 'bg-[#451616]/95 text-[#fca5a5] border-[#b91c1c]'
                : 'bg-[#183a12]/95 text-[#86efac] border-[#22c55e]/50'
            }`}
          >
            {editionLabel}
          </div>
          <div className="bg-[#121213]/90 text-[#b5b5ba] text-[10px] px-1.5 py-0.5 border border-[#2d2d30] font-mono">
            {getTypeRussian(product.type)}
          </div>
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
              onError={(e) => {
                e.currentTarget.src = 'https://mc-heads.net/avatar/Steve/64';
              }}
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

          {/* Price: Completely removed minecoin, showing clean free indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-[#82d458] tracking-wide uppercase">Бесплатно</span>
          </div>
        </div>

        {/* Download & Version Selection Action Button */}
        <button
          id={`download-card-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            soundManager.playClick();
            if (onOpenVersionSelect) {
              onOpenVersionSelect(product);
            } else {
              onSelect(product);
            }
          }}
          className="w-full mt-1.5 py-1.5 px-2 bg-[#275c1c] hover:bg-[#347824] border border-[#4ea92f] text-[#c6f7a6] hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm active:translate-y-0.5"
          title="Выбрать версию и скачать"
        >
          <Download className="w-3.5 h-3.5 text-[#82d458]" />
          <span>Скачать • Версии</span>
        </button>
      </div>
    </div>
  );
};
