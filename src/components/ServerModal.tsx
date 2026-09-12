import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  ShieldCheck,
  Wifi,
  Activity,
  Layers,
  HelpCircle,
  Server as ServerIcon,
} from 'lucide-react';
import { MinecraftServerItem } from '../types';
import { soundManager } from '../utils/audio';

interface ServerModalProps {
  server: MinecraftServerItem;
  onClose: () => void;
  onSelectProduct?: (productId: string) => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  server,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [iconError, setIconError] = useState(false);

  const fullAddress =
    server.port && server.port !== 25565
      ? `${server.address}:${server.port}`
      : server.address;

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="server-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="mc-panel max-w-2xl w-full my-auto overflow-hidden bg-[#212224] border-2 border-[#3c8527] shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Server Icon */}
        <div className="p-4 bg-[#18181a] border-b-2 border-[#121213] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Server Logo (from REST API database) */}
            <div className="w-12 h-12 bg-[#141517] border-2 border-[#33353a] flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner">
              {server.logoUrl && !iconError ? (
                <img
                  src={server.logoUrl}
                  alt={server.name}
                  referrerPolicy="no-referrer"
                  onError={() => setIconError(true)}
                  className="w-full h-full object-contain [image-rendering:pixelated]"
                />
              ) : (
                <ServerIcon className="w-6 h-6 text-[#82d458]" />
              )}
              <span
                className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                  server.isOnline ? 'bg-[#55ff55] animate-pulse' : 'bg-[#666]'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
                  {server.name}
                </h2>
                <span className="bg-[#1e4513] text-[#82d458] border border-[#499e30] text-[10px] font-bold px-1.5 py-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#55ff55] inline mr-1" />
                  Java Edition
                </span>
              </div>
              <p className="text-xs text-[#8e8e93] font-mono mt-0.5 truncate">
                {fullAddress} • {server.version || 'Java Edition'}
              </p>
            </div>
          </div>

          <button
            id="close-server-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray p-2 text-white hover:bg-[#3e3f42] flex-shrink-0 cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Live Telemetry Bar */}
          <div className="mc-panel-dark p-4 border-2 border-[#2d4d23] bg-[#1a2b1b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-[#a4f576] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-[#55ff55]" />
                <span>Адрес сервера</span>
              </div>
              <div className="font-mono text-white text-sm sm:text-base font-bold truncate">
                {fullAddress}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="modal-copy-ip-btn"
                onClick={handleCopy}
                className={`py-2.5 px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 justify-center transition-all cursor-pointer ${
                  copied
                    ? 'bg-[#1b4414] text-[#55ff55] border-2 border-[#55ff55]'
                    : 'mc-button-green text-white hover:brightness-110'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#55ff55]" />
                    <span className="text-[#55ff55]">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать IP</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real Live Metrics from REST API */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="mc-panel-dark p-3 text-center">
              <div className="text-[10px] text-[#8e8e93] uppercase font-bold flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-[#82d458]" />
                <span>Игроков онлайн</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-[#55ff55] font-mono mt-1">
                {server.onlinePlayers.toLocaleString()} / {server.maxPlayers.toLocaleString()}
              </div>
            </div>

            <div className="mc-panel-dark p-3 text-center">
              <div className="text-[10px] text-[#8e8e93] uppercase font-bold flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-[#82d458]" />
                <span>Статус / Пинг</span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono mt-1">
                {server.isOnline ? (
                  <span className="text-[#55ff55]">В сети (~{server.pingMs || 30}ms)</span>
                ) : (
                  <span className="text-[#888]">Не отвечает</span>
                )}
              </div>
            </div>

            <div className="mc-panel-dark p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] text-[#8e8e93] uppercase font-bold">Версия игры</div>
              <div className="text-xs sm:text-sm font-bold text-[#82d458] font-mono mt-1 truncate">
                {server.version || 'Java Edition'}
              </div>
            </div>
          </div>

          {/* Description & MOTD from REST API */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#333] pb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#82d458]" />
              <span>Описание сервера (MOTD из REST API)</span>
            </h3>
            <div className="mc-panel-dark p-3 text-xs text-[#c0c0c6] font-mono leading-relaxed whitespace-pre-line bg-[#161719] border border-[#2e2f33]">
              {server.description || 'Описание отсутствует'}
            </div>
          </div>

          {/* How to Connect Instructions */}
          <div className="mc-panel-dark p-4 border border-[#333] space-y-2 bg-[#161719]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#e0e0e0] uppercase">
              <HelpCircle className="w-4 h-4 text-[#82d458]" />
              <span>Как подключиться к серверу</span>
            </div>
            <ol className="text-xs text-[#a0a0a5] space-y-1 list-decimal list-inside leading-relaxed">
              <li>Нажмите кнопку <strong>«Скопировать IP»</strong> выше.</li>
              <li>Запустите Minecraft Java Edition на компьютере.</li>
              <li>Откройте «Сетевая игра» → «По адресу» (Direct Connect) или «Добавить».</li>
              <li>Вставьте адрес <code className="text-[#55ff55] bg-black/50 px-1 py-0.5 font-mono">{fullAddress}</code> и нажмите «Подключиться».</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#18181a] border-t-2 border-[#121213] flex items-center justify-between gap-3">
          <div className="text-xs text-[#8e8e93] font-mono">
            Онлайн: {server.onlinePlayers.toLocaleString()} / {server.maxPlayers.toLocaleString()}
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
              onClick={handleCopy}
              className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${
                copied
                  ? 'bg-[#1b4414] text-[#55ff55] border-2 border-[#55ff55]'
                  : 'mc-button-green text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#55ff55]" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать IP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
