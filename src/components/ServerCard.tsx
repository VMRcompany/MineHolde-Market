import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Wifi,
  ShieldCheck,
  Server as ServerIcon,
} from 'lucide-react';
import { MinecraftServerItem } from '../types';
import { soundManager } from '../utils/audio';

interface ServerCardProps {
  server: MinecraftServerItem;
  onSelect?: (server: MinecraftServerItem) => void;
  onOpenCreator?: (creatorId: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const [iconError, setIconError] = useState(false);

  const fullAddress =
    server.port && server.port !== 25565
      ? `${server.address}:${server.port}`
      : server.address;

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div
      id={`server-card-${server.id}`}
      onClick={() => {
        if (onSelect) {
          soundManager.playClick();
          onSelect(server);
        }
      }}
      className="mc-panel flex flex-col justify-between overflow-hidden bg-[#212224] border-2 border-[#2e3034] hover:border-[#82d458] transition-colors p-4 space-y-3 shadow-md"
    >
      {/* Header: Server Logo from API, Name, Java Edition, and Real Live Online Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2e2f33] pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Server Logo (64x64 icon from REST API / Favicon) */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#18191c] border-2 border-[#33353a] flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner">
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
              title={server.isOnline ? 'В сети' : 'Офлайн'}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                {server.name}
              </h3>
              <span className="text-[10px] font-bold text-[#82d458] bg-[#1a3314] border border-[#3c8527] px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#55ff55]" />
                Java
              </span>
            </div>
            <div className="text-xs text-[#8e8e93] font-mono truncate mt-0.5">
              {fullAddress}
            </div>
          </div>
        </div>

        {/* Live Online Count: players.online / players.max from REST API */}
        <div
          id={`server-online-${server.id}`}
          className="flex items-center gap-1.5 bg-[#17181a] border border-[#333] text-xs font-mono font-bold px-2.5 py-1.5 flex-shrink-0 self-start sm:self-center"
        >
          <Users className="w-3.5 h-3.5 text-[#82d458]" />
          <span className="text-[#a0a0a5]">Онлайн:</span>
          <span className={server.isOnline ? 'text-[#55ff55]' : 'text-[#888]'}>
            {server.onlinePlayers.toLocaleString()} / {server.maxPlayers.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Server Address & Version Row */}
      <div className="bg-[#17181a] border border-[#2b2c30] p-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Wifi className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
          <span className="text-[#8e8e93]">IP:</span>
          <code className="font-mono text-white text-xs sm:text-sm font-bold truncate">
            {fullAddress}
          </code>
        </div>
        <div className="text-[11px] text-[#8e8e93] font-mono flex-shrink-0 truncate max-w-[140px]">
          {server.version || 'Java Edition'}
        </div>
      </div>

      {/* Server Description (MOTD strictly from REST API) */}
      <div className="bg-[#18191c] border border-[#27282c] p-3 text-xs text-[#c0c0c6] font-mono leading-relaxed whitespace-pre-line min-h-[3.5rem] flex items-center">
        {server.description || 'Описание отсутствует'}
      </div>

      {/* Dynamic Tags from MOTD (if any detected from REST API) */}
      {server.featuredGames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {server.featuredGames.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold bg-[#17181a] text-[#8e8e93] border border-[#333] px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Only ONE main button: "Скопировать IP" */}
      <div className="pt-2 border-t border-[#2e2f33]">
        <button
          id={`copy-ip-btn-${server.id}`}
          onClick={handleCopyAddress}
          className={`w-full py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            copied
              ? 'bg-[#1b4414] text-[#55ff55] border-2 border-[#55ff55]'
              : 'mc-button-green text-white hover:brightness-110 active:scale-[0.99]'
          }`}
          title={`Скопировать IP адрес ${fullAddress} в буфер обмена`}
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
  );
};
