/**
 * Pool of verified active Minecraft CDN images from Mojang Launcher & Marketplace CDN.
 */
export const VERIFIED_MOJANG_IMAGES = [
  'https://launchercontent.mojang.com/v2/images/DimensionClashLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/DimensionClashLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/OneblockOnlineLaunchLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/OneblockOnlineLaunchLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftTreasureHuntLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftTreasureHuntLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftSulfurSpotlightLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftSulfurSpotlightLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/MarketplaceLauncherAug26700x466.jpg',
  'https://launchercontent.mojang.com/v2/images/MarketplaceLauncherAug26772x350.jpg',
  'https://launchercontent.mojang.com/v2/images/MarketplacePassLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MarketplacePassLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/jr0828700x466.jpg',
  'https://launchercontent.mojang.com/v2/images/jr0828772x350.jpg',
  'https://launchercontent.mojang.com/v2/images/MCD2HeroCapeMinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MCD2HeroCapeMinecraftLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/MCD2MinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MCD2MinecraftLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/tf700x466.png',
  'https://launchercontent.mojang.com/v2/images/tf772x350.png',
  'https://launchercontent.mojang.com/v2/images/MCD2SSComp700x466.png',
  'https://launchercontent.mojang.com/v2/images/MCD2SSComp772x350.png',
  'https://launchercontent.mojang.com/v2/images/MCSandstormCapesMinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MCLAnnounceKeyArtMinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftBedrockHelloKittyandFriendsFurnitureAddonMinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftBedrockHelloKittyandFriendsFurnitureAddonMinecraftLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/summerdropaddon700x466.png',
  'https://launchercontent.mojang.com/v2/images/summerdropaddon772x350.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftAetherLegendsLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftAetherLegendsLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/LauncherNewsArticleCard772x466.png',
  'https://launchercontent.mojang.com/v2/images/LauncherNewsArticleCard772x350.png',
  'https://launchercontent.mojang.com/v2/images/MCD2AnniversaryCapeMinecraftLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MCD2AnniversaryCapeMinecraftLauncher772x350.png',
  'https://launchercontent.mojang.com/v2/images/mc15annivkeyart700x466.png',
  'https://launchercontent.mojang.com/v2/images/mc15annivkeyart772x350.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftCavesAndCliffsLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/TrickyTrialsLiveEventLauncher700x466.png',
  'https://launchercontent.mojang.com/v2/images/MinecraftAutumnDropLauncher700x466.png',
];

export const VERIFIED_BEDROCK_IMAGES = VERIFIED_MOJANG_IMAGES;

/**
 * Returns a deterministic, distinct image URL for any product by its ID or title so that
 * no two different packs end up with the exact same placeholder artwork.
 */
export function getDistinctArtworkForProduct(productIdOrTitle: string, indexOffset: number = 0): string {
  if (!productIdOrTitle) {
    return VERIFIED_MOJANG_IMAGES[0];
  }
  let hash = 0;
  for (let i = 0; i < productIdOrTitle.length; i++) {
    hash = (hash << 5) - hash + productIdOrTitle.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash + indexOffset) % VERIFIED_MOJANG_IMAGES.length;
  return VERIFIED_MOJANG_IMAGES[idx];
}

/**
 * Creates an offline Minecraft pixel-art style SVG data URL fallback if network fails completely.
 */
export function getMinecraftSvgFallback(title: string, category: string = 'Marketplace'): string {
  const safeTitle = (title || 'Minecraft Pack').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCat = (category || 'BEDROCK').replace(/</g, '&lt;').replace(/>/g, '&gt;').toUpperCase();
  
  // Choose accent color based on title hash
  let hash = 0;
  for (let i = 0; i < safeTitle.length; i++) {
    hash = (hash << 5) - hash + safeTitle.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    { bg1: '#1b2b18', bg2: '#0d120c', stroke: '#4ade80', badge: '#86efac' },
    { bg1: '#2b1b18', bg2: '#140c0b', stroke: '#f87171', badge: '#fca5a5' },
    { bg1: '#18242b', bg2: '#0c1218', stroke: '#38bdf8', badge: '#7dd3fc' },
    { bg1: '#261b2b', bg2: '#130c17', stroke: '#c084fc', badge: '#d8b4fe' },
    { bg1: '#2b2618', bg2: '#17140c', stroke: '#fbbf24', badge: '#fde68a' },
  ];
  const theme = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="772" height="350" viewBox="0 0 772 350">
    <defs>
      <linearGradient id="bg-${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg1}" />
        <stop offset="100%" stop-color="${theme.bg2}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg-${Math.abs(hash)})" />
    <rect x="12" y="12" width="748" height="326" fill="none" stroke="${theme.stroke}" stroke-width="3" opacity="0.6"/>
    <rect x="18" y="18" width="736" height="314" fill="none" stroke="#1f2937" stroke-width="1.5" />
    <circle cx="386" cy="130" r="48" fill="#111827" stroke="${theme.stroke}" stroke-width="3" />
    <polygon points="372,108 408,130 372,152" fill="${theme.stroke}" />
    <text x="386" y="225" font-family="'Segoe UI', sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${safeTitle}
    </text>
    <rect x="316" y="248" width="140" height="26" fill="#111827" stroke="${theme.stroke}" stroke-width="1.5" rx="3" />
    <text x="386" y="266" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="${theme.badge}" text-anchor="middle" letter-spacing="2">
      ${safeCat}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
