import React from 'react';

interface MinecoinBadgeProps {
  amount?: number | string;
  originalAmount?: number;
  officialPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  isSale?: boolean;
  className?: string;
  showComparison?: boolean;
  layout?: 'compact' | 'horizontal' | 'stacked';
}

export const MinecoinBadge: React.FC<MinecoinBadgeProps> = ({
  amount,
  originalAmount,
  officialPrice,
  size = 'md',
  className = '',
  showComparison = true,
  layout = 'compact',
}) => {
  // Determine real official Minecraft price (fallback to originalAmount, amount, or 830)
  const realPrice = officialPrice ?? (typeof amount === 'number' && amount > 0 ? amount : originalAmount ?? 830);

  const sizeClasses = {
    sm: 'text-[11px] gap-1',
    md: 'text-xs gap-1.5',
    lg: 'text-sm gap-2',
  };

  if (!showComparison) {
    return (
      <div
        id="minecoin-free-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 bg-[#2e6d1c] text-[#a4f576] border border-[#54aa32] font-bold text-xs uppercase shadow-sm ${className}`}
      >
        <span>БЕСПЛАТНО</span>
      </div>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        <div className="flex items-center gap-1.5 text-[11px] text-[#9a9a9f]">
          <span>В Minecraft:</span>
          <span className="line-through text-[#ff8080] font-bold">
            {realPrice.toLocaleString()} Minecoins
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#234e18] border-2 border-[#54aa32] text-[#a4f576] font-bold text-xs uppercase shadow-md">
          <span className="text-[#ffd83d]">В MineHolde:</span>
          <span className="text-[#a4f576] tracking-wide">БЕСПЛАТНО</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="minecoin-comparison-badge"
      className={`inline-flex flex-wrap items-center ${sizeClasses[size]} ${className}`}
    >
      {/* Official Minecraft crossed price */}
      {realPrice > 0 && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1a1a1c] border border-[#38383a] text-[#8e8e93] text-[10px]">
          <span className="text-[#777] hidden sm:inline">В Minecraft:</span>
          <span className="line-through text-[#ff7b7b] font-bold">
            {realPrice.toLocaleString()} M
          </span>
        </div>
      )}

      {/* MineHolde Free Badge */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#285e1b] border border-[#499e30] text-[#a4f576] font-bold text-[11px] uppercase tracking-wide shadow-xs">
        <span className="text-[#ffd83d] text-[10px] hidden md:inline">MineHolde:</span>
        <span>БЕСПЛАТНО</span>
      </div>
    </div>
  );
};

