export type ItemType = 
  | 'skinpack'
  | 'world'
  | 'mashup'
  | 'resourcepack'
  | 'texturepack'
  | 'addon'
  | 'survival_spawn_world'
  | 'mini_game_world'
  | 'adventure_world'
  | 'bundle'
  | 'all';

export interface SkinPreview {
  id: string;
  name: string;
  textureUrl: string;
  capeUrl?: string;
  model: 'steve' | 'alex';
  isAnimated?: boolean;
}

export interface CreatorInfo {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  totalProducts?: number;
}

export interface ProductItem {
  id: string;
  uuid: string; // packIdentity
  title: string;
  description: string;
  shortDescription: string;
  type: ItemType;
  category: string;
  creator: CreatorInfo;
  price: number; // in Minecoins (0 = free)
  salePrice?: number; // if on sale
  discountPercent?: number;
  isSale?: boolean;
  isFree?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  rating: number; // 1-5
  ratingsCount: number;
  downloadSize: string; // e.g. "45.2 MB"
  releaseDate: string;
  updatedDate: string;
  version: string;
  thumbnailUrl: string;
  bannerUrl: string;
  screenshots: string[];
  media?: Array<{
    type: 'cover' | 'screenshot' | string;
    label: string;
    url: string;
    order: number;
  }>;
  tags: string[];
  keyFeatures: string[];
  skins?: SkinPreview[];
  worldFeatures?: {
    customMobs?: number;
    customVehicles?: number;
    customMusic?: boolean;
    questLines?: number;
    multiplayerSupport?: boolean;
  };
}

export interface AutoSuggestItem {
  id: string;
  title: string;
  type: string;
  creator: string;
  thumbnailUrl: string;
  price: number;
}

export interface PromotionCampaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  bannerImage: string;
  discountUpTo: number;
  targetCategory?: string;
  targetType?: ItemType;
  expiresInDays: number;
  featuredProductIds: string[];
}

export interface SaleProductDetail {
  id: string;
  title: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  saleStartDate: string;
  saleEndDate: string;
  bannerUrl: string;
}

export interface ApiRequestLog {
  timestamp: string;
  endpoint: string;
  params: Record<string, any>;
  status: number;
  durationMs: number;
  response: any;
}

export interface PaginatedProductsResult {
  products: ProductItem[];
  totalCount: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  type?: string;
  category?: string;
}
