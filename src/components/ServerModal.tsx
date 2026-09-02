import React, { useState } from 'react';
import {
  X,
  Gamepad2,
  Users,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  Radio,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  Activity,
  Terminal,
} from 'lucide-react';
import { MinecraftServerItem, ProductItem } from '../types';
import { soundManager } from '../utils/audio';

interface ServerModalProps {
  server: MinecraftServerItem;
  onClose: () => void;
  onSelectProduct?: (productId: string) => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  server,
  onClose,
  onSelectProduct,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [launching, setLaunching] = useState(false);

  const photos = [
    server.bannerUrl,
    ...(server.screenshots || []),
  ].filter(Boolean);

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(`${server.address}:${server.port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlay = () => {
    soundManager.playLevelUp();
    setLaunching(true);
    window.location.href = server.deepLink;
    setTimeout(() => setLaunching(false), 3000);
  };

  return (
    <div
      id="server-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="mc-panel max-w-3xl w-full my-auto overflow-hidden bg-[#212224] shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-[#18181a] border-b-2 border-[#121213] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={server.logoUrl}
              alt={server.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-sm border-2 border-[#82d458] object-cover flex-shrink-0 bg-[#111]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
                  {server.name}
                </h2>
                {server.isPartner && (
                  <span className="bg-[#1e4513] text-[#82d458] border border-[#499e30] text-[10px] font-bold px-1.5 py-0.2 uppercase hidden sm:inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#55ff55]" />
                    Официальный партнер
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8e8e93] font-semibold truncate">
                {server.creatorName} • {server.version}
              </p>
            </div>
          </div>

          <button
            id="close-server-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray p-2 text-white hover:bg-[#3e3f42] flex-shrink-0"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Gallery / Banner Carousel */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <div className="relative w-full h-56 sm:h-72 bg-[#141416] border-2 border-[#121213] overflow-hidden">
                <img
                  src={photos[activePhotoIdx]}
                  alt={`${server.name} screenshot ${activePhotoIdx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 mc-button-gray p-2 text-white shadow-lg bg-black/60"
                      title="Предыдущий скриншот"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 mc-button-gray p-2 text-white shadow-lg bg-black/60"
                      title="Следующий скриншот"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Live Online Overlay Badge */}
                <div className="absolute top-3 right-3 bg-black/85 text-white border border-[#444] px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#55ff55] animate-pulse" />
                  <Users className="w-3.5 h-3.5 text-[#82d458]" />
                  <span>Онлайн: <strong className="text-[#55ff55] font-mono">{server.onlinePlayers.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Thumbnails row */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {photos.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        soundManager.playClick();
                        setActivePhotoIdx(idx);
                      }}
                      className={`w-20 h-12 flex-shrink-0 border-2 overflow-hidden transition-all ${
                        activePhotoIdx === idx
                          ? 'border-[#82d458] ring-2 ring-[#82d458]/40 scale-105'
                          : 'border-[#333] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt="thumbnail"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Connect & Play Action Bar */}
          <div className="mc-panel-dark p-4 border-2 border-[#2d4d23] bg-[#1a2b1b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-[#a4f576] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#55ff55] animate-pulse" />
                <span>Адрес подключения в Bedrock</span>
              </div>
              <div className="font-mono text-white text-sm sm:text-base font-bold flex items-center gap-2">
                <span>{server.address}</span>
                <span className="text-[#888] font-normal">Порт: {server.port}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="modal-copy-ip-btn"
                onClick={handleCopy}
                className="mc-button-gray py-2 px-3 text-xs font-bold flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#55ff55]" />
                    <span className="text-[#55ff55]">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#bbb]" />
                    <span>Скопировать IP</span>
                  </>
                )}
              </button>

              <button
                id="modal-play-btn"
                onClick={handlePlay}
                className="mc-button-green py-2 px-5 text-sm font-bold flex items-center gap-2 flex-1 sm:flex-initial justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{launching ? 'Запуск...' : 'Играть в Minecraft'}</span>
              </button>
            </div>
          </div>

          {/* Description & About */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333] pb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#82d458]" />
              <span>О сервере</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#c0c0c6] leading-relaxed">
              {server.description}
            </p>
          </div>

          {/* Featured Game Modes */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333] pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ffe066]" />
              <span>Доступные режимы и мини-игры ({server.featuredGames.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {server.featuredGames.map((game) => (
                <div
                  key={game}
                  className="mc-panel-dark p-2.5 flex items-center gap-2 text-xs font-bold text-white hover:border-[#82d458] transition-colors"
                >
                  <div className="w-2 h-2 bg-[#82d458] flex-shrink-0" />
                  <span className="truncate">{game}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Server Telemetry & Network Stats */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333] pb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#55ff55]" />
              <span>Статистика и Телеметрия Marketplace</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="mc-panel-dark p-3 text-center">
                <div className="text-[10px] text-[#8e8e93] uppercase font-bold">Онлайн сейчас</div>
                <div className="text-base font-bold text-[#55ff55] font-mono mt-0.5">
                  {server.onlinePlayers.toLocaleString()}
                </div>
              </div>
              <div className="mc-panel-dark p-3 text-center">
                <div className="text-[10px] text-[#8e8e93] uppercase font-bold">Пик за сегодня</div>
                <div className="text-base font-bold text-[#ffe066] font-mono mt-0.5">
                  {server.telemetry?.peakPlayersToday?.toLocaleString() || '30,000+'}
                </div>
              </div>
              <div className="mc-panel-dark p-3 text-center">
                <div className="text-[10px] text-[#8e8e93] uppercase font-bold">Пинг / Регион</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  ~{server.pingMs || 30}ms
                </div>
              </div>
              <div className="mc-panel-dark p-3 text-center">
                <div className="text-[10px] text-[#8e8e93] uppercase font-bold">Версия</div>
                <div className="text-xs font-bold text-[#82d458] mt-1 truncate">
                  {server.version}
                </div>
              </div>
            </div>
          </div>

          {/* How to Connect Instructions */}
          <div className="mc-panel-dark p-4 border border-[#333] space-y-2 bg-[#161719]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#e0e0e0] uppercase">
              <HelpCircle className="w-4 h-4 text-[#82d458]" />
              <span>Инструкция по прямому подключению</span>
            </div>
            <ol className="text-xs text-[#a0a0a5] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Откройте Minecraft Bedrock на вашем телефоне, ПК (Windows) или консоли.</li>
              <li>Нажмите <strong>«Играть» → вкладка «Серверы»</strong>.</li>
              <li>Для официальных партнеров (The Hive, CubeCraft и др.) сервер уже находится в списке! Либо нажмите <strong>«Добавить сервер»</strong>.</li>
              <li>Введите адрес: <code className="text-[#55ff55] bg-black/50 px-1 py-0.5 font-mono">{server.address}</code> и порт: <code className="text-[#55ff55] bg-black/50 px-1 py-0.5 font-mono">{server.port}</code>.</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#18181a] border-t-2 border-[#121213] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8e8e93]">
            {server.websiteUrl && (
              <a
                href={server.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 text-[#82d458] font-bold"
              >
                <span>Официальный сайт</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {server.discordUrl && (
              <>
                <span>•</span>
                <a
                  href={server.discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white flex items-center gap-1 text-[#a4f576]"
                >
                  <span>Discord</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="mc-button-gray px-4 py-2 text-xs font-bold"
            >
              Закрыть
            </button>
            <button
              onClick={handlePlay}
              className="mc-button-green px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Играть</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
