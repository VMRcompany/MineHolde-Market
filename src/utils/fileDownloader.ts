import { ProductItem } from '../types';
import { soundManager } from './audio';
import { detectProductEdition, sanitizeBedrockFilename } from './editionDetector';

/**
 * Returns the Minecraft file extension for the given item type.
 */
export function getMinecraftFileExtension(type: string): 'mcaddon' | 'mcworld' | 'mcpack' | 'mctemplate' | 'jar' {
  const t = type.toLowerCase();
  if (t === 'addon' || t.includes('addon')) {
    return 'mcaddon';
  }
  if (
    t === 'world' ||
    t === 'mini_game_world' ||
    t === 'adventure_world' ||
    t === 'survival_spawn_world' ||
    t === 'mashup'
  ) {
    return 'mcworld';
  }
  if (t === 'template' || t.includes('template')) {
    return 'mctemplate';
  }
  return 'mcpack';
}

/**
 * Interface representing resolved file metadata from REST API
 */
interface ResolvedRestApiFile {
  url: string;
  filename: string;
  size?: number | string;
  source?: string;
  version?: string;
}

/**
 * Resolves the real original file directly from REST API databases (Modrinth, CFWidget, Marketplace).
 * No synthetic file generation - all files are authentic binaries from the upstream REST API.
 */
export async function resolveRestApiFile(product: ProductItem): Promise<ResolvedRestApiFile> {
  const cleanId = String(product.id || '').trim();
  const edition = product.edition || detectProductEdition(product);
  const fallbackExt = edition === 'java' ? 'jar' : getMinecraftFileExtension(product.type);
  const cleanTitle = (product.title || 'minecraft_item')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_');
  let defaultFilename = `${cleanTitle}.${fallbackExt}`;
  if (edition === 'bedrock') {
    defaultFilename = sanitizeBedrockFilename(defaultFilename, edition);
  }

  // 1. Check server-side REST API database file resolver
  try {
    const res = await fetch(`/api/product-file?id=${encodeURIComponent(cleanId)}&edition=${encodeURIComponent(edition)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        let fn = data.filename || defaultFilename;
        if (edition === 'bedrock') fn = sanitizeBedrockFilename(fn, edition);
        return {
          url: data.url,
          filename: fn,
          size: data.size,
          source: 'MineHolde Market',
          version: data.version,
        };
      }
    }
  } catch (err) {
    console.warn('Backend REST API file resolver notice:', err);
  }

  // 2. Direct Modrinth REST API version resolution
  if (cleanId.startsWith('mr-') || product.downloadUrl?.includes('modrinth.com')) {
    const slugOrId = cleanId.replace(/^mr-/, '') || cleanId;
    try {
      const mrRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
        headers: { Accept: 'application/json' },
      });
      if (mrRes.ok) {
        const versions = await mrRes.json();
        if (Array.isArray(versions) && versions.length > 0) {
          const latest = versions[0];
          const primaryFile = latest.files?.find((f: any) => f.primary) || latest.files?.[0];
          if (primaryFile?.url) {
            let fn = primaryFile.filename || `${slugOrId}.${edition === 'bedrock' ? 'mcaddon' : 'jar'}`;
            if (edition === 'bedrock') fn = sanitizeBedrockFilename(fn, edition);
            return {
              url: primaryFile.url,
              filename: fn,
              size: primaryFile.size,
              source: 'MineHolde Market',
              version: latest.version_number,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Modrinth version resolution notice:', e);
    }
  }

  // 3. Direct CFWidget / CurseForge REST API file resolution
  if (cleanId.startsWith('cf-') || product.downloadUrl?.includes('curseforge.com')) {
    const slugOrId = cleanId.replace(/^cf-/, '');
    try {
      const cfRes = await fetch(`https://api.cfwidget.com/minecraft/mc-mods/${encodeURIComponent(slugOrId)}`, {
        headers: { Accept: 'application/json' },
      });
      if (cfRes.ok) {
        const data = await cfRes.json();
        const latestFile = Array.isArray(data.files) && data.files.length > 0 ? data.files[0] : null;
        const directUrl = data.download?.url || latestFile?.url || product.downloadUrl;
        if (directUrl) {
          let fn = latestFile?.name || `${slugOrId}.jar`;
          if (edition === 'bedrock') fn = sanitizeBedrockFilename(fn, edition);
          return {
            url: directUrl,
            filename: fn,
            size: latestFile?.filesize,
            source: 'MineHolde Market',
          };
        }
      }
    } catch (e) {
      console.warn('CFWidget version resolution notice:', e);
    }
  }

  // 4. Product pre-bound direct download URL from REST API
  if (product.downloadUrl && (product.downloadUrl.startsWith('http://') || product.downloadUrl.startsWith('https://'))) {
    let inferredFilename = defaultFilename;
    try {
      const parsedUrl = new URL(product.downloadUrl);
      const pathname = parsedUrl.pathname;
      const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (lastSegment && (lastSegment.includes('.') || lastSegment.length > 3)) {
        inferredFilename = decodeURIComponent(lastSegment);
      }
    } catch {}

    if (edition === 'bedrock') {
      inferredFilename = sanitizeBedrockFilename(inferredFilename, edition);
    }

    return {
      url: product.downloadUrl,
      filename: inferredFilename,
      size: product.downloadSize,
      source: 'MineHolde Market',
    };
  }

  // 5. Ultimate fallback to standard REST API file proxy
  const finalDefaultName = edition === 'bedrock' ? sanitizeBedrockFilename(defaultFilename, edition) : defaultFilename;
  return {
    url: `/api/download?url=${encodeURIComponent(product.downloadUrl || '')}&filename=${encodeURIComponent(finalDefaultName)}&edition=${encodeURIComponent(edition)}`,
    filename: finalDefaultName,
    size: product.downloadSize,
    source: 'MineHolde Market',
  };
}

