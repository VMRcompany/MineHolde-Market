import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Gamepad2,
  SlidersHorizontal,
  AlertCircle,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { MinecraftServerItem } from '../types';
import { getLiveJavaServers } from '../services/javaServersMonitoring';
import { ServerCard } from './ServerCard';
import { ServerModal } from './ServerModal';
import { soundManager } from '../utils/audio';

interface ServersPageProps {
  onSelectProduct?: (productId: string) => void;
  onOpenCreator?: (creatorId: string) => void;
  initialServerId?: string | null;
}

export const ServersPage: React.FC<ServersPageProps> = ({
  onSelectProduct,
  onOpenCreator,
  initialServerId,
}) => {
  const [servers, setServers] = useState<MinecraftServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalOnline, setTotalOnline] = useState<number>(0);
  const [selectedServer, setSelectedServer] = useState<MinecraftServerItem | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('Все');
  const [sortBy, setSortBy] = useState<'online' | 'ping' | 'name'>('online');

  const tags = [
    'Все',
    'PvP',
    'Bedwars',
    'SkyWars',
    'EggWars',
    'Мини-игры',
    'Survival',
    'Анархия',
    'Earth SMP',
  ];

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getLiveJavaServers();
      setServers(list);
      const onlineSum = list.reduce((acc, s) => acc + (s.onlinePlayers || 0), 0);
      setTotalOnline(onlineSum);

      // Check if URL has a specific server requested
      if (initialServerId) {
        const found = list.find((s) => s.id === initialServerId || s.address.includes(initialServerId));
        if (found) {
          setSelectedServer(found);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch Minecraft Java servers from monitoring API', err);
      setError('Не удалось загрузить данные серверов. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [initialServerId]);

  // Filtered & sorted servers
  const filteredServers = useMemo(() => {
    let list = [...servers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.creatorName.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.featuredGames.some((g) => g.toLowerCase().includes(q)) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeTag !== 'Все') {
      list = list.filter(
        (s) =>
          s.tags.some((t) => t.toLowerCase().includes(activeTag.toLowerCase())) ||
          s.featuredGames.some((g) => g.toLowerCase().includes(activeTag.toLowerCase()))
      );
    }

    if (sortBy === 'online') {
      list.sort((a, b) => b.onlinePlayers - a.onlinePlayers);
    } else if (sortBy === 'ping') {
      list.sort((a, b) => (a.pingMs || 99) - (b.pingMs || 99));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [servers, searchQuery, activeTag, sortBy]);

  const handleSelectServer = (server: MinecraftServerItem) => {
    setSelectedServer(server);
    if (typeof window !== 'undefined') {
      window.history.pushState({ serverId: server.id }, '', `/servers/${server.id}`);
    }
  };

  const handleCloseServerModal = () => {
    setSelectedServer(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/servers');
    }
  };

  return (
    <div id="minecraft-servers-page" className="space-y-6">
      {/* Hero Header Banner */}
      <section
        id="servers-hero-banner"
        className="mc-panel p-6 sm:p-8 bg-gradient-to-r from-[#1b2b1c] via-[#212529] to-[#1a1b1e] border-2 border-[#3c8527] relative overflow-hidden shadow-2xl"
      >
        {/* Background Minecraft particles effect / gradient */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Server className="w-96 h-96 text-[#82d458]" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-[#3c8527] text-white text-xs uppercase font-bold px-2.5 py-1 border border-[#6cb546] shadow-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-white" />
              Minecraft Java Edition
            </span>
            <span className="bg-[#142617] text-[#55ff55] text-xs font-bold px-2.5 py-1 border border-[#55ff55]/40 flex items-center gap-1.5 shadow-sm">
              <Radio className="w-3.5 h-3.5 text-[#55ff55] animate-pulse" />
              <span>Прямой поток телеметрии (Live API)</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Серверы Minecraft Java Edition
            </h1>
            <p className="text-sm sm:text-base text-[#b0b0b8] mt-1.5 leading-relaxed max-w-2xl">
              Играйте на лучших серверах Minecraft Java Edition (Hypixel, ReallyWorld, FunTime, DonutSMP, 2b2t и др.). Реальный онлайн из официального протокола мониторинга, быстрый поиск и удобное копирование IP.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-[#334235] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#55ff55] animate-pulse" />
              <span className="text-[#a0a0a5]">Игроков онлайн сейчас:</span>
              <strong className="text-white font-mono text-sm sm:text-base text-[#55ff55]">
                {totalOnline > 0 ? totalOnline.toLocaleString() : '85,000+'}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#82d458]" />
              <span className="text-[#a0a0a5]">Версии клиентов:</span>
              <strong className="text-white font-mono">1.8 - 1.21.x Java</strong>
            </div>

            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#ffe066]" />
              <span className="text-[#a0a0a5]">Серверов в сети:</span>
              <strong className="text-white font-mono">{servers.length || 12}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Controls Bar */}
      <section className="mc-panel p-4 bg-[#212224] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search input */}
          <div className="relative flex-1 max-w-md">
            <input
              id="server-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск серверов по названию, мини-игре (Bedwars, SkyWars, SMP) или IP..."
              className="w-full mc-input py-2 pl-9 pr-4 text-xs sm:text-sm placeholder:text-[#6e6e73]"
            />
            <Search className="w-4 h-4 text-[#8a8a8f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector & Reload Button */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-[#8e8e93] flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Сортировка:</span>
            </span>
            <select
              id="server-sort-select"
              value={sortBy}
              onChange={(e) => {
                soundManager.playClick();
                setSortBy(e.target.value as any);
              }}
              className="mc-input px-2.5 py-1.5 text-xs font-bold"
            >
              <option value="online">По количеству игроков (Онлайн)</option>
              <option value="ping">По лучшему пингу (Ping)</option>
              <option value="name">По алфавиту (A-Z)</option>
            </select>

            <button
              id="reload-servers-btn"
              onClick={() => {
                soundManager.playClick();
                fetchServers();
              }}
              className="mc-button-gray p-2 text-white"
              title="Обновить список и онлайн серверов"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#82d458]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-[#2e2f33]">
          {tags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTag(tag);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-none whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#3c8527] text-white border-t-2 border-[#82d458] border-b-2 border-[#1e4513] shadow-sm'
                    : 'bg-[#18181a] text-[#a0a0a5] hover:text-white hover:bg-[#28292c] border border-[#333]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="mc-panel p-4 bg-[#261818] border-2 border-[#7a2828] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#ffb4b4]">
            <AlertCircle className="w-5 h-5 text-[#ff6b6b] flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchServers}
            className="mc-button-green px-3 py-1.5 text-xs font-bold flex-shrink-0"
          >
            Повторить попытку
          </button>
        </div>
      )}

      {/* Loading Skeletons Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="text-center py-6 text-xs text-[#8e8e93] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#82d458]" />
            <span>Загрузка серверов и живой телеметрии игроков...</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="mc-panel-dark animate-pulse flex flex-col justify-between p-4 border border-[#333] space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#2e2f33] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#28292c]" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-4 bg-[#28292c]" />
                      <div className="w-20 h-3 bg-[#28292c]" />
                    </div>
                  </div>
                  <div className="w-24 h-6 bg-[#28292c]" />
                </div>
                <div className="w-full h-8 bg-[#28292c]" />
                <div className="w-full h-16 bg-[#28292c]" />
                <div className="w-full h-10 bg-[#28292c] mt-2" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredServers.length === 0 ? (
        /* Empty results state */
        <div className="text-center py-16 mc-panel-dark text-sm text-[#8e8e93] space-y-2">
          <Server className="w-10 h-10 mx-auto text-[#555]" />
          <div>Серверы по вашему запросу «{searchQuery || activeTag}» не найдены.</div>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTag('Все');
            }}
            className="mc-button-gray px-4 py-1.5 text-xs font-bold text-white mt-2"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        /* Server Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onSelect={handleSelectServer}
              onOpenCreator={onOpenCreator}
            />
          ))}
        </div>
      )}

      {/* Direct Connection Quick Guide */}
      <section className="mc-panel p-5 bg-[#1a1b1d] border border-[#2e2f33] space-y-3">
        <div className="flex items-center gap-2 border-b border-[#2e2f33] pb-2">
          <Gamepad2 className="w-5 h-5 text-[#82d458]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Как играть на серверах в Minecraft Java Edition
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#a0a0a5]">
          <div className="mc-panel-dark p-3 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#3c8527] text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Скопируйте IP</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Нажмите кнопку <strong>«Скопировать IP»</strong> на карточке сервера. Точный сетевой адрес будет скопирован в буфер обмена.
            </p>
          </div>

          <div className="mc-panel-dark p-3 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#3c8527] text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Сетевая игра в Minecraft</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Откройте Minecraft Java Edition на ПК → «Сетевая игра» (Multiplayer) → «По адресу» (Direct Connection) или «Добавить» (Add Server).
            </p>
          </div>

          <div className="mc-panel-dark p-3 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#3c8527] text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Подключение к игре</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Вставьте скопированный IP через <kbd className="text-[#82d458] bg-black/40 px-1 py-0.5 font-mono">Ctrl+V</kbd> и нажмите «Подключиться». Приятной игры!
            </p>
          </div>
        </div>
      </section>

      {/* Selected Server Details Modal */}
      {selectedServer && (
        <ServerModal
          server={selectedServer}
          onClose={handleCloseServerModal}
          onSelectProduct={onSelectProduct}
        />
      )}
    </div>
  );
};
