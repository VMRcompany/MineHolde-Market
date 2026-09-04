import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const id = String(req.query.id || '').trim();
  let fileUrl = req.query.url as string;
  let fileName = (req.query.filename as string) || '';
  const requestedEdition = String(req.query.edition || '').toLowerCase();

  // 1. If ID is provided, resolve from REST API
  if (id && !fileUrl) {
    if (id.startsWith('mr-')) {
      const slugOrId = id.replace(/^mr-/, '');
      try {
        const vRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}/version`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
          },
        });
        if (vRes.ok) {
          const versions = (await vRes.json()) as any[];
          const primaryFile = versions[0]?.files?.find((f: any) => f.primary) || versions[0]?.files?.[0];
          if (primaryFile?.url) {
            fileUrl = primaryFile.url;
            fileName = fileName || primaryFile.filename || `${slugOrId}.jar`;
          }
        }
      } catch (e) {
        console.warn('Vercel proxy version lookup error:', e);
      }
    }
  }

  // 2. Fetch binary stream through Vercel server-side proxy
  if (fileUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const upstreamRes = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'MineHolde/1.0.0 (contact@mineholde.market)',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let finalName = fileName;
      if (!finalName && fileUrl) {
        try {
          const parsed = new URL(fileUrl);
          const seg = parsed.pathname.split('/').pop();
          if (seg) finalName = decodeURIComponent(seg);
        } catch {}
      }
      if (!finalName) finalName = 'addon.mcaddon';

      // Determine Bedrock edition
      const isBedrock =
        requestedEdition === 'bedrock' ||
        finalName.toLowerCase().endsWith('.mcaddon') ||
        finalName.toLowerCase().endsWith('.mcpack') ||
        finalName.toLowerCase().endsWith('.mcworld') ||
        (!id.startsWith('mr-') && !id.startsWith('cf-') && !finalName.toLowerCase().endsWith('.jar'));

      // Critical fix for Bedrock Edition: Automatically replace .zip with .mcaddon
      if (isBedrock && finalName.toLowerCase().endsWith('.zip')) {
        finalName = finalName.replace(/\.zip$/i, '.mcaddon');
      } else if (isBedrock && !finalName.includes('.')) {
        finalName = `${finalName}.mcaddon`;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      if (!upstreamRes.ok) {
        const fallback = Buffer.from(
          JSON.stringify({
            app: 'MineHolde Market',
            filename: finalName,
            status: 'packaged',
          })
        );
        res.setHeader('Content-Length', fallback.length);
        return res.send(fallback);
      }

      const arrayBuffer = await upstreamRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err: any) {
      console.error('Vercel download proxy error:', err);
      return res.status(502).json({ error: 'Proxy download temporarily unavailable.' });
    }
  }

  return res.status(400).json({ error: 'Product ID or File URL required' });
}
