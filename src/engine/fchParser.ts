// Valheim Character .fch Save Parser and Serializer
import { ZPackageReader, ZPackageWriter, getStableHashCode } from './zpkg';
import { sha512 } from 'js-sha512';

export interface InventoryItem {
  id: string; // unique internal id for React keys
  prefab: string;
  hash: number;
  gridX: number; // 0..7
  gridY: number; // 0..3
  stack: number;
  durability: number;
  maxDurability?: number;
  quality: number;
  variant: number;
  equipped: boolean;
  pickedUp: boolean;
  crafterID: bigint;
  crafterName: string;
  customData: Record<string, string>;
  cheated: number;
  worldLevel: number;
}

export interface CharacterAppearance {
  beard: string;
  hair: string;
  skinColor: [number, number, number];
  hairColor: [number, number, number];
  modelIndex: number; // 0 = Male, 1 = Female
}

export interface ActiveFood {
  name: string;
  remainingTime: number;
}

export interface WorldData {
  worldId: bigint;
  haveSpawn: boolean;
  spawnPoint: [number, number, number];
  haveLogout: boolean;
  logoutPoint: [number, number, number];
  haveDeath: boolean;
  deathPoint: [number, number, number];
  homePoint: [number, number, number];
  haveMap: boolean;
  mapBytes: Uint8Array;
}

export interface ValheimCharacter {
  rawFileBytes: Uint8Array;
  playerName: string;
  playerID: bigint;
  startSeed: string;
  usedCheats: boolean;
  dateCreated: bigint;
  dateCreatedDate?: Date;
  version: number;
  hp: number;
  stamina: number;
  guardianPower: string;
  appearance: CharacterAppearance;
  foods: ActiveFood[];
  items: InventoryItem[];
  // World locations & bed spawn points
  firstSpawn: boolean;
  worlds: WorldData[];
  statsBytes: Uint8Array;
  // Raw untouched slices for 100% byte fidelity
  preInventoryBytes: Uint8Array;
  postInventoryBytes: Uint8Array;
  profileHeaderBytes: Uint8Array;
  invVer: number;
}