/**
 * Downloads a real, authentic Minecraft file strictly from the REST API database.
 * No synthetic files are generated. All binaries come from official REST API sources.
 * Never opens new tabs or windows - streams directly in the current session.
 */
export async function downloadMinecraftProduct(
  product: ProductItem,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    onProgress?.('Загрузка...');
    soundManager.playClick();

    const edition = product.edition || detectProductEdition(product);

    // 1. Resolve authentic file from the REST API database
    const fileInfo = await resolveRestApiFile(product);
    let fileName = fileInfo.filename;
    const fileUrl = fileInfo.url;

    // Critical fix: Ensure Bedrock files never download as raw .zip
    if (edition === 'bedrock') {
      fileName = sanitizeBedrockFilename(fileName, edition);
    }

    onProgress?.('Загрузка...');

    // 2. Determine download endpoint through internal proxy
    const directDownloadUrl = fileUrl.startsWith('/api/')
      ? (fileUrl.includes('edition=') ? fileUrl : `${fileUrl}&edition=${encodeURIComponent(edition)}`)
      : `/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}&edition=${encodeURIComponent(edition)}`;

    let downloadedViaBlob = false;

    // Direct fetch blob works seamlessly with our internal proxy
    try {
      const res = await fetch(directDownloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        triggerBrowserDownload(blob, fileName);
        downloadedViaBlob = true;
      }
    } catch (blobErr) {
      console.warn('Direct blob fetch notice, triggering in-page download:', blobErr);
    }

    // Direct in-page browser download trigger without target="_blank"
    if (!downloadedViaBlob) {
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = directDownloadUrl;
      downloadAnchor.download = fileName;
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    }

    soundManager.playLevelUp();
    onProgress?.(`Файл ${fileName} успешно загружен!`);
    return true;
  } catch (error) {
    console.error('REST API download error:', error);
    onProgress?.('Ошибка при загрузке файла.');
    return false;
  }
}

/**
 * Triggers instant client-side download in the browser
 */
function triggerBrowserDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = blobUrl;
  downloadAnchor.download = fileName;
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 5000);
}
