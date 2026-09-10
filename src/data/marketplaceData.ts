import { ProductItem } from '../types';
import { detectProductEdition } from '../utils/editionDetector';
import { CREATORS } from './creatorsData';
import { PROMOTIONS } from './promotionsData';
import { ADDON_PRODUCTS } from './products/addons';
import { MASHUP_PRODUCTS } from './products/mashups';
import { WORLD_PRODUCTS } from './products/worlds';
import { SKIN_PRODUCTS } from './products/skins';
import { TEXTURE_PRODUCTS } from './products/textures';
import { MINIGAME_PRODUCTS } from './products/minigames';
import { FREE_GIFT_PRODUCTS } from './products/freeGifts';
import { HISTORICAL_CATALOG } from './products/historicalCatalog';
import { MODRINTH_MODS } from './products/modrinthMods';

export { CREATORS, resolveCreator } from './creatorsData';
export { PROMOTIONS } from './promotionsData';
export { MODRINTH_MODS } from './products/modrinthMods';

// Generate comprehensive expanded library with Modrinth mods strictly at the TOP
function generateFullCatalog(): ProductItem[] {
  const baseList: ProductItem[] = [
    ...MODRINTH_MODS, // Top priority: latest Modrinth mods and textures
    ...ADDON_PRODUCTS,
    ...MASHUP_PRODUCTS,
    ...WORLD_PRODUCTS,
    ...SKIN_PRODUCTS,
    ...TEXTURE_PRODUCTS,
    ...MINIGAME_PRODUCTS,
    ...FREE_GIFT_PRODUCTS,
    ...HISTORICAL_CATALOG,
  ];

  // Extended historical and community packs with unique artwork and screenshots
  const extraCatalog: ProductItem[] = [
    // --- More Mash-ups & Pop Culture Worlds ---
    {
      id: 'item-super-mario-mashup',
      uuid: 'moj20170-0000-0000-0000-000000000008',
      title: 'Super Mario Mash-up Pack',
      description: 'Официальный мир Грибного Королевства от Nintendo и Mojang! Замок Пич, локации Боузера, трубы, кастомные блоки с вопросительными знаками, оригинальная музыка Koji Kondo и 40 скинов.',
      shortDescription: 'Грибное королевство Марио, музыка Кодзи Кондо и 40 скинов.',
      type: 'mashup',
      category: 'Worlds',
      creator: CREATORS[0],
      price: 1340,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 510000,
      downloadSize: '88.0 MB',
      releaseDate: '2017-06-01',
      updatedDate: '2024-09-01',
      version: '1.1.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftSummerSaleLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftSummerSaleLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftLive2024Launcher772x350.png',
        'https://launchercontent.mojang.com/v2/images/Minecraft15thAnniversaryLauncher772x350.png',
      ],
      tags: ['Super Mario', 'Nintendo', 'Mash-up', 'Mojang', 'Classic', '2017'],
      keyFeatures: [
        'Полная переработка мира в Грибное Королевство',
        'Оригинальный оркестровый саундтрек Super Mario 64',
        '40 скинов (Марио, Луиджи, Пич, Боузер, Йоши, Тоад)'
      ],
    },
    {
      id: 'item-dungeons-dragons-dlc',
      uuid: 'gmo20230-0000-0000-0000-000000000002',
      title: 'Dungeons & Dragons DLC',
      description: 'Полноценная ролевая кампания D&D в Забытых Королевствах от Gamemode One и Wizards of the Coast! Выберите класс: Паладин, Варвар, Плут или Волшебник, бросайте d20 кубик и побеждайте Бехолдера.',
      shortDescription: 'Официальная RPG кампания D&D с бросками d20 и классами персонажей.',
      type: 'mashup',
      category: 'Worlds',
      creator: CREATORS[2], // Gamemode One
      price: 1510,
      salePrice: 1170,
      discountPercent: 22,
      isSale: true,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 230000,
      downloadSize: '155.0 MB',
      releaseDate: '2023-09-26',
      updatedDate: '2025-10-15',
      version: '1.20.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsFlamesOfTheNetherLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsFlamesOfTheNetherLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsEchoingVoidLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsLauncher772x350.png',
      ],
      tags: ['D&D', 'RPG', 'Dungeons and Dragons', 'Gamemode One', '2023'],
      keyFeatures: [
        '4 классических класса с прокачиваемыми ветками умений',
        'Механика броска 20-гранного кубика d20 для проверок',
        'Полная озвучка персонажей и квестов'
      ],
    },
    {
      id: 'item-mega-man-x-dlc',
      uuid: 'moj20230-0000-0000-0000-000000000003',
      title: 'Mega Man X DLC',
      description: 'Классический экшен-платформер Capcom в Minecraft! Бегайте по стенам, стреляйте из X-Buster, побеждайте 8 боссов-мавериков и забирайте их суперспособности под 14 оригинальных треков.',
      shortDescription: 'Экшен-платформер Mega Man X с X-Buster, боссами и саундтреком.',
      type: 'mashup',
      category: 'Worlds',
      creator: CREATORS[0],
      price: 1340,
      isPopular: true,
      rating: 4.8,
      ratingsCount: 165000,
      downloadSize: '92.0 MB',
      releaseDate: '2023-02-21',
      updatedDate: '2025-04-10',
      version: '1.19.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftWindChargeLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftWindChargeLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftBreezeLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftVaultLauncher772x350.png',
      ],
      tags: ['Mega Man', 'Capcom', 'Action', 'Mojang', '2023'],
      keyFeatures: [
        '8 уровней с культовыми боссами-мавериками',
        'Оружие X-Buster и Z-Saber с кастомными анимациями',
        '14 оригинальных саундтреков эпохи SNES'
      ],
    },
    {
      id: 'item-avatar-legends-dlc',
      uuid: 'gmo20220-0000-0000-0000-000000000003',
      title: 'Avatar Legends DLC (Aang & Korra)',
      description: 'Овладейте четырьмя стихиями: Магией Воды, Земли, Огня и Воздуха! Летайте на бизоне Аппе, посетите Ба Синг Се, Храм Воздуха и спасите мир от Хозяина Огня вместе с Аангом и Коррой.',
      shortDescription: 'Магия четырех стихий, полеты на Аппе и путешествие по миру Аватара.',
      type: 'mashup',
      category: 'Worlds',
      creator: CREATORS[2], // Gamemode One
      price: 1340,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 320000,
      downloadSize: '135.0 MB',
      releaseDate: '2022-12-06',
      updatedDate: '2025-07-15',
      version: '1.19.50+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsHowlingPeaksLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsHowlingPeaksLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftTrailsAndTalesLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftAllayLauncher772x350.png',
      ],
      tags: ['Avatar', 'Nickelodeon', 'Aang', 'Korra', 'Gamemode One', '2022'],
      keyFeatures: [
        'Полноценные боевые заклинания для 4 стихий',
        'Полеты на летающем бизоне Аппе',
        'Огромный детальный мир со всеми четырьмя нациями'
      ],
    },

    // --- More Add-Ons ---
    {
      id: 'item-security-beacons-addon',
      uuid: 'raz20250-0000-0000-0000-000000000001',
      title: 'Security & CCTV Cameras Add-On',
      description: 'Защитите свою базу от гриферов и монстров! Лазерные ловушки, турели с автонаведением, экраны наблюдения с камерами ночного видения, кодовые замки и ключ-карты доступа от Razzleberries.',
      shortDescription: 'Камеры видеонаблюдения, турели, лазеры и замки с ключ-картами.',
      type: 'addon',
      category: 'Add-Ons',
      creator: CREATORS[5], // Razzleberries
      price: 830,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 105000,
      downloadSize: '34.0 MB',
      releaseDate: '2025-03-10',
      updatedDate: '2026-05-12',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftCrafterLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftCrafterLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftHeavyCoreLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftMaceLauncher772x350.png',
      ],
      tags: ['Security', 'Cameras', 'Turrets', 'Add-On', 'Razzleberries', '2025'],
      keyFeatures: [
        'Рабочие камеры с возможностью переключения через монитор',
        'Автоматические лазерные турели',
        'Сканеры отпечатков пальцев и сетчатки'
      ],
    },
    {
      id: 'item-farming-plus-addon',
      uuid: 'tet20240-0000-0000-0000-000000000002',
      title: 'Farming & Cooking Plus Add-On',
      description: 'Более 60 новых культур и 100+ кулинарных блюд: томаты, клубника, кукуруза, кофе, пицца, бургеры, суши, сыроварни, комбайны и тракторы от Tetrascape.',
      shortDescription: '60+ новых культур, 100+ блюд, тракторы и фермерская техника.',
      type: 'addon',
      category: 'Add-Ons',
      creator: CREATORS[7], // Tetrascape
      price: 660,
      salePrice: 490,
      discountPercent: 26,
      isSale: true,
      rating: 4.8,
      ratingsCount: 79000,
      downloadSize: '27.8 MB',
      releaseDate: '2024-11-05',
      updatedDate: '2026-03-18',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftBambooLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftBambooLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftSnifferLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCamelLauncher772x350.png',
      ],
      tags: ['Farming', 'Cooking', 'Food', 'Tractor', 'Tetrascape', 'Add-On', '2024'],
      keyFeatures: [
        '60 новых культур с реалистичным циклом роста',
        'Кухонная утварь: сковороды, духовки, блендеры',
        'Управляемый фермерский трактор с плугом'
      ],
    },
    {
      id: 'item-more-ores-armors-addon',
      uuid: 'ore20240-0000-0000-0000-000000000002',
      title: 'More Ores & Armors Add-On',
      description: '25 новых видов руд в обычном мире, Незере и Энде: Рубин, Сапфир, Аметистовая сталь, Палладий, Титан, Солнечный камень с полными наборами брони и оружия с пассивными эффектами.',
      shortDescription: '25 новых руд, наборы суперброни и легендарное оружие.',
      type: 'addon',
      category: 'Add-Ons',
      creator: CREATORS[6], // Oreville Studios
      price: 660,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 160000,
      downloadSize: '22.0 MB',
      releaseDate: '2024-07-12',
      updatedDate: '2026-02-05',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsCreepingWinterLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsCreepingWinterLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftNetherUpdateLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftWardenLauncher772x350.png',
      ],
      tags: ['Ores', 'Armor', 'Weapons', 'Oreville', 'Add-On', '2024'],
      keyFeatures: [
        '25 новых спавнящихся руд во всех трех измерениях',
        'Уникальные пассивные бонусы сетов (регенерация, скорость, полет)',
        'Особые тяжелые боевые молоты и косы'
      ],
    },

    // --- More Adventure & Survival Worlds ---
    {
      id: 'item-scp-foundation-site-19',
      uuid: 'sha20240-0000-0000-0000-000000000002',
      title: 'SCP Foundation: Site-19 Containment Breach',
      description: 'Огромный секретный подземный комплекс SCP Фонда! Более 20 анимированных объектов: SCP-173, SCP-096, SCP-049, SCP-682, SCP-999. Выживите во время нарушения условий содержания от Shapescape.',
      shortDescription: '20+ анимированных SCP объектов, лаборатории, квесты и сирены тревоги.',
      type: 'world',
      category: 'Worlds',
      creator: CREATORS[10], // Shapescape
      price: 1170,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 290000,
      downloadSize: '89.5 MB',
      releaseDate: '2024-02-14',
      updatedDate: '2026-04-01',
      version: '1.20.80+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftWardenLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftWardenLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftDeepDarkLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCavesAndCliffsLauncher772x350.png',
      ],
      tags: ['SCP', 'Horror', 'Survival', 'Shapescape', '2024'],
      keyFeatures: [
        '20 культовых SCP с оригинальным поведением и звуками',
        'Интерактивная карта комплекса с ключ-картами 5 уровней',
        'Сюжетный режим побега и режим свободного исследования'
      ],
    },
    {
      id: 'item-medieval-kingdom-rpg',
      uuid: 'eve20240-0000-0000-0000-000000000002',
      title: 'Medieval Kingdom: Age of Castles',
      description: 'Величественное средневековое королевство с гигантской цитаделью, рыцарскими турнирами, драконьими пещерами, деревнями крестьян и катапультами от Everbloom Studios.',
      shortDescription: 'Огромный средневековый замок с катапультами, рыцарями и квестами.',
      type: 'world',
      category: 'Worlds',
      creator: CREATORS[14], // Everbloom
      price: 990,
      rating: 4.8,
      ratingsCount: 140000,
      downloadSize: '82.0 MB',
      releaseDate: '2024-08-20',
      updatedDate: '2026-01-15',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftPillagerLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftPillagerLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftRavagerLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftDungeonsLauncher772x350.png',
      ],
      tags: ['Medieval', 'Castles', 'Knights', 'Everbloom', '2024'],
      keyFeatures: [
        'Детализированный замок со тронным залом и темницами',
        'Стреляющие катапульты и баллисты',
        'Кастомные сеты рыцарской брони и коней'
      ],
    },
    {
      id: 'item-titanic-survival-sim',
      uuid: 'tet20230-0000-0000-0000-000000000003',
      title: 'Titanic: Full Scale 1:1 Simulator',
      description: 'Точная копия легендарного лайнера Титаник в масштабе 1:1! Исследуйте Большую лестницу, машинное отделение, роскошные каюты первого класса или попытайтесь спастись во время крушения.',
      shortDescription: 'Точная копия лайнера Титаник 1:1 с режимом симуляции крушения.',
      type: 'world',
      category: 'Worlds',
      creator: CREATORS[7], // Tetrascape
      price: 830,
      rating: 4.9,
      ratingsCount: 210000,
      downloadSize: '68.0 MB',
      releaseDate: '2023-04-14',
      updatedDate: '2025-08-10',
      version: '1.20.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftUpdateAquaticLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftUpdateAquaticLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftDolphinLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftTurtleLauncher772x350.png',
      ],
      tags: ['Titanic', 'History', 'Ship', 'Tetrascape', '2023'],
      keyFeatures: [
        'Масштаб 1:1 со всеми палубами и внутренними помещениями',
        'Режим управляемого корабля и режим эвакуации',
        'Исторические аудиогиды и скины пассажиров'
      ],
    },

    // --- More Mini-Games ---
    {
      id: 'item-prop-hunt-hide-seek',
      uuid: 'inp20240-0000-0000-0000-000000000002',
      title: 'Prop Hunt: Block Morph & Seek',
      description: 'Превращайтесь в любые предметы: верстак, наковальню, фонарь, торт, кактус или книжную полку! Охотники вооружены радарами и звуковыми локаторами от InPvP.',
      shortDescription: 'Прятки с маскировкой под любые предметы интерьера и детекторами.',
      type: 'mini_game_world',
      category: 'Mini-Games',
      creator: CREATORS[16], // InPvP
      price: 660,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 310000,
      downloadSize: '31.5 MB',
      releaseDate: '2024-06-25',
      updatedDate: '2026-03-12',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftArmadilloLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftArmadilloLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftFoxLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCatLauncher772x350.png',
      ],
      tags: ['Prop Hunt', 'Hide and Seek', 'InPvP', 'Multiplayer', '2024'],
      keyFeatures: [
        'Мгновенная трансформация в 100+ блоков и предметов',
        'Генератор насмешливых звуков для маскирующихся',
        '6 детальных карт (Торговый центр, Особняк, Офис, Школа)'
      ],
    },
    {
      id: 'item-murder-mystery-mansion',
      uuid: 'nox20230-0000-0000-0000-000000000003',
      title: 'Murder Mystery: Classic Mansion',
      description: 'Найдите убийцу среди гостей или уничтожьте всех незаметно! Невиновные собирают золото на лук, детектив ведет расследование, а убийца орудует скрытым кинжалом от Noxcrew.',
      shortDescription: 'Детективная мини-игра со скрытыми ролями для 2-16 игроков.',
      type: 'mini_game_world',
      category: 'Mini-Games',
      creator: CREATORS[1], // Noxcrew
      price: 660,
      isPopular: true,
      rating: 4.8,
      ratingsCount: 260000,
      downloadSize: '29.0 MB',
      releaseDate: '2023-11-10',
      updatedDate: '2025-12-05',
      version: '1.20.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftBoggedLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftBoggedLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftVillageAndPillageLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftPillagerLauncher772x350.png',
      ],
      tags: ['Murder Mystery', 'Detective', 'Noxcrew', 'PvP', '2023'],
      keyFeatures: [
        'Автоматическое распределение ролей: Невиновный, Детектив, Убийца',
        'Тайные ходы, ловушки и вентиляции особняка',
        'Кастомные скины и анимации победы'
      ],
    },

    // --- More Texture Packs ---
    {
      id: 'item-chroma-hills-rpg',
      uuid: 'syc20220-0000-0000-0000-000000000002',
      title: 'Chroma Hills RPG 64x',
      description: 'Великолепный фотореалистичный средневековый набор текстур с детально прорисованными витражами, кирпичной кладкой, кольчугами и эпическим небом.',
      shortDescription: 'Реалистичный средневековый RPG текстур-пак с красивым небом.',
      type: 'resourcepack',
      category: 'Textures',
      creator: CREATORS[11], // Syclone
      price: 830,
      rating: 4.8,
      ratingsCount: 215000,
      downloadSize: '54.0 MB',
      releaseDate: '2022-09-08',
      updatedDate: '2025-10-18',
      version: '1.19.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftTrailsAndTalesLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftTrailsAndTalesLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftWildUpdateLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCavesAndCliffsLauncher772x350.png',
      ],
      tags: ['Chroma Hills', 'Realistic', 'RPG', 'Textures', '2022'],
      keyFeatures: [
        'Высокая детализация 64x64 в средневековом стиле',
        'Кастомные витражи и улучшенная броня',
        'Атмосферное ночное небо с созвездиями'
      ],
    },
    {
      id: 'item-retro-8bit-textures',
      uuid: 'pix20230-0000-0000-0000-000000000002',
      title: 'Retro 8-Bit Pixel Arcade Textures',
      description: 'Превратите игру в олдскульную аркаду 8-битной эпохи! Пиксельные ретро-звуки ударов, неоновые цвета и ностальгический стиль ранних видеоигр от PixelHeads.',
      shortDescription: 'Ностальгический 8-битный ретро-пак с аркадными звуками.',
      type: 'resourcepack',
      category: 'Textures',
      creator: CREATORS[13], // PixelHeads
      price: 490,
      rating: 4.7,
      ratingsCount: 120000,
      downloadSize: '14.0 MB',
      releaseDate: '2023-03-15',
      updatedDate: '2025-06-20',
      version: '1.20.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/TinyTakeoverMiniManiaLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/TinyTakeoverMiniManiaLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftCherryLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftBeesLauncher772x350.png',
      ],
      tags: ['Retro', '8-Bit', 'Arcade', 'PixelHeads', '2023'],
      keyFeatures: [
        'Пиксель-арт стиль золотого века аркадных автоматов',
        'Кастомные 8-битные чиптюн звуки'
      ],
    },

    // --- More Skin Packs ---
    {
      id: 'item-demon-slayers-hd',
      uuid: 'pix20240-0000-0000-0000-000000000003',
      title: 'Demon Slayers & Hashira HD',
      description: '32 скина воинов с дыханием клинка, традиционными узорчатыми хаори, катанами на поясе и масками от PixelHeads.',
      shortDescription: '32 скина мечников с традиционными хаори и эффектами дыхания.',
      type: 'skinpack',
      category: 'Skin Packs',
      creator: CREATORS[13], // PixelHeads
      price: 490,
      isPopular: true,
      rating: 4.9,
      ratingsCount: 220000,
      downloadSize: '15.2 MB',
      releaseDate: '2024-10-01',
      updatedDate: '2026-03-01',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MCMCMSpotlightLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MCMCMSpotlightLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftLive2024Launcher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCherryLauncher772x350.png',
      ],
      tags: ['Anime', 'Demon Slayer', 'HD', 'PixelHeads', '2024'],
      keyFeatures: [
        '32 скина с детализированными узорами хаори',
        'Подходит для скинов Alex и Steve'
      ],
    },
    {
      id: 'item-rich-billionaires-lifestyle',
      uuid: 'blo20240-0000-0000-0000-000000000002',
      title: 'Rich Billionaires HD Skins',
      description: 'Скины роскошной жизни: золотые смокинги, дизайнерские платья, бриллиантовые аксессуары и солнцезащитные очки от Blockception.',
      shortDescription: '26 скинов в золотых костюмах и вечерних нарядах.',
      type: 'skinpack',
      category: 'Skin Packs',
      creator: CREATORS[4], // Blockception
      price: 330,
      rating: 4.7,
      ratingsCount: 145000,
      downloadSize: '11.0 MB',
      releaseDate: '2024-01-20',
      updatedDate: '2025-11-10',
      version: '1.20.50+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftGoatLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftGoatLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftPandaLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftCatLauncher772x350.png',
      ],
      tags: ['Rich', 'Billionaire', 'Luxury', 'Blockception', '2024'],
      keyFeatures: [
        '26 скинов в стильной одежде премиум класса',
        'Идеально для ролевых игр в современных городах'
      ],
    },

    // --- More Free Education / Event Gifts ---
    {
      id: 'item-mcc-celebration-event-world',
      uuid: 'moj20240-0000-0000-0000-000000000004',
      title: 'MCC x Minecraft 15th Celebration Live World',
      description: 'Официальный праздничный серверный мир коллаборации Minecraft и Noxcrew к 15-летию! 4 легендарные мини-игры MCC: Sands of Time, Ace Race, Grid Runners и Meltdown.',
      shortDescription: 'Официальный праздничный мир MCC с 4 мини-играми турнира бесплатно.',
      type: 'world',
      category: 'Free Gifts',
      creator: CREATORS[0], // Mojang
      price: 0,
      isFree: true,
      isPopular: true,
      isFeatured: true,
      rating: 5.0,
      ratingsCount: 620000,
      downloadSize: '110.0 MB',
      releaseDate: '2024-07-22',
      updatedDate: '2025-09-10',
      version: '1.21.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MCMCMSpotlightLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MCMCMSpotlightLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftSummerSaleLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftChamberLauncher772x350.png',
      ],
      tags: ['MCC', 'Free', 'Celebration', 'Noxcrew', 'Mojang', '2024'],
      keyFeatures: [
        '4 официальные соревновательные арены MCC',
        'Таблицы лидеров и награды в виде плащей и корон',
        '100% бесплатно'
      ],
    },
    {
      id: 'item-climate-futures-world',
      uuid: 'moj20210-0000-0000-0000-000000000005',
      title: 'Climate Futures: Farm, Forest, City',
      description: 'Официальный бесплатный мир от Mojang и UK Met Office. Исследуйте влияние климатических изменений и стройте экологичные города будущего.',
      shortDescription: 'Официальный экологический образовательный мир от Mojang.',
      type: 'world',
      category: 'Free Gifts',
      creator: CREATORS[0],
      price: 0,
      isFree: true,
      rating: 4.8,
      ratingsCount: 135000,
      downloadSize: '46.0 MB',
      releaseDate: '2021-11-01',
      updatedDate: '2024-10-01',
      version: '1.17.0+',
      thumbnailUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftMangroveLauncher772x350.png',
      bannerUrl: 'https://launchercontent.mojang.com/v2/images/MinecraftMangroveLauncher772x350.png',
      screenshots: [
        'https://launchercontent.mojang.com/v2/images/MinecraftFrogLauncher772x350.png',
        'https://launchercontent.mojang.com/v2/images/MinecraftBeesLauncher772x350.png',
      ],
      tags: ['Education', 'Climate', 'Free', 'Mojang', '2021'],
      keyFeatures: [
        'Интерактивные фермы и возобновляемые источники энергии',
        'Обучающие квесты и симуляция экосистем'
      ],
    },
  ];

  // Combine and de-duplicate by ID
  const combined = [...baseList, ...extraCatalog];
  const uniqueMap = new Map<string, ProductItem>();
  for (const item of combined) {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, {
        ...item,
        edition: item.edition || detectProductEdition(item),
      });
    }
  }

  return Array.from(uniqueMap.values());
}

export const MARKETPLACE_PRODUCTS: ProductItem[] = generateFullCatalog();

export const CATEGORIES = [
  'All',
  'Mods',
  'Skin Packs',
  'Worlds',
  'Add-Ons',
  'Servers',
  'Textures',
  'Mini-Games',
  'Sales & Deals',
  'Free Gifts',
  'Popular',
  'Creators',
];
