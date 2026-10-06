import { InventoryItem, CharacterAppearance, ActiveFood, ValheimCharacter } from './engine/fchParser';

export type { InventoryItem, CharacterAppearance, ActiveFood, ValheimCharacter };

export interface CatalogItem {
  prefab: string;
  hash: number;
  name: string;
  category: string;
  slotType: string;
  maxStack: number;
  maxDurability: number;
  icon: string;
  weight: number;
  aliases?: string[];
  description?: string;
}

export type ItemCategory =
  | 'all'
  | 'weapons'
  | 'armor'
  | 'shields'
  | 'tools'
  | 'consumables'
  | 'materials'
  | 'trophies'
  | 'valuables'
  | 'utility'
  | 'misc';

export interface LoadoutConfigItem {
  hash: number;
  prefab: string;
  amount: number;
}

export interface LoadoutProfile {
  id: string;
  name: string;
  description?: string;
  bossBuff?: string;
  items: LoadoutConfigItem[];
}

export interface ElectronAPI {
  isElectron: boolean;
  getSteamDir: () => Promise<string>;
  listCharacters: () => Promise<{
    characters: Array<{ filename: string; name: string; size: number; modified: number }>;
    dir: string;
    error?: string;
  }>;
  loadCharacter: (filename: string) => Promise<string>;
  saveCharacter: (
    filename: string,
    dataBase64: string
  ) => Promise<{
    success: boolean;
    targetPath: string;
    backupName: string;
    bytesWritten: number;
  }>;
  openSteamFolder: () => Promise<{ success: boolean; dir: string }>;
  browseFile: () => Promise<{
    canceled: boolean;
    filePath?: string;
    filename?: string;
    dataBase64?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

