import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Heart,
  Share2,
  Calendar,
  HardDrive,
  Cpu,
  Package,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { ProductItem, SkinPreview } from '../types';
import { MinecoinBadge } from './MinecoinBadge';
import { soundManager } from '../utils/audio';
import { downloadMinecraftProduct } from '../utils/fileDownloader';
import { useAuth } from '../context/AuthContext';
import { VERIFIED_BEDROCK_IMAGES, getMinecraftSvgFallback } from '../utils/imageFallback';

interface ProductModalProps {
  product: ProductItem | null;
  onClose: () => void;
  minecoins: number;
  isOwned: boolean;
  isWishlisted: boolean;
  onPurchase: (product: ProductItem) => void;
  onToggleWishlist: (product: ProductItem) => void;
  onSelectCreator: (creatorId: string) => void;
  onEquipSkin?: (skin: SkinPreview) => void;
  equippedSkinId?: string | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  minecoins,
  isOwned,
  isWishlisted,
  onPurchase,
  onToggleWishlist,
  onSelectCreator,
  onEquipSkin,
  equippedSkinId,
}) => {
  const { recordDownloadedPack } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSkin, setSelectedSkin] = useState<SkinPreview | null>(
    product?.skins && product.skins.length > 0 ? product.skins[0] : null
  );
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Reset active image index whenever product changes
  useEffect(() => {
    setActiveImageIndex(0);
    if (product?.skins && product.skins.length > 0) {
      setSelectedSkin(product.skins[0]);
    }
  }, [product?.id]);

  if (!product) return null;

  const currentPrice = product.isSale && product.salePrice !== undefined ? product.salePrice : product.price;
  const canAfford = minecoins >= currentPrice || isOwned || product.isFree;

  // Simple and clean gallery list from product data
  const galleryImages = [
    product.bannerUrl,
    product.thumbnailUrl,
    ...(product.screenshots || []),
  ].filter((url, idx, arr): url is string => Boolean(url) && arr.indexOf(url) === idx);

  const activeImage = galleryImages[activeImageIndex] || product.thumbnailUrl || product.bannerUrl;

  // Keyboard navigation for image carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryImages.length]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    setActiveImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
  };

  const handleCopyUuid = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(product.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleShare = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInstall = async () => {
    if (isInstalling) return;
    soundManager.playClick();
    setIsInstalling(true);
    setInstallSuccess(false);

    try {
      // Trigger actual real file generation and download using JSZip
      await downloadMinecraftProduct(product);
      soundManager.playLevelUp();
      setInstallSuccess(true);
      recordDownloadedPack({
        id: product.id,
        title: product.title,
        type: product.type,
      });
      setTimeout(() => setInstallSuccess(false), 5000);
    } catch (err) {
      console.error('Download installation error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const getTypeRussianLabel = (type: string) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div
        id="product-details-modal"
        className="mc-panel w-full max-w-4xl max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-[#1f2022] p-3 sm:p-4 border-b-2 border-[#121213] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-[#3c8527] text-white text-[10px] uppercase font-bold px-2 py-0.5 border border-[#6cb546] hidden sm:inline">
              {getTypeRussianLabel(product.type)}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white truncate drop-shadow-[0_1px_0_#111]">
              {product.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="share-product-btn"
              onClick={handleShare}
              className="mc-button-gray px-2 py-1 text-xs flex items-center gap-1"
              title="Поделиться ссылкой"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#82d458]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Скопировано' : 'Поделиться'}</span>
            </button>
            <button
              id="close-product-modal-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="mc-button-gray w-8 h-8 flex items-center justify-center font-bold text-sm"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Showcase Section (Screenshots & Purchase Bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Media gallery */}
            <div className="lg:col-span-7 space-y-3">
              {/* Primary Active Image Preview */}
              <div className="aspect-video w-full mc-panel-dark overflow-hidden relative group bg-[#111112] border-2 border-[#333]">
                <img
                  src={activeImage}
                  alt={product.title}
                  className="w-full h-full object-cover select-none transition-all duration-200"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== product.thumbnailUrl && product.thumbnailUrl && !target.src.startsWith('data:image/svg')) {
                      target.src = product.thumbnailUrl;
                    } else if (target.src !== product.bannerUrl && product.bannerUrl && !target.src.startsWith('data:image/svg')) {
                      target.src = product.bannerUrl;
                    } else if (!target.src.startsWith('data:image/svg')) {
                      target.src = getMinecraftSvgFallback(product.title, product.category);
                    }
                  }}
                />

                {/* Sale Discount Tag */}
                {product.isSale && product.discountPercent && (
                  <div className="absolute top-3 left-3 z-10 bg-[#d93829] border border-[#ff6b6b] text-white text-[11px] font-bold px-2 py-0.5 shadow-lg uppercase tracking-wider">
                    СКИДКА -{product.discountPercent}%
                  </div>
                )}

                {/* Counter Badge */}
                {galleryImages.length > 1 && (
                  <div className="absolute top-3 right-3 z-10 bg-[#121213]/90 border border-[#444] text-[#ddd] text-xs font-mono font-bold px-2.5 py-1 shadow-md">
                    {activeImageIndex + 1} / {galleryImages.length}
                  </div>
                )}

                {/* Left / Right Carousel Navigation Overlays */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      id="gallery-prev-btn"
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/75 hover:bg-black/95 text-white border border-[#555] hover:border-[#82d458] flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shadow-xl cursor-pointer"
                      title="Предыдущее изображение (←)"
                      aria-label="Предыдущее изображение"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      id="gallery-next-btn"
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/75 hover:bg-black/95 text-white border border-[#555] hover:border-[#82d458] flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shadow-xl cursor-pointer"
                      title="Следующее изображение (→)"
                      aria-label="Следующее изображение"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails list */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((imgUrl, idx) => {
                    const isActive = activeImageIndex === idx;
                    return (
                      <button
                        key={idx}
                        id={`gallery-thumb-${idx}`}
                        onClick={() => {
                          soundManager.playClick();
                          setActiveImageIndex(idx);
                        }}
                        className={`relative w-20 h-14 flex-shrink-0 border-2 overflow-hidden bg-[#18181a] transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#82d458] ring-2 ring-[#82d458]/50 shadow-md scale-102'
                            : 'border-[#38383a] opacity-70 hover:opacity-100 hover:border-[#666]'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.title} ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== product.thumbnailUrl && product.thumbnailUrl && !target.src.startsWith('data:image/svg')) {
                              target.src = product.thumbnailUrl;
                            } else if (!target.src.startsWith('data:image/svg')) {
                              target.src = getMinecraftSvgFallback(product.title, product.category);
                            }
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Buy Box & Key Meta */}
            <div className="lg:col-span-5 flex flex-col justify-between mc-panel p-4 bg-[#232426]">
              <div className="space-y-4">
                {/* Creator card */}
                <div
                  onClick={() => {
                    soundManager.playClick();
                    onSelectCreator(product.creator.id);
                    onClose();
                  }}
                  className="mc-panel-dark p-2.5 flex items-center justify-between cursor-pointer hover:border-[#82d458] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={product.creator.avatarUrl}
                      alt={product.creator.name}
                      className="w-8 h-8 rounded-none border border-[#444]"
                      onError={(e) => {
                        e.currentTarget.src = 'https://mc-heads.net/avatar/Steve/64';
                      }}
                    />
                    <div>
                      <div className="text-xs text-[#9a9a9e]">Автор:</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1">
                        <span>{product.creator.name}</span>
                        {product.creator.verified && (
                          <span className="text-[#3c8527] text-xs font-bold" title="Проверенный автор">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#82d458] font-bold">Все работы →</span>
                </div>

                {/* Rating & reviews */}
                <div className="flex items-center justify-between pb-3 border-b border-[#333]">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-[#ffd83d]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-[#ffd83d]' : 'opacity-40'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-white">{product.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-[#8e8e93]">
                    {product.ratingsCount.toLocaleString()} отзывов
                  </span>
                </div>

                {/* Specs metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="mc-panel-dark p-2 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#777]" />
                    <div>
                      <div className="text-[10px] text-[#777]">Размер файла</div>
                      <div className="font-bold text-white">{product.downloadSize}</div>
                    </div>
                  </div>
                  <div className="mc-panel-dark p-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#777]" />
                    <div>
                      <div className="text-[10px] text-[#777]">Версия</div>
                      <div className="font-bold text-white">{product.version}</div>
                    </div>
                  </div>
                  <div className="mc-panel-dark p-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#777]" />
                    <div>
                      <div className="text-[10px] text-[#777]">Дата релиза</div>
                      <div className="font-bold text-white">{product.releaseDate}</div>
                    </div>
                  </div>
                  <div className="mc-panel-dark p-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#82d458]" />
                    <div>
                      <div className="text-[10px] text-[#777]">Совместимость</div>
                      <div className="font-bold text-white">Bedrock Ready</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase / Action Panel */}
              <div className="pt-4 border-t-2 border-[#333] mt-4 space-y-3">
                {/* Detailed Price Comparison Banner */}
                <div className="mc-panel-dark p-3 space-y-2 border border-[#444]">
                  <div className="flex items-center justify-between text-xs text-[#9a9a9f]">
                    <span>Официальная цена в Minecraft:</span>
                    <span className="line-through text-[#ff7b7b] font-bold text-sm">
                      {(product.price || 830).toLocaleString()} Minecoins
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2c]">
                    <span className="text-xs text-[#ffd83d] font-bold">На сайте MineHolde:</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#285e1b] border border-[#54aa32] text-[#a4f576] font-bold text-xs uppercase">
                      <span>0 МОНЕТ • БЕСПЛАТНО</span>
                    </div>
                  </div>
                </div>

                {/* Primary CTA Button: Install real file */}
                {isOwned ? (
                  <div className="space-y-2">
                    <button
                      id="install-product-btn"
                      onClick={handleInstall}
                      disabled={isInstalling}
                      className={`w-full py-3 text-sm sm:text-base font-bold flex items-center justify-center gap-2 ${
                        installSuccess
                          ? 'mc-button-green border-[#82d458]'
                          : 'mc-button-green'
                      }`}
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Генерация и загрузка файла...</span>
                        </>
                      ) : installSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#ffe066]" />
                          <span>Файл успешно установлен!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Установить пакет ({product.downloadSize})</span>
                        </>
                      )}
                    </button>
                    <div className="text-center text-[10px] text-[#82d458] flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Пакет разблокирован бесплатно и готов к установке в Minecraft</span>
                    </div>
                  </div>
                ) : (
                  <button
                    id="purchase-product-btn"
                    onClick={() => {
                      soundManager.playLevelUp();
                      onPurchase(product);
                    }}
                    className="w-full py-3 text-sm sm:text-base font-bold flex items-center justify-center gap-2 mc-button-green"
                  >
                    <Download className="w-4 h-4 text-[#ffe066]" />
                    <span>ЗАБРАТЬ И УСТАНОВИТЬ БЕСПЛАТНО (0 МОНЕТ)</span>
                  </button>
                )}

                {/* Wishlist toggle */}
                <button
                  id="modal-wishlist-toggle"
                  onClick={() => {
                    soundManager.playClick();
                    onToggleWishlist(product);
                  }}
                  className={`w-full mc-button-gray py-2 text-xs flex items-center justify-center gap-2 ${
                    isWishlisted ? 'text-[#ff6b6b]' : 'text-[#bbb]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#ff6b6b]' : ''}`} />
                  <span>{isWishlisted ? 'В списке желаемого' : 'Добавить в желаемое'}</span>
                </button>
              </div>
            </div>
          </div>

              {/* Skins Preview Section (If skinpack or contains skins) */}
          {product.skins && product.skins.length > 0 && (
            <div className="mc-panel p-4 bg-[#1f2022]">
              <div className="flex items-center justify-between mb-3 border-b border-[#333] pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#82d458]" />
                  <h3 className="text-sm font-bold text-white">
                    Включённые скины ({product.skins.length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#8e8e93]">
                  Нажмите на скин для предпросмотра
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {product.skins.map((skin) => {
                  const isSelected = selectedSkin?.id === skin.id;
                  const isEquipped = equippedSkinId === skin.id;
                  return (
                    <div
                      key={skin.id}
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedSkin(skin);
                      }}
                      className={`mc-panel-dark p-2.5 flex flex-col items-center gap-2 cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-[#82d458] bg-[#2a2b2e]' : 'border-[#333] hover:border-[#666]'
                      }`}
                    >
                      <div className="w-16 h-20 bg-[#121213] border border-[#2a2a2c] flex items-center justify-center overflow-hidden relative">
                        <img
                          src={skin.textureUrl}
                          alt={skin.name}
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                        />
                        {isEquipped && (
                          <div className="absolute top-1 right-1 bg-[#3c8527] text-white p-0.5 text-[9px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <div className="text-xs font-bold text-white truncate">{skin.name}</div>
                        <div className="text-[10px] text-[#8e8e93]">
                          Модель: {skin.model}
                        </div>
                      </div>

                      {isOwned && onEquipSkin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playClick();
                            onEquipSkin(skin);
                          }}
                          className={`w-full mt-1 text-[10px] font-bold py-1 ${
                            isEquipped ? 'mc-button-gray text-[#82d458]' : 'mc-button-green'
                          }`}
                        >
                          {isEquipped ? 'Надето' : 'Надеть скин'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div className="mc-panel p-4 bg-[#232426] space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-[#333] pb-2">
                Описание товара
              </h3>
              <p className="text-xs text-[#cfcfd4] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>

              {/* Tags */}
              <div className="pt-2">
                <div className="text-[11px] text-[#8e8e93] mb-1.5 font-bold">Теги:</div>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-[#181819] border border-[#38383a] text-[11px] text-[#b0b0b5]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="mc-panel p-4 bg-[#232426] space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-[#333] pb-2">
                Особенности
              </h3>
              <ul className="space-y-2 text-xs text-[#cfcfd4]">
                {product.keyFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#82d458] font-bold">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* World Features if available */}
              {product.worldFeatures && (
                <div className="pt-2 border-t border-[#333]">
                  <div className="text-[11px] text-[#8e8e93] mb-2 font-bold">
                    Игровые механики мира:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {product.worldFeatures.customMobs !== undefined && (
                      <div className="mc-panel-dark p-1.5 text-center">
                        <span className="text-[#82d458] font-bold">{product.worldFeatures.customMobs}</span> Уник. мобов
                      </div>
                    )}
                    {product.worldFeatures.customVehicles !== undefined && (
                      <div className="mc-panel-dark p-1.5 text-center">
                        <span className="text-[#ffe066] font-bold">{product.worldFeatures.customVehicles}</span> Транспорта
                      </div>
                    )}
                    {product.worldFeatures.questLines !== undefined && (
                      <div className="mc-panel-dark p-1.5 text-center">
                        <span className="text-[#82d458] font-bold">{product.worldFeatures.questLines}</span> Квестов
                      </div>
                    )}
                    <div className="mc-panel-dark p-1.5 text-center">
                      Мультиплеер: <span className="text-[#82d458] font-bold">Поддерживается</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pack Identity */}
          <div className="mc-panel-dark p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-[#8e8e93]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#55b331]">packIdentity (UUID):</span>
              <span className="font-mono text-white bg-[#121213] px-2 py-0.5 border border-[#333]">
                {product.uuid}
              </span>
              <button
                onClick={handleCopyUuid}
                className="mc-button-gray p-1 text-xs"
                title="Скопировать UUID пакета"
              >
                {copiedUuid ? <Check className="w-3.5 h-3.5 text-[#82d458]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-[11px] text-[#aaa]">
              Формат: Bedrock Edition {product.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
