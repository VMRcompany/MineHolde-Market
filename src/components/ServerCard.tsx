import React, { useState } from 'react';
import {
  Gamepad2,
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { MinecraftServerItem } from '../types';
import { soundManager } from '../utils/audio';

interface ServerCardProps {
  server: MinecraftServerItem;
  onSelect: (server: MinecraftServerItem) => void;
  onOpenCreator?: (creatorId: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onSelect,
  onOpenCreator,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [launching, setLaunching] = useState(false);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const fullAddress = `${server.address}:${server.port}`;
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playLevelUp();
    setLaunching(true);
    // Deep Link protocol: minecraft://connect?ip=[IP]&port=[PORT]
    window.location.href = server.deepLink;
    setTimeout(() => setLaunching(false), 3000);
  };

  return (
    <div
      id={`server-card-${server.id}`}
      onClick={() => {
        soundManager.playClick();
        onSelect(server);
      }}
      className="mc-panel flex flex-col justify-between overflow-hidden group cursor-pointer hover:border-[#82d458] transition-all duration-200 hover:-translate-y-1 shadow-lg bg-[#212224] relative"
    >
      {/* Top Banner Image with Skeleton loading */}
      <div className="relative w-full h-44 sm:h-48 bg-[#18181a] overflow-hidden border-b-2 border-[#121213]">
        {/* Skeleton animation while image is loading */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-[#28292c] animate-pulse flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-[#444] animate-bounce" />
          </div>
        )}

        <img
          src={imageError ? server.logoUrl : server.bannerUrl || server.logoUrl}
          alt={server.name}
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#212224] via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges: Partner & Live Online Status */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          {server.isPartner ? (
            <div className="flex items-center gap-1 bg-[#1e4513]/90 text-[#82d458] border border-[#499e30] text-[10px] sm:text-xs font-bold px-2 py-0.5 shadow-md backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#55ff55]" />
              <span>Официальный партнер</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#242426]/90 text-[#aaa] border border-[#444] text-[10px] sm:text-xs font-bold px-2 py-0.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-[#ffe066]" />
              <span>Bedrock Сервер</span>
            </div>
          )}

          {/* Live Online Indicator */}
          <div className="flex items-center gap-1.5 bg-black/80 text-white border border-[#333] text-[10px] sm:text-xs font-bold px-2 py-0.5 shadow-md backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#55ff55] animate-pulse" />
            <Users className="w-3 h-3 text-[#82d458]" />
            <span className="font-mono text-[#55ff55]">
              {server.onlinePlayers.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Server Logo & Title on Banner Bottom */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2.5 pointer-events-none">
          <img
            src={server.logoUrl}
            alt={`${server.name} Logo`}
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-sm border-2 border-[#82d458] bg-[#111] object-cover shadow-md flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
              {server.name}
            </h3>
            <p className="text-[11px] text-[#a4f576] font-semibold truncate">
              {server.creatorName}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Tagline / Short description */}
        <p className="text-xs text-[#b8b8be] line-clamp-2 leading-relaxed">
          {server.tagline || server.description}
        </p>

        {/* Featured Games Tags */}
        <div className="flex flex-wrap gap-1.5">
          {server.featuredGames.slice(0, 4).map((game) => (
            <span
              key={game}
              className="text-[10px] font-bold bg-[#17181a] text-[#8e8e93] border border-[#333] px-2 py-0.5"
            >
              {game}
            </span>
          ))}
          {server.featuredGames.length > 4 && (
            <span className="text-[10px] font-bold bg-[#17181a] text-[#82d458] border border-[#333] px-1.5 py-0.5">
              +{server.featuredGames.length - 4}
            </span>
          )}
        </div>

        {/* IP Address & Network Info Box */}
        <div className="bg-[#17181a] border border-[#2d2d30] p-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Wifi className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
            <div className="font-mono text-white text-[11px] sm:text-xs font-bold truncate">
              {server.address}
              <span className="text-[#666]">:{server.port}</span>
            </div>
          </div>

          <button
            id={`copy-ip-btn-${server.id}`}
            onClick={handleCopyAddress}
            className="mc-button-gray px-2 py-1 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 transition-colors"
            title="Скопировать IP адрес и порт сервера"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#55ff55]" />
                <span className="text-[#55ff55]">Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#aaa]" />
                <span>Копия</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons: "Играть" and "Подробнее" */}
        <div className="pt-2 border-t border-[#2e2f33] grid grid-cols-2 gap-2">
          <button
            id={`play-server-btn-${server.id}`}
            onClick={handlePlayClick}
            className="mc-button-green py-2 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md group-hover:scale-[1.02] transition-transform"
            title={`Подключиться к серверу ${server.name} через deep link minecraft://connect`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{launching ? 'Запуск...' : 'Играть'}</span>
          </button>

          <button
            id={`details-server-btn-${server.id}`}
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onSelect(server);
            }}
            className="mc-button-gray py-2 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 text-white"
          >
            <Info className="w-3.5 h-3.5 text-[#aaa]" />
            <span>Инфо</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#777]" />
          </button>
        </div>
      </div>
    </div>
  );
};
