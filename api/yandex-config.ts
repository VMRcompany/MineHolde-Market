interface ApiRequest {
  method?: string;
  url?: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
  setHeader: (key: string, value: string | number) => void;
}

// Yandex ID OAuth configuration for Vercel Serverless Functions & Firebase Auth
export const YANDEX_AUTH_CONFIG = {
  clientId: process.env.YANDEX_CLIENT_ID || '72241f9c1bc64f65b650ae8a5140b9b5',
  clientSecret: process.env.YANDEX_CLIENT_SECRET || '52a808823e31474b81323a91295b396c',
  providerId: 'oidc.yandex',
  issuer: 'https://oauth.yandex.ru',
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    providerId: YANDEX_AUTH_CONFIG.providerId,
    clientId: YANDEX_AUTH_CONFIG.clientId,
    configured: true,
  });
}
