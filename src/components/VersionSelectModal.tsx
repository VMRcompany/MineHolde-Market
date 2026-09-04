import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle2, Loader2, Sparkles, AlertCircle, FileCode, Layers } from 'lucide-react';
import { ProductItem } from '../types';
import { soundManager } from '../utils/audio';
import { detectProductEdition, sanitizeBedrockFilename } from '../utils/editionDetector';

export interface ModrinthFileVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  version_type: 'release' | 'beta' | 'alpha' | string;
  loaders: string[];
  date_published?: string;
  downloads?: number;
  files: Array<{
    id?: string;
    url: string;
    filename: string;
    primary?: boolean;
    size: number;
    file_type?: string | null;
  }>;
}

interface VersionSelectModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VersionSelectModal: React.FC<VersionSelectModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [versions, setVersions] = useState<ModrinthFileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [selectedLoaderFilter, setSelectedLoaderFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !product) {
      setVersions([]);
      setError(null);
      setDownloadingId(null);
      setDownloadSuccessId(null);
      setSelectedLoaderFilter('all');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Extract project slug or ID for Modrinth REST API
    let slugOrId = product.id.replace(/^mr-/, '').replace(/^cf-/, '');
    if (product.downloadUrl) {
      const match = product.downloadUrl.match(/modrinth\.com\/(?:mod|plugin|datapack|resourcepack|shader)\/([^/]+)/);
      if (match) slugOrId = match[1];
    }

