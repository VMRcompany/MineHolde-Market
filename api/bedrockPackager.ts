import JSZip from 'jszip';
import crypto from 'crypto';

// Minimal 64x64 valid PNG buffer (green grass themed)
const FALLBACK_PACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR42u3PMQEAAAwCoNk/9HI4CQw+sAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODWAs/eAAGf8p2FAAAAAElFTkSuQmCC',
  'base64'
);

export type MinecraftFileFormat = 'mcaddon' | 'mcworld' | 'mcpack' | 'mctemplate' | 'jar';

export function getProductFormat(product: any): {
  format: MinecraftFileFormat;
  filename: string;
  mime: string;
} {
  const t = (product.type || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();
  const id = (product.id || '').toLowerCase();
  const title = (product.title || '').toLowerCase();

  // Java mods
  if (id.startsWith('mr-') || id.startsWith('cf-') || cat === 'mods' || t === 'mod') {
    const cleanTitle = (product.title || id).replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      format: 'jar',
      filename: `${cleanTitle}.jar`,
      mime: 'application/java-archive',
    };
  }

  // Bedrock Add-Ons (highest priority for addons)
  if (t === 'addon' || cat.includes('add-on') || cat === 'add-ons' || title.includes('add-on') || title.includes('addon')) {
    const cleanTitle = (product.title || 'minecraft_addon').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      format: 'mcaddon',
      filename: `${cleanTitle}.mcaddon`,
      mime: 'application/octet-stream',
    };
  }

  // Worlds & Mash-ups
  if (
    t === 'world' ||
    t === 'mashup' ||
    t === 'survival_spawn_world' ||
    t === 'mini_game_world' ||
    t === 'adventure_world' ||
    cat === 'worlds' ||
    cat === 'mini-games' ||
    title.includes('world')
  ) {
    const cleanTitle = (product.title || 'minecraft_world').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      format: 'mcworld',
      filename: `${cleanTitle}.mcworld`,
      mime: 'application/octet-stream',
    };
  }

  // Templates
  if (t.includes('template') || title.includes('template')) {
    const cleanTitle = (product.title || 'minecraft_template').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      format: 'mctemplate',
      filename: `${cleanTitle}.mctemplate`,
      mime: 'application/octet-stream',
    };
  }

  // Resource Packs / Textures / Skins
  if (
    t === 'resourcepack' ||
    t === 'texturepack' ||
    t === 'skinpack' ||
    t === 'persona' ||
    cat === 'textures' ||
    cat === 'skin packs'
  ) {
    const cleanTitle = (product.title || 'minecraft_pack').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      format: 'mcpack',
      filename: `${cleanTitle}.mcpack`,
      mime: 'application/octet-stream',
    };
  }

  // Default fallback for Bedrock items
  const cleanTitle = (product.title || 'minecraft_addon').replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    format: 'mcaddon',
    filename: `${cleanTitle}.mcaddon`,
    mime: 'application/octet-stream',
  };
}

/**
 * Builds an authentic Bedrock package (.mcaddon, .mcworld, .mcpack, .mctemplate) in Node.js
 */
