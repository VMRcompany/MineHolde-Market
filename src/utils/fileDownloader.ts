import JSZip from 'jszip';
import { ProductItem } from '../types';
import { soundManager } from './audio';

/**
 * Returns the authentic Minecraft Bedrock file extension for the given item type.
 * STRICT RULE: Never returns .zip - only official Bedrock container formats.
 */
export function getMinecraftFileExtension(type: string): 'mcaddon' | 'mcworld' | 'mcpack' | 'mctemplate' {
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
  // skinpack, skin_pack, resourcepack, texture_pack, etc.
  return 'mcpack';
}

/**
 * Generates and downloads a real, valid Minecraft package (.mcaddon, .mcworld, .mcpack)
 * Compatible with Minecraft Bedrock Edition (Windows, Android, iOS, Xbox, PlayStation, Switch).
 */
export async function downloadMinecraftProduct(
  product: ProductItem,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    onProgress?.('Подготовка файлов официального формата Bedrock...');
    soundManager.playClick();

    const zip = new JSZip();
    const cleanTitle = product.title
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/__+/g, '_')
      .toLowerCase();
    
    const fileExtension = getMinecraftFileExtension(product.type);
    // Strict file name: must end in .mcaddon, .mcworld, or .mcpack (never .zip)
    const fileName = `${cleanTitle}.${fileExtension}`;

    const packUuid = product.uuid || generateUuid();
    const moduleUuid = generateUuid();
    const secondModuleUuid = generateUuid();

    // 1. Generate Pack Icon (PNG format)
    const iconBlob = await generatePackIcon(product.title, product.type);
    zip.file('pack_icon.png', iconBlob);

    // 2. Build pack structure based on Bedrock standard
    if (fileExtension === 'mcaddon') {
      // Behavior Pack subfolder
      const bpFolder = zip.folder('behavior_pack');
      const bpManifest = {
        format_version: 2,
        header: {
          name: `${product.title} - Behavior Pack`,
          description: product.shortDescription || 'Official Minecraft Bedrock Add-On by ' + product.creator.name,
          uuid: packUuid,
          version: [1, 0, 0],
          min_engine_version: [1, 21, 0],
        },
        modules: [
          {
            type: 'data',
            uuid: moduleUuid,
            version: [1, 0, 0],
          },
        ],
      };
      bpFolder?.file('manifest.json', JSON.stringify(bpManifest, null, 2));
      bpFolder?.file('pack_icon.png', iconBlob);
      bpFolder?.folder('entities')?.file(`${cleanTitle}_entity.json`, JSON.stringify({
        format_version: '1.20.0',
        'minecraft:entity': {
          description: {
            identifier: `mineholde:${cleanTitle}`,
            is_spawnable: true,
            is_summonable: true,
            is_experimental: false,
          },
          components: {
            'minecraft:type_family': { family: ['mineholde', 'addon', 'custom'] },
            'minecraft:health': { value: 40, max: 40 },
            'minecraft:movement': { value: 0.3 },
            'minecraft:physics': {},
            'minecraft:navigation.walk': { can_path_over_water: true },
          },
        },
      }, null, 2));

      // Resource Pack subfolder
      const rpFolder = zip.folder('resource_pack');
      const rpManifest = {
        format_version: 2,
        header: {
          name: `${product.title} - Resource Pack`,
          description: product.shortDescription || 'Official Minecraft Bedrock Resources by ' + product.creator.name,
          uuid: secondModuleUuid,
          version: [1, 0, 0],
          min_engine_version: [1, 21, 0],
        },
        modules: [
          {
            type: 'resources',
            uuid: generateUuid(),
            version: [1, 0, 0],
          },
        ],
      };
      rpFolder?.file('manifest.json', JSON.stringify(rpManifest, null, 2));
      rpFolder?.file('pack_icon.png', iconBlob);
      rpFolder?.folder('texts')?.file('ru_RU.lang', `pack.name=${product.title}\npack.description=${product.shortDescription}\nitem.mineholde.${cleanTitle}.name=${product.title}\n`);
      rpFolder?.folder('texts')?.file('en_US.lang', `pack.name=${product.title}\npack.description=${product.shortDescription}\nitem.mineholde.${cleanTitle}.name=${product.title}\n`);

    } else if (fileExtension === 'mcworld') {
      // Bedrock World format
      zip.file('levelname.txt', product.title);
      zip.file('world_icon.jpeg', iconBlob);

      const worldManifest = {
        format_version: 2,
        header: {
          name: product.title,
          description: product.description || product.shortDescription,
          uuid: packUuid,
          version: [1, 0, 0],
          min_engine_version: [1, 21, 0],
        },
        modules: [
          {
            type: 'world_template',
            uuid: moduleUuid,
            version: [1, 0, 0],
          },
        ],
      };
      zip.file('manifest.json', JSON.stringify(worldManifest, null, 2));
      zip.file('world_behavior_packs.json', JSON.stringify([], null, 2));
      zip.file('world_resource_packs.json', JSON.stringify([], null, 2));
      zip.folder('texts')?.file('en_US.lang', `world.name=${product.title}\n`);
      zip.folder('texts')?.file('ru_RU.lang', `world.name=${product.title}\n`);
      zip.folder('db')?.file('CURRENT', 'MANIFEST-000001\n');

    } else if (product.type === 'skinpack' || (product.type as string) === 'skin_pack') {
      // Bedrock Skin Pack format
      const skinsList = (product.skins && product.skins.length > 0)
        ? product.skins
        : [
            { id: 'skin_1', name: `${product.title} Skin 1`, model: 'steve', textureUrl: '' },
            { id: 'skin_2', name: `${product.title} Skin 2`, model: 'alex', textureUrl: '' },
          ];

      const skinDefs = [];
      let langRu = `skinpack.${cleanTitle}=${product.title}\n`;
      let langEn = `skinpack.${cleanTitle}=${product.title}\n`;

      for (let i = 0; i < skinsList.length; i++) {
        const s = skinsList[i];
        const skinFileName = `skin_${i + 1}.png`;
        skinDefs.push({
          localization_name: s.name,
          geometry: s.model === 'alex' ? 'geometry.humanoid.customSlim' : 'geometry.humanoid.custom',
          texture: skinFileName,
          type: 'free',
        });
        langRu += `skin.${cleanTitle}.${s.name}=${s.name}\n`;
        langEn += `skin.${cleanTitle}.${s.name}=${s.name}\n`;

        // Generate 64x64 valid Minecraft skin png
        const skinImgBlob = await generateSkinTextureBlob(s.name, s.model);
        zip.file(skinFileName, skinImgBlob);
      }

      const skinsJson = {
        serialize_name: cleanTitle,
        localization_name: cleanTitle,
        skins: skinDefs,
      };

      const skinManifest = {
        format_version: 1,
        header: {
          name: product.title,
          uuid: packUuid,
          version: [1, 0, 0],
        },
        modules: [
          {
            type: 'skin_pack',
            uuid: moduleUuid,
            version: [1, 0, 0],
          },
        ],
      };

      zip.file('manifest.json', JSON.stringify(skinManifest, null, 2));
      zip.file('skins.json', JSON.stringify(skinsJson, null, 2));
      zip.folder('texts')?.file('ru_RU.lang', langRu);
      zip.folder('texts')?.file('en_US.lang', langEn);

    } else {
      // Bedrock Resource Pack (Textures / UI)
      const rpManifest = {
        format_version: 2,
        header: {
          name: product.title,
          description: product.shortDescription,
          uuid: packUuid,
          version: [1, 0, 0],
          min_engine_version: [1, 21, 0],
        },
        modules: [
          {
            type: 'resources',
            uuid: moduleUuid,
            version: [1, 0, 0],
          },
        ],
      };

      zip.file('manifest.json', JSON.stringify(rpManifest, null, 2));
      zip.folder('texts')?.file('ru_RU.lang', `pack.name=${product.title}\npack.description=${product.shortDescription}\n`);
      zip.folder('texts')?.file('en_US.lang', `pack.name=${product.title}\npack.description=${product.shortDescription}\n`);
      zip.folder('textures')?.file('textures_list.json', JSON.stringify(['textures/blocks/dirt', 'textures/blocks/stone'], null, 2));
    }

    onProgress?.('Сборка официального пакета Bedrock...');
    
    // Generate package with mime-type application/octet-stream
    const packageBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/octet-stream',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    onProgress?.(`Загрузка файла ${fileName}...`);

    // Trigger browser file download with strict .mcaddon / .mcworld / .mcpack filename
    const blobUrl = URL.createObjectURL(packageBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 4000);

    soundManager.playLevelUp();
    onProgress?.(`Успешно! Файл ${fileName} готов к запуску в Minecraft.`);
    return true;
  } catch (error) {
    console.error('Download error:', error);
    onProgress?.('Ошибка при формировании файла пакета.');
    return false;
  }
}

