import { MinecraftServerItem } from '../types';

export interface JavaServerTarget {
  id: string;
  name: string;
  address: string;
  port?: number;
}

/**
 * List of Minecraft Java Edition server addresses to monitor via REST API.
 * All descriptions, player counts, versions, and statuses are fetched live from the REST API.
 */
export const JAVA_SERVER_TARGETS: JavaServerTarget[] = [
  { id: 'donutsmp', name: 'DonutSMP', address: 'donutsmp.net', port: 25565 },
  { id: 'reallyworld', name: 'ReallyWorld', address: 'play.reallyworld.ru', port: 25565 },
  { id: 'funtime', name: 'FunTime', address: 'mc.funtime.su', port: 25565 },
  { id: '2b2t', name: '2b2t', address: '2b2t.org', port: 25565 },
  { id: 'cubecraft', name: 'CubeCraft Games', address: 'play.cubecraft.net', port: 25565 },
  { id: 'wynncraft', name: 'Wynncraft', address: 'play.wynncraft.com', port: 25565 },
  { id: 'pika-network', name: 'PikaNetwork', address: 'play.pika-network.net', port: 25565 },
  { id: 'jartex', name: 'JartexNetwork', address: 'play.jartexnetwork.com', port: 25565 },
  { id: 'manacube', name: 'ManaCube', address: 'play.manacube.com', port: 25565 },
  { id: 'gommehd', name: 'GommeHD.net', address: 'gommehd.net', port: 25565 },
  { id: 'complex-gaming', name: 'Complex Gaming', address: 'hub.mc-complex.com', port: 25565 },
  { id: 'hypixel', name: 'Hypixel Network', address: 'mc.hypixel.net', port: 25565 },
];

// Telemetry cache with 1 minute TTL to avoid rate-limiting
const TELEMETRY_CACHE: Record<string, { data: Partial<MinecraftServerItem>; expires: number }> = {};

/**
 * Fetches real live server telemetry directly from the open REST API mcsrvstat.us
 * with dynamic fallback to mcstatus.io if needed.
 * Strictly parses players.online, players.max, motd.clean, and version.
 */
export async function pingJavaServer(address: string, port = 25565): Promise<{
  online: boolean;
  onlinePlayers: number;
  maxPlayers: number;
  version: string;
  motd: string;
  icon?: string;
  pingMs: number;
}> {
  const cacheKey = `${address}:${port}`;
  const now = Date.now();
  if (TELEMETRY_CACHE[cacheKey] && TELEMETRY_CACHE[cacheKey].expires > now) {
    const cached = TELEMETRY_CACHE[cacheKey].data;
    return {
      online: cached.isOnline ?? false,
      onlinePlayers: cached.onlinePlayers ?? 0,
      maxPlayers: cached.maxPlayers ?? 0,
      version: cached.version ?? 'Java Edition',
      motd: cached.description ?? '',
      icon: cached.logoUrl,
      pingMs: cached.pingMs ?? 30,
    };
  }

  const startTime = Date.now();

  // Try Primary REST API: api.mcsrvstat.us/3
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      const duration = Date.now() - startTime;
      const isOnline = Boolean(json.online);
      const onlinePlayers = Number(json.players?.online || 0);
      const maxPlayers = Number(json.players?.max || 0);
      const version = json.version ? String(json.version).trim() : 'Java Edition';

      let motd = '';
      if (Array.isArray(json.motd?.clean) && json.motd.clean.length > 0) {
        motd = json.motd.clean.map((line: string) => line.trim()).filter(Boolean).join('\n');
      }

      // Extract server icon from API database
      const icon =
        typeof json.icon === 'string' && json.icon.startsWith('data:image')
          ? json.icon
          : `https://api.mcsrvstat.us/icon/${encodeURIComponent(address)}`;

      if (isOnline) {
        const result = {
          online: true,
          onlinePlayers,
          maxPlayers,
          version,
          motd,
          icon,
          pingMs: Math.max(15, Math.min(duration, 150)),
        };

        TELEMETRY_CACHE[cacheKey] = {
          data: {
            isOnline: true,
            onlinePlayers,
            maxPlayers,
            version,
            description: motd,
            logoUrl: icon,
            pingMs: result.pingMs,
          },
          expires: now + 60000,
        };

        return result;
      }
    }
  } catch (err) {
    console.warn(`Primary monitoring API error for ${address}:`, err);
  }

  // Secondary Fallback REST API: api.mcstatus.io/v2/status/java
  try {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      const duration = Date.now() - startTime;
      const isOnline = Boolean(json.online);
      const onlinePlayers = Number(json.players?.online || 0);
      const maxPlayers = Number(json.players?.max || 0);
      const version = json.version?.name_clean ? String(json.version.name_clean).trim() : 'Java Edition';
      const motd = json.motd?.clean ? String(json.motd.clean).trim() : '';

      const icon =
        typeof json.icon === 'string' && json.icon.startsWith('data:image')
          ? json.icon
          : `https://api.mcsrvstat.us/icon/${encodeURIComponent(address)}`;

      const result = {
        online: isOnline,
        onlinePlayers: isOnline ? onlinePlayers : 0,
        maxPlayers: isOnline ? maxPlayers : 0,
        version: isOnline ? version : 'Java Edition',
        motd: isOnline ? motd : '',
        icon,
        pingMs: Math.max(15, Math.min(duration, 150)),
      };

      TELEMETRY_CACHE[cacheKey] = {
        data: {
          isOnline: result.online,
          onlinePlayers: result.onlinePlayers,
          maxPlayers: result.maxPlayers,
          version: result.version,
          description: result.motd,
          logoUrl: icon,
          pingMs: result.pingMs,
        },
        expires: now + 60000,
      };

      return result;
    }
  } catch (fallbackErr) {
    console.warn(`Fallback monitoring API error for ${address}:`, fallbackErr);
  }

  // If server is offline or unreachable in the API
  const fallbackIcon = `https://api.mcsrvstat.us/icon/${encodeURIComponent(address)}`;
  return {
    online: false,
    onlinePlayers: 0,
    maxPlayers: 0,
    version: 'Java Edition',
    motd: '',
    icon: fallbackIcon,
    pingMs: 0,
  };
}