export async function generateBedrockBuffer(product: any, format: MinecraftFileFormat): Promise<Buffer> {
  const zip = new JSZip();
  const title = product.title || 'MineHolde Bedrock Item';
  const desc = product.shortDescription || product.description || 'Authentic Minecraft Bedrock package';
  const safeIdentifier = (product.id || 'item')
    .replace(/^item-/, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();

  // Try to retrieve thumbnail for icon, otherwise use valid fallback
  let iconBuffer: Buffer = FALLBACK_PACK_PNG;
  if (product.thumbnailUrl && product.thumbnailUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(product.thumbnailUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const arr = await res.arrayBuffer();
        iconBuffer = Buffer.from(arr);
      }
    } catch {}
  }

  // 1. .mcaddon Packaging (Behavior Pack + Resource Pack)
  if (format === 'mcaddon') {
    const bpHeaderUuid = crypto.randomUUID();
    const bpModuleUuid = crypto.randomUUID();
    const rpHeaderUuid = crypto.randomUUID();
    const rpModuleUuid = crypto.randomUUID();

    const bpManifest = {
      format_version: 2,
      header: {
        name: `${title} (Behavior Pack)`,
        description: desc,
        uuid: bpHeaderUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [
        {
          type: 'data',
          uuid: bpModuleUuid,
          version: [1, 0, 0],
        },
      ],
      dependencies: [
        {
          uuid: rpHeaderUuid,
          version: [1, 0, 0],
        },
      ],
    };

    const rpManifest = {
      format_version: 2,
      header: {
        name: `${title} (Resource Pack)`,
        description: desc,
        uuid: rpHeaderUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [
        {
          type: 'resources',
          uuid: rpModuleUuid,
          version: [1, 0, 0],
        },
      ],
    };

    // Behavior Pack files
    zip.file('behavior_pack/manifest.json', JSON.stringify(bpManifest, null, 2));
    zip.file('behavior_pack/pack_icon.png', iconBuffer);
    zip.file(
      'behavior_pack/texts/en_US.lang',
      `pack.name=${title} BP\npack.description=${desc}\nentity.mineholde:${safeIdentifier}.name=${title}\n`
    );
    zip.file(
      `behavior_pack/entities/${safeIdentifier}.json`,
      JSON.stringify(
        {
          format_version: '1.21.0',
          'minecraft:entity': {
            description: {
              identifier: `mineholde:${safeIdentifier}`,
              is_spawnable: true,
              is_summonable: true,
              is_experimental: false,
            },
            components: {
              'minecraft:type_family': { family: ['mineholde', 'custom'] },
              'minecraft:health': { value: 40, max: 40 },
              'minecraft:movement': { value: 0.3 },
              'minecraft:collision_box': { width: 0.6, height: 1.8 },
              'minecraft:physics': {},
            },
          },
        },
        null,
        2
      )
    );
    zip.file(
      `behavior_pack/items/${safeIdentifier}_item.json`,
      JSON.stringify(
        {
          format_version: '1.21.0',
          'minecraft:item': {
            description: {
              identifier: `mineholde:${safeIdentifier}_item`,
              category: 'Equipment',
            },
            components: {
              'minecraft:max_stack_size': 64,
              'minecraft:icon': { texture: `${safeIdentifier}_item` },
            },
          },
        },
        null,
        2
      )
    );

    // Resource Pack files
    zip.file('resource_pack/manifest.json', JSON.stringify(rpManifest, null, 2));
    zip.file('resource_pack/pack_icon.png', iconBuffer);
    zip.file(
      'resource_pack/texts/en_US.lang',
      `pack.name=${title} RP\npack.description=${desc}\nitem.mineholde:${safeIdentifier}_item.name=${title} Item\n`
    );
    zip.file(
      'resource_pack/textures/item_texture.json',
      JSON.stringify(
        {
          resource_pack_name: safeIdentifier,
          texture_name: 'atlas.items',
          texture_data: {
            [`${safeIdentifier}_item`]: {
              textures: `textures/items/${safeIdentifier}_item`,
            },
          },
        },
        null,
        2
      )
    );
    zip.file(`resource_pack/textures/items/${safeIdentifier}_item.png`, iconBuffer);

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // 2. .mcworld Packaging
  if (format === 'mcworld') {
    const worldUuid = crypto.randomUUID();
    const moduleUuid = crypto.randomUUID();

    const worldManifest = {
      format_version: 2,
      header: {
        name: title,
        description: desc,
        uuid: worldUuid,
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

    zip.file('levelname.txt', title);
    zip.file('manifest.json', JSON.stringify(worldManifest, null, 2));
    zip.file('world_behavior_packs.json', '[]');
    zip.file('world_resource_packs.json', '[]');
    zip.file('pack_icon.png', iconBuffer);
    zip.file('world_icon.jpeg', iconBuffer);
    zip.file('texts/en_US.lang', `world.name=${title}\nworld.description=${desc}\n`);

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // 3. .mcpack Packaging (Resource pack or Skin pack)
  if (format === 'mcpack') {
    const packUuid = crypto.randomUUID();
    const moduleUuid = crypto.randomUUID();
    const isSkin = (product.type || '').includes('skin') || (product.skins && product.skins.length > 0);

    const packManifest = {
      format_version: 2,
      header: {
        name: title,
        description: desc,
        uuid: packUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [
        {
          type: isSkin ? 'skin_pack' : 'resources',
          uuid: moduleUuid,
          version: [1, 0, 0],
        },
      ],
    };

    zip.file('manifest.json', JSON.stringify(packManifest, null, 2));
    zip.file('pack_icon.png', iconBuffer);
    zip.file('texts/en_US.lang', `pack.name=${title}\npack.description=${desc}\n`);

    if (isSkin && Array.isArray(product.skins) && product.skins.length > 0) {
      const skinsList = product.skins.map((s: any, idx: number) => ({
        localization_name: s.name || `Skin_${idx + 1}`,
        geometry: s.model === 'alex' ? 'geometry.humanoid.customSlim' : 'geometry.humanoid.custom',
        texture: `skin_${idx + 1}.png`,
        type: 'free',
      }));

      zip.file(
        'skins.json',
        JSON.stringify(
          {
            serialize_name: safeIdentifier,
            localization_name: safeIdentifier,
            skins: skinsList,
          },
          null,
          2
        )
      );

      for (let i = 0; i < product.skins.length; i++) {
        zip.file(`skin_${i + 1}.png`, iconBuffer);
      }
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // 4. .mctemplate Packaging
  if (format === 'mctemplate') {
    const tUuid = crypto.randomUUID();
    const mUuid = crypto.randomUUID();

    const templateManifest = {
      format_version: 2,
      header: {
        name: title,
        description: desc,
        uuid: tUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [
        {
          type: 'world_template',
          uuid: mUuid,
          version: [1, 0, 0],
        },
      ],
    };

    zip.file('levelname.txt', title);
    zip.file('manifest.json', JSON.stringify(templateManifest, null, 2));
    zip.file('pack_icon.png', iconBuffer);

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // Fallback .mcaddon
  return generateBedrockBuffer(product, 'mcaddon');
}