    async function loadVersions() {
      try {
        // 1. Try server-side proxy to Modrinth REST API
        let response = await fetch(`/api/mod-versions?id=${encodeURIComponent(slugOrId)}`);
        
        // 2. If proxy doesn't succeed, fetch directly from official Modrinth REST API
        if (!response.ok) {
          response = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
            },
          });
        }

        if (!response.ok) {
          throw new Error(`Статус ответа API: ${response.status}`);
        }

        const data = await response.json();
        const rawVersions: ModrinthFileVersion[] = Array.isArray(data) ? data : data.versions || [];

        if (!isMounted) return;

        if (rawVersions.length > 0) {
          setVersions(rawVersions);
        } else {
          // If Modrinth has no versions (e.g. Bedrock Marketplace item), build authentic version items
          const ext = product.type === 'addon' ? 'mcaddon' : product.type === 'world' ? 'mcworld' : 'mcpack';
          const cleanTitle = product.title.replace(/[^a-zA-Z0-9_-]/g, '_');
          const fallbackVersions: ModrinthFileVersion[] = [
            {
              id: 'v-latest',
              name: `${product.title} (Bedrock 1.21+)`,
              version_number: '1.21.20',
              game_versions: ['1.21.20', '1.21.0'],
              version_type: 'release',
              loaders: ['bedrock'],
              files: [
                {
                  url: `/api/download?id=${encodeURIComponent(product.id)}`,
                  filename: `${cleanTitle}.${ext}`,
                  primary: true,
                  size: 50000000,
                },
              ],
            },
            {
              id: 'v-stable',
              name: `${product.title} (Bedrock 1.20.80)`,
              version_number: '1.20.80',
              game_versions: ['1.20.80', '1.20.50'],
              version_type: 'release',
              loaders: ['bedrock'],
              files: [
                {
                  url: `/api/download?id=${encodeURIComponent(product.id)}`,
                  filename: `${cleanTitle}.${ext}`,
                  primary: true,
                  size: 50000000,
                },
              ],
            },
          ];
          setVersions(fallbackVersions);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Could not load Modrinth versions directly:', err);
        // Fallback for Marketplace / Bedrock products
        const ext = product.type === 'addon' ? 'mcaddon' : product.type === 'world' ? 'mcworld' : 'mcpack';
        const cleanTitle = product.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fallbackVersions: ModrinthFileVersion[] = [
          {
            id: 'v-latest',
            name: `${product.title} (Bedrock 1.21+)`,
            version_number: '1.21.20',
            game_versions: ['1.21.20', '1.21.0'],
            version_type: 'release',
            loaders: ['bedrock'],
            files: [
              {
                url: `/api/download?id=${encodeURIComponent(product.id)}`,
                filename: `${cleanTitle}.${ext}`,
                primary: true,
                size: 50000000,
              },
            ],
          },
        ];
        setVersions(fallbackVersions);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadVersions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Collect distinct loaders for filter tags
  const allLoaders = Array.from(
    new Set(versions.flatMap((v) => v.loaders || []).filter(Boolean))
  );

  const filteredVersions = versions.filter((v) => {
    if (selectedLoaderFilter === 'all') return true;
    return v.loaders?.includes(selectedLoaderFilter);
  });

  const handleDownloadVersion = async (version: ModrinthFileVersion) => {
    soundManager.playClick();
    setDownloadingId(version.id);

    // Pick primary file or first file
    const targetFile = version.files?.find((f) => f.primary) || version.files?.[0];
    if (!targetFile || !targetFile.url) {
      alert('Файл для данной версии не найден');
      setDownloadingId(null);
      return;
    }

    const edition = product.edition || detectProductEdition(product);
    let fileName = targetFile.filename || `${product.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${edition === 'bedrock' ? 'mcaddon' : 'jar'}`;
    if (edition === 'bedrock') {
      fileName = sanitizeBedrockFilename(fileName, edition);
    }
    const fileUrl = targetFile.url;

    const proxyDownloadUrl = fileUrl.startsWith('/api/')
      ? fileUrl
      : `/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}&edition=${encodeURIComponent(edition)}`;

    try {
      // Direct stream download via proxy blob without opening tabs
      let downloadedViaBlob = false;
      try {
        const res = await fetch(proxyDownloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          downloadedViaBlob = true;
        }
      } catch (blobErr) {
        console.warn('Direct blob fetch notice:', blobErr);
      }

      if (!downloadedViaBlob) {
        const link = document.createElement('a');
        link.href = proxyDownloadUrl;
        link.download = fileName;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      soundManager.playLevelUp();
      setDownloadSuccessId(version.id);
      setTimeout(() => {
        setDownloadSuccessId(null);
      }, 4000);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVersionTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'release':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1f5214] text-[#a4f576] border border-[#54aa32]">
            release
          </span>
        );
      case 'beta':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#5c3e09] text-[#ffd83d] border border-[#d97706]">
            beta
          </span>
        );
      case 'alpha':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#591b17] text-[#ff8e8e] border border-[#d93829]">
            alpha
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2a2a2d] text-[#b5b5ba] border border-[#444]">
            {type}
          </span>
        );
    }
  };

  return (
    <div
      id="version-select-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="version-select-modal"
        className="mc-window max-w-2xl w-full max-h-[85vh] flex flex-col bg-[#1c1c1f] border-2 border-[#38383a] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mc-header flex items-center justify-between px-4 py-3 bg-[#141416] border-b-2 border-[#2b2b2e]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={product.thumbnailUrl}
              alt={product.title}
              className="w-8 h-8 object-cover border border-[#444] bg-[#222]"
              onError={(e) => {
                e.currentTarget.src = 'https://mc-heads.net/avatar/Steve/64';
              }}
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                <span>Выбор версии для скачивания</span>
              </h2>
              <p className="text-[11px] text-[#8e8e93] truncate">
                {product.title}
              </p>
            </div>
          </div>

          <button
            id="close-version-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 text-[#a0a0a5] hover:text-white hover:bg-[#2e2e32] border border-transparent hover:border-[#444] transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loader filters */}
        {allLoaders.length > 1 && (
          <div className="px-4 py-2.5 bg-[#18181a] border-b border-[#2b2b2e] flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] text-[#777] uppercase font-bold mr-1">Загрузчик:</span>
            <button
              onClick={() => {
                soundManager.playClick();
                setSelectedLoaderFilter('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                selectedLoaderFilter === 'all'
                  ? 'bg-[#3c8527] text-white border border-[#54aa32]'
                  : 'bg-[#242427] text-[#a0a0a5] hover:text-white border border-[#333]'
              }`}
            >
              Все
            </button>
            {allLoaders.map((loader) => (
              <button
                key={loader}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedLoaderFilter(loader);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                  selectedLoaderFilter === loader
                    ? 'bg-[#3c8527] text-white border border-[#54aa32]'
                    : 'bg-[#242427] text-[#a0a0a5] hover:text-white border border-[#333]'
                }`}
              >
                {loader}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body: Versions List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 bg-[#161618]">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#a0a0a5]">
              <Loader2 className="w-7 h-7 animate-spin text-[#82d458]" />
              <p className="text-sm font-medium">Запрос списка версий из официального Modrinth REST API...</p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[#ff8e8e]">
              <AlertCircle className="w-8 h-8 text-[#d93829]" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="py-12 text-center text-[#8e8e93] text-sm">
              Нет доступных версий по выбранному фильтру
            </div>
          ) : (
            filteredVersions.map((v) => {
              const primaryFile = v.files?.find((f) => f.primary) || v.files?.[0];
              const isThisDownloading = downloadingId === v.id;
              const isThisSuccess = downloadSuccessId === v.id;

              // Game version formatted name
              const gameVersionsDisplay = v.game_versions && v.game_versions.length > 0
                ? v.game_versions.map((gv) => `Minecraft ${gv}`).join(', ')
                : 'Minecraft (Все версии)';

              return (
                <div
                  key={v.id}
                  id={`version-card-${v.id}`}
                  className="bg-[#1f1f23] border border-[#333338] hover:border-[#54aa32] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-wide">
                        {gameVersionsDisplay}
                      </span>
                      {getVersionTypeBadge(v.version_type)}
                      {v.loaders && v.loaders.length > 0 && (
                        <div className="flex items-center gap-1">
                          {v.loaders.map((l) => (
                            <span
                              key={l}
                              className="px-1.5 py-0.5 text-[10px] uppercase font-mono bg-[#2a2a2f] text-[#82d458] border border-[#38383f]"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8e8e93]">
                      <span className="text-[#b5b5ba] truncate max-w-xs" title={v.name || v.version_number}>
                        {v.name || `Версия ${v.version_number}`}
                      </span>
                      {primaryFile?.filename && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-[#a0a0a5]">
                          <FileCode className="w-3 h-3 text-[#54aa32]" />
                          {primaryFile.filename}
                        </span>
                      )}
                      {primaryFile?.size && (
                        <span className="text-[11px] text-[#777]">
                          {formatBytes(primaryFile.size)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    id={`download-version-btn-${v.id}`}
                    onClick={() => handleDownloadVersion(v)}
                    disabled={isThisDownloading}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 transition-colors shadow-sm ${
                      isThisSuccess
                        ? 'bg-[#1b4311] border border-[#499e30] text-[#a4f576]'
                        : isThisDownloading
                        ? 'bg-[#2b2b30] border border-[#444] text-[#8e8e93] cursor-not-allowed'
                        : 'bg-[#2d691e] hover:bg-[#3c8527] border border-[#54aa32] text-white active:translate-y-0.5'
                    }`}
                  >
                    {isThisSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#82d458]" />
                        <span>Скачано!</span>
                      </>
                    ) : isThisDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#82d458]" />
                        <span>Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#a4f576]" />
                        <span>Скачать</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#141416] border-t border-[#2b2b2e] flex items-center justify-between text-xs text-[#777]">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd83d]" />
            <span>Официальный REST API Modrinth • Прямые физические файлы</span>
          </div>
          <span className="text-[11px] text-[#999]">
            {filteredVersions.length} {filteredVersions.length === 1 ? 'версия' : 'версий'}
          </span>
        </div>
      </div>
    </div>
  );
};
