import { ProductItem } from '../types';

export type MinecraftEdition = 'java' | 'bedrock';

/**
 * Universal edition detection conforming to the rule:
 * 1. If available files contain .jar -> 'java'
 * 2. If available files contain .mcpack, .mcaddon, .mcworld, or .zip (for Bedrock/Pocket Edition) -> 'bedrock'
 * 3. Lower source (Minecraft Marketplace API) is 100% automatically 'bedrock'
 */
export function detectProductEdition(item: any): MinecraftEdition {
  if (!item) return 'bedrock';

  // 1. Lower source (Minecraft Marketplace API) is 100% Bedrock Edition
  const id = String(item.id || item.productId || item.uuid || '');
  const isMarketplace =
    (!id.startsWith('mr-') && !id.startsWith('cf-') && !id.startsWith('mod-')) ||
    item.source === 'marketplace_api' ||
    item.source === 'live_upstream' ||
    item.type === 'mashup' ||
    item.type === 'skinpack';

  if (isMarketplace) {
    return 'bedrock';
  }

  // 2. Inspect available files
  const fileCandidates: string[] = [];

  if (Array.isArray(item.files)) {
    for (const f of item.files) {
      if (typeof f === 'string') fileCandidates.push(f);
      else if (f) {
        if (f.filename) fileCandidates.push(String(f.filename));
        if (f.name) fileCandidates.push(String(f.name));
        if (f.url) fileCandidates.push(String(f.url));
      }
    }
  }

  if (Array.isArray(item.versions)) {
    for (const v of item.versions) {
      if (Array.isArray(v.files)) {
        for (const f of v.files) {
          if (f?.filename) fileCandidates.push(String(f.filename));
          if (f?.name) fileCandidates.push(String(f.name));
          if (f?.url) fileCandidates.push(String(f.url));
        }
      }
    }
  }

  if (item.downloadFilename) fileCandidates.push(String(item.downloadFilename));
  if (item.filename) fileCandidates.push(String(item.filename));
  if (item.downloadUrl) fileCandidates.push(String(item.downloadUrl));

  let hasJar = false;
  let hasBedrockExt = false;

  for (const candidate of fileCandidates) {
    const lower = candidate.toLowerCase();
    if (lower.endsWith('.jar') || lower.includes('.jar?') || lower.includes('.jar#') || lower.includes('.jar/')) {
      hasJar = true;
    }
    if (
      lower.endsWith('.mcpack') ||
      lower.endsWith('.mcaddon') ||
      lower.endsWith('.mcworld') ||
      lower.endsWith('.zip') ||
      lower.includes('.mcpack?') ||
      lower.includes('.mcaddon?') ||
      lower.includes('.mcworld?') ||
      lower.includes('.zip?')
    ) {
      hasBedrockExt = true;
    }
  }

  // 3. Inspect loaders / environment
  const loaders = Array.isArray(item.loaders) ? item.loaders.map((l: any) => String(l).toLowerCase()) : [];
  if (loaders.includes('bedrock')) {
    return 'bedrock';
  }
  if (loaders.some((l: string) => ['fabric', 'forge', 'neoforge', 'quilt', 'rift', 'liteloader'].includes(l))) {
    return 'java';
  }

  if (hasBedrockExt) {
    return 'bedrock';
  }
  if (hasJar) {
    return 'java';
  }

  // Default for Modrinth/CFWidget mods without explicit file list is Java
  if (id.startsWith('mr-') || id.startsWith('cf-') || id.startsWith('mod-')) {
    return 'java';
  }

  return 'bedrock';
}

/**
 * Automatically converts .zip to .mcaddon for Bedrock Edition files.
 * Minecraft Bedrock cannot execute raw .zip without manual renaming.
 */
export function sanitizeBedrockFilename(filename: string, edition?: MinecraftEdition): string {
  if (!filename) return 'addon.mcaddon';
  if (edition === 'bedrock' || !edition) {
    if (filename.toLowerCase().endsWith('.zip')) {
      return filename.replace(/\.zip$/i, '.mcaddon');
    }
  }
  return filename;
}
