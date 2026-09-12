import React from 'react';
import { CATEGORIES } from '../data/marketplaceData';
import { soundManager } from '../utils/audio';

interface CategoryFilterProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  itemCount: number;
}

export const CATEGORY_RUSSIAN_MAP: Record<string, string> = {
  Mods: 'Моды',
  'Resource Packs': 'Наборы ресурсов',
  'Data Packs': 'Наборы данных',
  Shaders: 'Шейдеры',
  Modpacks: 'Модпаки',
  Plugins: 'Плагины',
  Servers: 'Серверы',
  // Localized aliases
  Моды: 'Моды',
  'Наборы ресурсов': 'Наборы ресурсов',
  'Наборы данных': 'Наборы данных',
  Шейдеры: 'Шейдеры',
  Модпаки: 'Модпаки',
  Плагины: 'Плагины',
  Серверы: 'Серверы',
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  activeCategory,
  onSelectCategory,
  itemCount,
}) => {
  const activeLabel = CATEGORY_RUSSIAN_MAP[activeCategory] || activeCategory;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <span>{activeLabel}</span>
          <span className="text-xs text-[#82d458] font-mono bg-[#1b4311] px-2 py-0.5 border border-[#499e30]">
            {itemCount} товаров
          </span>
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat;
          const label = CATEGORY_RUSSIAN_MAP[cat] || cat;
          return (
            <button
              key={cat}
              id={`cat-filter-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                soundManager.playClick();
                onSelectCategory(cat);
              }}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-[#3c8527] text-white border-t-2 border-[#82d458] border-b-2 border-[#1e4513] shadow-sm'
                  : 'mc-panel-dark text-[#a6a6ab] hover:text-white hover:border-[#666]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
