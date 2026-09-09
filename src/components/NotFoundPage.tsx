import React from 'react';
import { Compass, Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div
      id="not-found-page"
      className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <div
        id="not-found-card"
        className="mc-panel max-w-lg w-full p-6 sm:p-10 bg-[#1c1c1f] border-4 border-[#2b2b2e] shadow-2xl relative overflow-hidden flex flex-col items-center"
      >
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 bg-[#3c8527]" />
        <div className="absolute top-0 right-0 w-3 h-3 bg-[#3c8527]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 bg-[#3c8527]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#3c8527]" />

        {/* 404 Badge & Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-[#141416] border-2 border-[#38383c] flex items-center justify-center shadow-inner">
            <Compass className="w-10 h-10 text-[#d97706] animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#d93829] border border-[#ff6b6b] text-white text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
            404
          </div>
        </div>

        {/* Heading */}
        <h1
          id="not-found-title"
          className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider mb-3"
        >
          Упс, Ошибка 404
        </h1>

        <div className="inline-block px-3 py-1 bg-[#252528] border border-[#38383c] text-xs font-semibold text-[#ffd83d] uppercase tracking-wide mb-4">
          Страница не найдена
        </div>

        {/* Description */}
        <p
          id="not-found-desc"
          className="text-sm text-[#a0a0a5] leading-relaxed mb-8 max-w-sm"
        >
          Запрашиваемый товар или раздел не существует, был перемещен или введен неверный адрес.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            id="go-home-btn"
            onClick={() => {
              soundManager.playClick();
              onGoHome();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-[#2d691e] hover:bg-[#3c8527] border-2 border-[#54aa32] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#a4f576]" />
            <span>На главную</span>
          </button>
        </div>
      </div>
    </div>
  );
};