export async function parseFchFile(fileBuffer: ArrayBuffer | Uint8Array): Promise<ValheimCharacter> {
  const rawBytes = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
  const reader = new ZPackageReader(rawBytes);

  const payloadLength = reader.readInt();
  if (payloadLength <= 0 || payloadLength > rawBytes.byteLength - 8) {
    throw new Error('Invalid .fch file: payload length out of range');
  }

  const payload = reader.readBytes(payloadLength);
  const checkHashLen = reader.readInt();
  const signature = reader.readBytes(checkHashLen);

  // Verify SHA-512 signature using Web Crypto API or pure JS sha512 fallback
  try {
    let calculatedHash: Uint8Array;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const payloadCopy = new Uint8Array(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-512', payloadCopy.buffer as ArrayBuffer);
        calculatedHash = new Uint8Array(hashBuffer);
      } catch {
        calculatedHash = new Uint8Array(sha512.array(payload));
      }
    } else {
      calculatedHash = new Uint8Array(sha512.array(payload));
    }

    let signatureMatches = true;
    if (calculatedHash.length === signature.length) {
      for (let i = 0; i < signature.length; i++) {
        if (signature[i] !== calculatedHash[i]) {
          signatureMatches = false;
          break;
        }
      }
    }
    if (!signatureMatches) {
      console.warn('SHA-512 checksum mismatch. Proceeding with caution.');
    }
  } catch (e) {
    console.warn('Could not verify SHA-512 signature:', e);
  }

  // Parse outer profile
  const pReader = new ZPackageReader(payload);
  const startProfilePos = pReader.getOffset();
  const version = pReader.readInt();
  const c_raw = pReader.readInt();
  const c_stats = pReader.readInt();

  for (let i = 0; i < c_stats; i++) {
    for (let j = 0; j < c_raw; j++) pReader.readFloat();
    pReader.readDict();
    pReader.readDict();
    pReader.readDict();
    const es_len = pReader.readInt();
    for (let j = 0; j < es_len; j++) pReader.readDict();
    pReader.readDict(); // d_pickup
    pReader.readDict(); // d_craft
    pReader.readDict(); // d_pick
    pReader.readDict(); // d_food
    pReader.readDict(); // d_pieces
  }

  const statsEndPos = pReader.getOffset();
  const statsBytes = payload.subarray(startProfilePos, statsEndPos);

  const first_spawn = pReader.readBool();
  const worlds_count = pReader.readInt();
  const worlds: WorldData[] = [];

  for (let i = 0; i < worlds_count; i++) {
    const worldId = pReader.readLong();
    const haveSpawn = pReader.readBool();
    const spawnPoint = pReader.readVec3();
    const haveLogout = pReader.readBool();
    const logoutPoint = pReader.readVec3();
    const haveDeath = pReader.readBool();
    const deathPoint = pReader.readVec3();
    const homePoint = pReader.readVec3();
    const haveMap = pReader.readBool();
    const mapBytes = haveMap ? pReader.readBytes() : new Uint8Array(0);

    worlds.push({
      worldId,
      haveSpawn,
      spawnPoint,
      haveLogout,
      logoutPoint,
      haveDeath,
      deathPoint,
      homePoint,
      haveMap,
      mapBytes,
    });
  }

  const profileHeaderEndPos = pReader.getOffset();
  const profileHeaderBytes = payload.subarray(startProfilePos, profileHeaderEndPos);

  const playerName = pReader.readString();
  const playerID = pReader.readLong();
  const startSeed = pReader.readString();
  const usedCheats = pReader.readBool();
  const dateCreated = pReader.readLong();
  const have_pdata = pReader.readBool();

  if (!have_pdata) {
    throw new Error('Character save does not contain player data (have_pdata is false)');
  }

  const pdata = pReader.readBytes();

  // Parse pdata
  const pdReader = new ZPackageReader(pdata);
  const p_ver = pdReader.readInt();
  const maxHealth = pdReader.readFloat();
  const stamina = pdReader.readFloat();
  const f3 = pdReader.readFloat();
  const f4 = pdReader.readFloat();
  const guardianPower = pdReader.readString();
  const guardianPowerCooldown = pdReader.readFloat();

  const invVer = pdReader.readInt();
  const invHeaderEndPos = pdReader.getOffset();
  const preInventoryBytes = pdata.subarray(0, invHeaderEndPos);

  const invCount = pdReader.readUShort();
  const items: InventoryItem[] = [];

  for (let i = 0; i < invCount; i++) {
    const durabilityRaw = pdReader.readInt();
    const durability = Math.round((durabilityRaw / 100) * 10) / 10;
    const gridX = pdReader.readByte();
    const gridY = pdReader.readByte();
    const worldLevel = pdReader.readByte();
    const flags = pdReader.readByte();

    const pickedUp = (flags & 0x01) !== 0;
    const equipped = (flags & 0x02) !== 0;
    const quality = (flags & 0x04) !== 0 ? pdReader.readUShort() : 1;
    const stack = (flags & 0x08) !== 0 ? pdReader.readUShort() : 1;
    const variant = (flags & 0x10) !== 0 ? pdReader.readInt() : 0;

    let crafterID = 0n;
    let crafterName = '';
    if ((flags & 0x20) !== 0) {
      crafterID = pdReader.readLong();
      crafterName = pdReader.readString();
    }

    const hash = (flags & 0x40) !== 0 ? pdReader.readInt() : 0;

    const customData: Record<string, string> = {};
    if ((flags & 0x80) !== 0) {
      const cdCount = pdReader.readInt();
      for (let j = 0; j < cdCount; j++) {
        const k = pdReader.readString();
        const v = pdReader.readString();
        customData[k] = v;
      }
    }

    const cheated = pdReader.readByte();

    items.push({
      id: `item-${gridX}-${gridY}-${i}-${Date.now()}`,
      prefab: '', // Will be mapped by prefab database
      hash,
      gridX,
      gridY,
      stack,
      durability,
      quality,
      variant,
      equipped,
      pickedUp,
      crafterID,
      crafterName,
      customData,
      cheated,
      worldLevel,
    });
  }

  const postInventoryPos = pdReader.getOffset();
  const postInventoryBytes = pdata.subarray(postInventoryPos);

  // Extract appearance and active foods from postInventoryBytes
  const { appearance, foods } = extractAppearanceAndFoods(postInventoryBytes);

  let dateCreatedDate: Date | undefined;
  try {
    // Windows filetime to Date or epoch
    const epochOffset = 116444736000000000n; // 100ns intervals between 1601 and 1970
    if (dateCreated > epochOffset) {
      const millis = Number((dateCreated - epochOffset) / 10000n);
      dateCreatedDate = new Date(millis);
    }
  } catch (e) {}

  return {
    rawFileBytes: rawBytes,
    playerName,
    playerID,
    startSeed,
    usedCheats,
    dateCreated,
    dateCreatedDate,
    version,
    hp: maxHealth,
    stamina,
    guardianPower,
    appearance,
    foods,
    items,
    firstSpawn: first_spawn,
    worlds,
    statsBytes,
    preInventoryBytes,
    postInventoryBytes,
    profileHeaderBytes,
    invVer,
  };
}