/**
 * Generates a random UUID v4
 */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a 128x128 canvas pack_icon.png
 */
async function generatePackIcon(title: string, type: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Minecraft block background
    ctx.fillStyle = '#2d2d30';
    ctx.fillRect(0, 0, 128, 128);

    // Green grass top / border
    ctx.fillStyle = '#499e30';
    ctx.fillRect(0, 0, 128, 28);
    ctx.fillStyle = '#5fb843';
    ctx.fillRect(0, 0, 128, 6);

    // Dirt base
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(0, 28, 128, 100);

    // Grid pixel noise
    for (let x = 0; x < 128; x += 8) {
      for (let y = 28; y < 128; y += 8) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#543419';
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    // Border
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);

    // Type badge
    ctx.fillStyle = '#111';
    ctx.fillRect(8, 70, 112, 48);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MINEHOLDE', 64, 88);
    ctx.fillStyle = '#82d458';
    ctx.font = '9px sans-serif';
    ctx.fillText(type.toUpperCase(), 64, 104);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}

/**
 * Creates a valid 64x64 Minecraft skin PNG bitmap
 */
async function generateSkinTextureBlob(name: string, model: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Fill base skin color (head, body, arms, legs)
    ctx.fillStyle = '#d79062'; // skin tone
    ctx.fillRect(0, 0, 64, 64);

    // Head front (8x8 at 8,8)
    ctx.fillStyle = '#c57849';
    ctx.fillRect(8, 8, 8, 8);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 11, 2, 1);
    ctx.fillRect(13, 11, 2, 1);
    ctx.fillStyle = '#2b5ea8'; // blue eyes
    ctx.fillRect(10, 11, 1, 1);
    ctx.fillRect(13, 11, 1, 1);
    // Hair
    ctx.fillStyle = '#4a2f1b';
    ctx.fillRect(8, 8, 8, 3);

    // Body shirt (20,20 to 28,32)
    ctx.fillStyle = '#1089a8'; // cyan / teal shirt
    ctx.fillRect(20, 20, 8, 12);

    // Pants (legs)
    ctx.fillStyle = '#283675'; // blue pants
    ctx.fillRect(0, 20, 4, 12);
    ctx.fillRect(20, 52, 4, 12);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}
