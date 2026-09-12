import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { PromotionCampaign } from '../types';
import { soundManager } from '../utils/audio';

interface BannerCarouselProps {
  campaigns: PromotionCampaign[];
  onSelectPromotion: (campaign: PromotionCampaign) => void;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  campaigns,
  onSelectPromotion,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (campaigns.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [campaigns.length]);

  if (!campaigns || campaigns.length === 0) return null;

  const current = campaigns[currentIndex];

  const handlePrev = () => {
    soundManager.playClick();
    setCurrentIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);
  };

  const handleNext = () => {
    soundManager.playClick();
    setCurrentIndex((prev) => (prev + 1) % campaigns.length);
  };

  return (
    <div id="mc-banner-carousel" className="relative w-full overflow-hidden mc-panel mb-8">
      {/* Background Image with Dark Gradient Overlay */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full">
        <img
          src={current.bannerImage}
          alt={current.title}
          className="w-full h-full object-cover transition-opacity duration-500 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121214]/95 via-[#1a1a1d]/75 to-transparent flex items-center">
          <div className="max-w-2xl px-6 sm:px-12 py-6">
            {/* Promo Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#3c8527] border border-[#6cb546] text-white text-xs font-bold uppercase tracking-wider mb-3 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-[#ffe066]" />
              <span>{current.badge}</span>
            </div>

            {/* Campaign Title */}
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 drop-shadow-[0_2px_2px_#000] tracking-wide uppercase">
              {current.title}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#d0d0d5] mb-6 max-w-xl line-clamp-2 drop-shadow-[0_1px_1px_#000]">
              {current.subtitle}
            </p>

            {/* Call to action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id={`explore-campaign-${current.id}`}
                onClick={() => {
                  soundManager.playClick();
                  onSelectPromotion(current);
                }}
                className="mc-button-green px-5 py-2.5 text-sm sm:text-base font-bold flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                <span>Смотреть предложения</span>
              </button>

              <div className="mc-panel-dark px-3 py-2 text-xs text-[#a8a8af] flex items-center gap-1.5 border border-[#3e3f42]">
                <ShieldCheck className="w-4 h-4 text-[#82d458]" />
                <span>Проверено в Minecraft Bedrock</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {campaigns.length > 1 && (
        <>
          <button
            id="banner-prev-btn"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 mc-button-gray w-9 h-9 flex items-center justify-center z-10"
            aria-label="Previous promo"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            id="banner-next-btn"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 mc-button-gray w-9 h-9 flex items-center justify-center z-10"
            aria-label="Next promo"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {campaigns.map((c, i) => (
              <button
                key={c.id}
                id={`banner-dot-${i}`}
                onClick={() => {
                  soundManager.playClick();
                  setCurrentIndex(i);
                }}
                className={`w-3 h-3 border border-[#111] transition-all ${
                  currentIndex === i ? 'bg-[#55b331] scale-110 shadow-sm' : 'bg-[#404043] hover:bg-[#606064]'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
