import { PromotionCampaign } from '../types';

export const PROMOTIONS: PromotionCampaign[] = [
  {
    id: 'promo-summer-sale-2026',
    title: 'Marketplace Summer Super Sale',
    subtitle: 'Скидки до 50% на легендарные миры Bedrock, скин-паки и официальные аддоны от 2017 до 2026 года!',
    badge: 'СУПЕРРАСПРОДАЖА • ДО -50%',
    bannerImage: 'https://launchercontent.mojang.com/v2/images/MinecraftSummerSaleLauncher772x350.png',
    discountUpTo: 50,
    expiresInDays: 5,
    featuredProductIds: [
      'item-transformers-addon',
      'item-hello-kitty-addon',
      'item-spongebob-biomes',
      'item-stranger-things',
    ],
  },
  {
    id: 'promo-free-gifts',
    title: 'Официальные подарки Minecraft',
    subtitle: 'Заберите эксклюзивные миры за 0 Minecoins, юбилейные плащи и праздничные скины!',
    badge: '100% БЕСПЛАТНО',
    bannerImage: 'https://launchercontent.mojang.com/v2/images/MinecraftCommonCapeLauncher772x350.png',
    discountUpTo: 100,
    expiresInDays: 14,
    featuredProductIds: [
      'item-15th-anniversary-world',
      'item-good-trouble-world',
      'item-cybersafe-world',
      'item-common-cape-gift',
    ],
  },
  {
    id: 'promo-spotlight-spark',
    title: 'В центре внимания: Spark Universe & Noxcrew',
    subtitle: 'Погрузитесь в захватывающие приключения с кастомным транспортом, магией и боссами!',
    badge: 'ВЫБОР РЕДАКЦИИ',
    bannerImage: 'https://launchercontent.mojang.com/v2/images/MCMCMSpotlightLauncher772x350.png',
    discountUpTo: 33,
    expiresInDays: 7,
    featuredProductIds: [
      'item-magic-spells-addon',
      'item-dragonfire-3-world',
      'item-cyberpunk-2099-addon-2025',
      'item-spark-pets-addon',
    ],
  },
  {
    id: 'promo-addons-revolution',
    title: 'Официальные Add-Ons нового поколения',
    subtitle: 'Модифицируйте любой существующий или новый мир Bedrock без сторонних лаунчеров!',
    badge: 'NEW ADD-ONS 2024-2026',
    bannerImage: 'https://launchercontent.mojang.com/v2/images/TinyTakeoverMiniManiaLauncher772x350.png',
    discountUpTo: 25,
    expiresInDays: 9,
    featuredProductIds: [
      'item-spark-portals-addon',
      'item-mutant-creatures-addon',
      'item-furniture-plus-addon',
      'item-backpacks-plus-addon',
    ],
  },
];
