import fs from 'fs';
import path from 'path';
import { parseFchFile, serializeFchFile, setPlayerLocationToBed } from '../src/engine/fchParser.ts';
import { getItemByHash, getItemMaxDurability } from '../src/data/items.ts';

const charDir = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
const backupFile = path.join(charDir, 'knut_backup_auto-20261001-132456.fch');
const targetFile = path.join(charDir, 'knut.fch');
const targetOldFile = path.join(charDir, 'knut.fch.old');

console.log('Reading backup:', backupFile);
const backupBytes = fs.readFileSync(backupFile);
const character = await parseFchFile(backupBytes);

console.log(`Original character has ${character.items.length} items.`);

// 1. Repair all items to max durability
let repairedCount = 0;
for (const item of character.items) {
  const cat = getItemByHash(item.hash);
  const maxDur = getItemMaxDurability(item, cat);
  if (maxDur > 0 && item.durability < maxDur) {
    console.log(`  Repairing ${cat?.name || item.hash} (${item.durability} -> ${maxDur})`);
    item.durability = maxDur;
    repairedCount++;
  }
}
console.log(`Repaired ${repairedCount} items to 100% durability.`);

// 2. Set location to bed spawn point
const { character: charAtBed, count: spawnCount, spawnPoint } = setPlayerLocationToBed(character);
console.log(`Set location to bed (${spawnCount} worlds). Spawn Point:`, spawnPoint);

// Also set HP and food if needed
charAtBed.hp = 155.4;
charAtBed.stamina = 50.0;
charAtBed.usedCheats = false;

// 3. Serialize back to .fch bytes
console.log('Serializing character...');
const newBytes = await serializeFchFile(charAtBed);
console.log(`Serialized size: ${newBytes.byteLength} bytes.`);

// 4. Verify by re-parsing the serialized bytes
const verified = await parseFchFile(newBytes);
console.log('--- Verification ---');
console.log('Player name:', verified.playerName);
console.log('Items count:', verified.items.length);
console.log('Used cheats:', verified.usedCheats);
for (const w of verified.worlds || []) {
  console.log(`World ${w.worldId}: haveSpawn=${w.haveSpawn}, haveLogout=${w.haveLogout}, logoutPoint=${w.logoutPoint}`);
}

// 5. Create a safety backup of current knut.fch before overwriting
const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const safetyBackup = path.join(charDir, `knut_backup_before_recovery-${stamp}.fch`);
if (fs.existsSync(targetFile)) {
  fs.copyFileSync(targetFile, safetyBackup);
  console.log('Saved safety backup to:', safetyBackup);
}

// 6. Write to knut.fch and knut.fch.old
fs.writeFileSync(targetFile, Buffer.from(newBytes));
fs.writeFileSync(targetOldFile, Buffer.from(newBytes));

// 7. Update timestamps
const nowSec = Date.now() / 1000;
fs.utimesSync(targetFile, nowSec, nowSec);
fs.utimesSync(targetOldFile, nowSec, nowSec);

console.log('SUCCESS! knut.fch and knut.fch.old updated successfully.');