/**
 * Loads all Minecraft Java Edition servers with real live telemetry from the REST API.
 * Descriptions, player counts, versions, and status are strictly taken from the API response.
 */
export async function getLiveJavaServers(): Promise<MinecraftServerItem[]> {
  const pings = await Promise.all(
    JAVA_SERVER_TARGETS.map(async (target) => {
      const ping = await pingJavaServer(target.address, target.port || 25565);

      // Description is strictly from REST API motd, or 'Описание отсутствует'
      const description = ping.motd ? ping.motd : 'Описание отсутствует';

      // Dynamically extract tags from motd if present, or leave empty
      const detectedTags: string[] = [];
      const lowerMotd = (ping.motd || '').toLowerCase();
      if (lowerMotd.includes('bedwars') || lowerMotd.includes('bed wars')) detectedTags.push('Bedwars');
      if (lowerMotd.includes('skywars') || lowerMotd.includes('skyblock')) detectedTags.push('SkyWars');
      if (lowerMotd.includes('pvp')) detectedTags.push('PvP');
      if (lowerMotd.includes('survival') || lowerMotd.includes('выживание') || lowerMotd.includes('smp')) detectedTags.push('Survival');
      if (lowerMotd.includes('анархия') || lowerMotd.includes('anarchy')) detectedTags.push('Анархия');
      if (lowerMotd.includes('egg wars') || lowerMotd.includes('eggwars')) detectedTags.push('EggWars');

      const serverItem: MinecraftServerItem = {
        id: target.id,
        name: target.name,
        creatorName: target.name,
        creatorId: target.id,
        tagline: description,
        description,
        address: target.address,
        port: target.port || 25565,
        deepLink: '', // Game launch protocol removed
        logoUrl: ping.icon || `https://api.mcsrvstat.us/icon/${encodeURIComponent(target.address)}`,
        bannerUrl: '', // Previews/banners removed
        screenshots: [], // Screenshots removed
        onlinePlayers: ping.online ? ping.onlinePlayers : 0,
        maxPlayers: ping.online ? ping.maxPlayers : 0,
        isOnline: ping.online,
        pingMs: ping.pingMs,
        version: ping.version || 'Java Edition',
        region: 'Global',
        featuredGames: detectedTags,
        tags: ['Все', ...detectedTags],
        isPartner: false,
      };

      return serverItem;
    })
  );

  // Sort online servers by online player count descending
  return pings.sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return b.onlinePlayers - a.onlinePlayers;
  });
}

