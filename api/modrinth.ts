import type { Request, Response } from 'express';

// Vercel Serverless Function & Express compatible handler for Modrinth REST API
export default async function handler(req: Request, res: Response) {
  const query = (req.query.query || req.query.searchFilter || req.query.term || '') as string;
  const index = (req.query.index || req.query.sort || 'newest') as string;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
  const facets = req.query.facets as string || JSON.stringify([['project_type:mod']]);

  try {
    const queryParams = new URLSearchParams({
      index,
      limit: String(limit),
      offset: String(offset),
      facets,
    });
    if (query) {
      queryParams.set('query', query);
    }

    const upstreamUrl = `https://api.modrinth.com/v2/search?${queryParams.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      const hits = Array.isArray(data.hits) ? data.hits : [];

      if (hits.length > 0) {
        // Collect latest_version IDs for batch resolution of direct file download links
        const versionIds = hits
          .map((h: any) => h.latest_version)
          .filter((v: any) => typeof v === 'string' && v.length > 0);

        const versionFileMap = new Map<string, { url: string; filename: string; size: number }>();

        if (versionIds.length > 0) {
          try {
            const vController = new AbortController();
            const vTimeout = setTimeout(() => vController.abort(), 4000);
            const vRes = await fetch(
              `https://api.modrinth.com/v2/versions?ids=${encodeURIComponent(JSON.stringify(versionIds.slice(0, 30)))}`,
              {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
                },
                signal: vController.signal,
              }
            );
            clearTimeout(vTimeout);

            if (vRes.ok) {
              const vData = await vRes.json();
              if (Array.isArray(vData)) {
                for (const ver of vData) {
                  if (ver.id && Array.isArray(ver.files) && ver.files.length > 0) {
                    const primaryFile = ver.files.find((f: any) => f.primary) || ver.files[0];
                    if (primaryFile?.url) {
                      versionFileMap.set(ver.id, {
                        url: primaryFile.url,
                        filename: primaryFile.filename || '',
                        size: primaryFile.size || 0,
                      });
                    }
                  }
                }
              }
            }
          } catch {
            // Non-blocking version resolution
          }
        }

        // Attach direct download file URLs and ensure icon_url is strictly bound to project_id
        const enrichedHits = hits.map((hit: any) => {
          const pId = hit.project_id || hit.id;
          const iconUrl = hit.icon_url || (pId ? `https://cdn.modrinth.com/data/${pId}/icon.png` : '');
          const fileInfo = hit.latest_version ? versionFileMap.get(hit.latest_version) : undefined;

          return {
            ...hit,
            icon_url: iconUrl,
            downloadUrl: fileInfo?.url || (hit.latest_version ? `https://cdn.modrinth.com/data/${pId}/versions/${hit.latest_version}/${hit.slug || pId}.jar` : `https://modrinth.com/mod/${hit.slug || pId}`),
            downloadFilename: fileInfo?.filename,
            downloadSize: fileInfo?.size ? `${(fileInfo.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
          };
        });

        return res.status(200).json({
          hits: enrichedHits,
          total_hits: data.total_hits || enrichedHits.length,
          limit,
          offset,
        });
      }
    }
  } catch (err) {
    console.warn('Modrinth upstream fetch error:', err);
  }

  // Curated fallback
  const fallbackHits = [
    {
      project_id: 'AANobbMI',
      slug: 'sodium',
      title: 'Sodium',
      author: 'jellysquid3',
      description: 'Революционный движок рендеринга для Minecraft, многократно увеличивающий FPS и оптимизирующий графику.',
      icon_url: 'https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp',
      downloads: 218962866,
      follows: 180000,
      versions: ['1.21.4'],
      date_created: '2026-02-20T12:00:00.000Z',
      latest_version: 'gQDMcWww',
      downloadUrl: 'https://cdn.modrinth.com/data/AANobbMI/versions/gQDMcWww/sodium-neoforge-0.9.2-beta.1%2Bmc26.2.jar',
      project_type: 'mod',
      categories: ['optimization'],
    },
    {
      project_id: 'YL57xq9U',
      slug: 'iris',
      title: 'Iris Shaders',
      author: 'coderbot',
      description: 'Современный шейдерный мод с открытым исходным кодом, обеспечивающий максимальную производительность в связке с Sodium.',
      icon_url: 'https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp',
      downloads: 170437712,
      follows: 140000,
      versions: ['1.21.4'],
      date_created: '2026-02-18T12:00:00.000Z',
      latest_version: 'iris-latest',
      downloadUrl: 'https://cdn.modrinth.com/data/YL57xq9U/versions/iris-1.8.8.jar',
      project_type: 'mod',
      categories: ['shaders'],
    },
    {
      project_id: 'P7dR8mSH',
      slug: 'fabric-api',
      title: 'Fabric API',
      author: 'modmuss50',
      description: 'Базовая библиотека и основной слой совместимости для работы модов на Fabric.',
      icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
      downloads: 246419932,
      follows: 210000,
      versions: ['1.21.4'],
      date_created: '2026-02-26T12:00:00.000Z',
      latest_version: 'fab-latest',
      downloadUrl: 'https://cdn.modrinth.com/data/P7dR8mSH/versions/fabric-api-0.108.0+1.21.4.jar',
      project_type: 'mod',
      categories: ['library'],
    },
    {
      project_id: 'uXXizFIs',
      slug: 'ferrite-core',
      title: 'FerriteCore',
      author: 'malte0811',
      description: 'Существенное снижение потребления оперативной памяти Minecraft (RAM) до 40-50%.',
      icon_url: 'https://cdn.modrinth.com/data/uXXizFIs/222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp',
      downloads: 146449243,
      follows: 95000,
      versions: ['1.21.4'],
      date_created: '2026-01-10T12:00:00.000Z',
      latest_version: 'fc-latest',
      downloadUrl: 'https://cdn.modrinth.com/data/uXXizFIs/versions/ferritecore-7.0.0.jar',
      project_type: 'mod',
      categories: ['optimization'],
    },
    {
      project_id: 'gvQqBUqZ',
      slug: 'lithium',
      title: 'Lithium',
      author: 'jellysquid3',
      description: 'Оптимизация физики, AI мобов, тиков мира и спавна сущностей. Повышает стабильность 20 TPS.',
      icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/bcc8686c13af0143adf4285d741256af824f70b7_96.webp',
      downloads: 123983417,
      follows: 88000,
      versions: ['1.21.4'],
      date_created: '2026-01-20T12:00:00.000Z',
      latest_version: 'lit-latest',
      downloadUrl: 'https://cdn.modrinth.com/data/gvQqBUqZ/versions/lithium-0.14.0.jar',
      project_type: 'mod',
      categories: ['optimization'],
    },
    {
      project_id: 'Ms6IzmIe',
      slug: 'foliant',
      title: 'Foliant',
      author: 'chifir4ik',
      description: 'Серверно-клиентская синхронизация профилей и интерактивная книга знаний.',
      icon_url: 'https://cdn.modrinth.com/data/Ms6IzmIe/13a343d34acb9cd5c01466905bc780caa06c3f1a_96.webp',
      downloads: 320,
      follows: 15,
      versions: ['1.21.11'],
      date_created: '2026-09-03T11:56:42.524Z',
      latest_version: 'pfxB7FZn',
      downloadUrl: 'https://cdn.modrinth.com/data/Ms6IzmIe/versions/pfxB7FZn/FoliantSync-1.1.jar',
      project_type: 'mod',
      categories: ['social', 'fabric'],
    },
  ];

  return res.status(200).json({
    hits: fallbackHits,
    total_hits: fallbackHits.length,
    limit,
    offset,
  });
}