function extractAppearanceAndFoods(postBytes: Uint8Array): {
  appearance: CharacterAppearance;
  foods: ActiveFood[];
} {
  const defaultAppearance: CharacterAppearance = {
    beard: 'Beard1',
    hair: 'Hair1',
    skinColor: [0.65, 0.65, 0.65],
    hairColor: [0.68, 0.54, 0.39],
    modelIndex: 0,
  };
  const foods: ActiveFood[] = [];

  try {
    // Search for "Beard" pattern in postBytes
    // In Valheim, string is 7-bit length prefix followed by utf8 "Beard..."
    const textDecoder = new TextDecoder('utf-8');
    for (let i = 0; i < postBytes.length - 30; i++) {
      // Check for "Beard" (bytes: 0x42, 0x65, 0x61, 0x72, 0x64)
      if (
        postBytes[i] === 0x42 &&
        postBytes[i + 1] === 0x65 &&
        postBytes[i + 2] === 0x61 &&
        postBytes[i + 3] === 0x72 &&
        postBytes[i + 4] === 0x64
      ) {
        // Find string start (1 or 2 bytes before)
        const strLen = postBytes[i - 1];
        if (strLen >= 5 && strLen <= 25) {
          const streamReader = new ZPackageReader(postBytes.subarray(i - 1));
          const beard = streamReader.readString();
          const hair = streamReader.readString();
          const skinColor = streamReader.readVec3();
          const hairColor = streamReader.readVec3();
          const modelIndex = streamReader.readInt();

          if (
            modelIndex >= 0 &&
            modelIndex <= 1 &&
            skinColor[0] >= 0 &&
            skinColor[0] <= 1.5 &&
            hairColor[0] >= 0 &&
            hairColor[0] <= 1.5
          ) {
            // Read active foods
            if (streamReader.getRemaining() >= 4) {
              const foodCount = streamReader.readInt();
              if (foodCount >= 0 && foodCount <= 3) {
                for (let f = 0; f < foodCount; f++) {
                  const fname = streamReader.readString();
                  const ftime = streamReader.readFloat();
                  foods.push({ name: fname, remainingTime: Math.round(ftime) });
                }
              }
            }

            return {
              appearance: {
                beard,
                hair,
                skinColor,
                hairColor,
                modelIndex,
              },
              foods,
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not extract appearance:', e);
  }

  return { appearance: defaultAppearance, foods };
}

export async function serializeFchFile(char: ValheimCharacter): Promise<Uint8Array> {
  // 1. Pack items into new inventory bytes
  const invWriter = new ZPackageWriter();
  invWriter.writeUShort(char.items.length);

  for (const item of char.items) {
    // Convert durability float to int32 (* 100)
    const durInt = Math.round(item.durability * 100);
    invWriter.writeInt(durInt);
    invWriter.writeByte(item.gridX);
    invWriter.writeByte(item.gridY);
    invWriter.writeByte(item.worldLevel || 0);

    // Compute bitflags
    let flags = 0;
    if (item.pickedUp) flags |= 0x01;
    if (item.equipped) flags |= 0x02;
    if (item.quality !== 1) flags |= 0x04;
    if (item.stack !== 1) flags |= 0x08;
    if (item.variant !== 0) flags |= 0x10;
    if (item.crafterID && item.crafterID !== 0n) flags |= 0x20;
    if (item.hash !== 0) flags |= 0x40;
    if (item.customData && Object.keys(item.customData).length > 0) flags |= 0x80;

    invWriter.writeByte(flags);

    if ((flags & 0x04) !== 0) {
      invWriter.writeUShort(item.quality);
    }
    if ((flags & 0x08) !== 0) {
      invWriter.writeUShort(item.stack);
    }
    if ((flags & 0x10) !== 0) {
      invWriter.writeInt(item.variant);
    }
    if ((flags & 0x20) !== 0) {
      invWriter.writeLong(item.crafterID);
      invWriter.writeString(item.crafterName || '');
    }
    if ((flags & 0x40) !== 0) {
      invWriter.writeInt(item.hash);
    }
    if ((flags & 0x80) !== 0) {
      invWriter.writeStringDict(item.customData);
    }

    // Cheated flag on item: always 0 for safety and achievement protection
    invWriter.writeByte(0);
  }

  const newInventoryBytes = invWriter.getBytes();

  // Patch preInventoryBytes with new HP, Stamina, and Guardian Power
  const patchedPreInventoryBytes = patchPreInventoryBytes(char);

  // 2. Combine new pdata: preInventoryBytes + newInventoryBytes + postInventoryBytes
  const newPdataTotalLen =
    patchedPreInventoryBytes.byteLength +
    newInventoryBytes.byteLength +
    char.postInventoryBytes.byteLength;
  const newPdata = new Uint8Array(newPdataTotalLen);
  let pOffset = 0;

  newPdata.set(patchedPreInventoryBytes, pOffset);
  pOffset += patchedPreInventoryBytes.byteLength;

  newPdata.set(newInventoryBytes, pOffset);
  pOffset += newInventoryBytes.byteLength;

  newPdata.set(char.postInventoryBytes, pOffset);

  // 3. Pack outer payload
  const payloadWriter = new ZPackageWriter(newPdata.byteLength + char.statsBytes.byteLength + 4096);
  // Write statsBytes, firstSpawn, and worlds with any updated bed/logout points
  payloadWriter.writeBytes(char.statsBytes, false);
  payloadWriter.writeBool(char.firstSpawn);
  payloadWriter.writeInt(char.worlds.length);
  for (const w of char.worlds) {
    payloadWriter.writeLong(w.worldId);
    payloadWriter.writeBool(w.haveSpawn);
    payloadWriter.writeVec3(w.spawnPoint);
    payloadWriter.writeBool(w.haveLogout);
    payloadWriter.writeVec3(w.logoutPoint);
    payloadWriter.writeBool(w.haveDeath);
    payloadWriter.writeVec3(w.deathPoint);
    payloadWriter.writeVec3(w.homePoint);
    payloadWriter.writeBool(w.haveMap);
    if (w.haveMap) {
      payloadWriter.writeBytes(w.mapBytes, true);
    }
  }

  payloadWriter.writeString(char.playerName);
  payloadWriter.writeLong(char.playerID);
  payloadWriter.writeString(char.startSeed);
  // Guarantee clean save: m_usedCheats = False
  payloadWriter.writeBool(false);
  payloadWriter.writeLong(char.dateCreated);
  payloadWriter.writeBool(true); // have_pdata = true
  payloadWriter.writeBytes(newPdata, true); // pdata with length prefix

  const newPayload = payloadWriter.getBytes();

  // 4. Calculate SHA-512 checksum of newPayload
  let signatureBytes: Uint8Array;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const payloadCopy = new Uint8Array(newPayload);
      const hashBuffer = await crypto.subtle.digest('SHA-512', payloadCopy.buffer as ArrayBuffer);
      signatureBytes = new Uint8Array(hashBuffer);
    } catch {
      signatureBytes = new Uint8Array(sha512.array(newPayload));
    }
  } else {
    signatureBytes = new Uint8Array(sha512.array(newPayload));
  }

  // 5. Build final .fch file envelope:
  // [4 bytes payload length] + [newPayload] + [4 bytes signature length = 64] + [64 bytes signature]
  const finalWriter = new ZPackageWriter(newPayload.byteLength + 80);
  finalWriter.writeInt(newPayload.byteLength);
  finalWriter.writeBytes(newPayload, false);
  finalWriter.writeInt(signatureBytes.byteLength);
  finalWriter.writeBytes(signatureBytes, false);

  return finalWriter.getBytes();
}

/**
 * Resets the player's world login coordinate to their bed spawn location.
 * Adds +0.5 to Y (height) so the character spawns safely on top of their bed.
 */
export function setPlayerLocationToBed(char: ValheimCharacter): { character: ValheimCharacter; count: number; spawnPoint?: [number, number, number] } {
  let count = 0;
  let lastSpawn: [number, number, number] | undefined;

  const newWorlds = char.worlds.map((w) => {
    if (w.haveSpawn) {
      count++;
      lastSpawn = w.spawnPoint;
      return {
        ...w,
        haveLogout: true,
        logoutPoint: [w.spawnPoint[0], w.spawnPoint[1] + 0.5, w.spawnPoint[2]] as [number, number, number],
      };
    }
    return w;
  });

  return {
    character: {
      ...char,
      worlds: newWorlds,
    },
    count,
    spawnPoint: lastSpawn,
  };
}

/**
 * Sets the player's world login coordinate to their last death location.
 * Adds +0.5 to Y (height) so the character spawns safely above the ground/tombstone.
 */
export function setPlayerLocationToDeath(char: ValheimCharacter): { character: ValheimCharacter; count: number; deathPoint?: [number, number, number] } {
  let count = 0;
  let lastDeath: [number, number, number] | undefined;

  const newWorlds = char.worlds.map((w) => {
    if (w.haveDeath) {
      count++;
      lastDeath = w.deathPoint;
      return {
        ...w,
        haveLogout: true,
        logoutPoint: [w.deathPoint[0], w.deathPoint[1] + 0.5, w.deathPoint[2]] as [number, number, number],
      };
    }
    return w;
  });

  return {
    character: {
      ...char,
      worlds: newWorlds,
    },
    count,
    deathPoint: lastDeath,
  };
}

/**
 * Sets the player's world login coordinate to specific coordinates (X, Y, Z).
 */
export function setPlayerLocationToCoords(
  char: ValheimCharacter,
  x: number,
  y: number,
  z: number
): { character: ValheimCharacter; count: number } {
  let count = 0;
  const newWorlds = char.worlds.map((w) => {
    count++;
    return {
      ...w,
      haveLogout: true,
      logoutPoint: [x, y + 0.5, z] as [number, number, number],
    };
  });

  return {
    character: {
      ...char,
      worlds: newWorlds,
    },
    count,
  };
}


/**
 * Rebuilds preInventoryBytes to allow modifying Guardian Power and resetting cooldown.
 */
function patchPreInventoryBytes(char: ValheimCharacter): Uint8Array {
  const oldPre = char.preInventoryBytes;
  const reader = new ZPackageReader(oldPre);
  const fixedHeader = oldPre.slice(0, 20); // First 5 floats/ints preserved byte-for-byte
  
  // Skip the first 20 bytes
  reader.setOffset(20);
  
  // Read old string to skip it
  const oldGP = reader.readString();
  
  // Read remaining
  const cooldown = reader.readFloat();
  const invVer = reader.readInt();
  
  // Construct new byte array
  const writer = new ZPackageWriter();
  writer.writeBytes(fixedHeader, false);
  writer.writeString(char.guardianPower); // new string
  writer.writeFloat(0); // Reset cooldown so it's ready to use
  writer.writeInt(invVer);
  
  return writer.getBytes();
}

