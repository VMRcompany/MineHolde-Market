import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ImageViewerModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    soundManager.playClick();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    soundManager.playClick();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation: Escape to close, Left/Right arrows to navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImageUrl = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-[#54aa32] border border-[#2d5d1b]" />
          <h3 className="text-white font-minecraft text-sm tracking-wider drop-shadow line-clamp-1 max-w-md">
            {title || 'Просмотр скриншота'}
          </h3>
          {images.length > 1 && (
            <span className="text-xs px-2.5 py-1 bg-[#1e2329] border border-[#3e4450] text-[#a4f576] font-minecraft rounded-none">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="p-2 text-zinc-400 hover:text-white bg-[#1e2329] hover:bg-[#2c333e] border-2 border-[#3e4450] hover:border-[#a4f576] transition-colors cursor-pointer"
          title="Закрыть (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative flex items-center justify-center w-full h-full max-w-6xl max-h-[82vh] px-4 py-8"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImageUrl}
          alt={title || 'Minecraft screenshot'}
          className="max-w-full max-h-full object-contain border-2 border-[#3e4450] shadow-2xl transition-all duration-200"
          loading="eager"
        />

        {/* Previous Navigation Arrow */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-[#1e2329]/90 hover:bg-[#2c333e] text-white border-2 border-[#3e4450] hover:border-[#54aa32] transition-colors shadow-lg cursor-pointer group"
            title="Предыдущее изображение (←)"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Next Navigation Arrow */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-[#1e2329]/90 hover:bg-[#2c333e] text-white border-2 border-[#3e4450] hover:border-[#54aa32] transition-colors shadow-lg cursor-pointer group"
            title="Следующее изображение (→)"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 p-2 bg-[#12161b]/90 border border-[#2d3440] max-w-[90vw] overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                soundManager.playClick();
                setCurrentIndex(idx);
              }}
              className={`relative flex-shrink-0 w-14 h-14 border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-[#54aa32] scale-105 shadow-md'
                  : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-500'
              }`}
            >
              <img
                src={img}
                alt={`preview-${idx}`}
                className="w-full h-full object-cover"
              />
              {idx === currentIndex && (
                <div className="absolute inset-0 border border-[#a4f576] pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
