import fs from 'fs';
import crypto from 'crypto';

// Polyfill crypto.subtle in Node if needed
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

// Simple test using the compiled / translated logic
import { parseFchFile, serializeFchFile } from './src/engine/fchParser.ts';

async function run() {
  const fchPath = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters\\knut.fch';
  const buffer = fs.readFileSync(fchPath);
  console.log('Read original file size:', buffer.length);

  const char = await parseFchFile(buffer);
  console.log('Parsed character name:', char.playerName);
  console.log('Items count:', char.items.length);
  console.log('Hair:', char.appearance.hair, 'Beard:', char.appearance.beard);
  console.log('Skin color:', char.appearance.skinColor);
  console.log('Foods:', char.foods);

  // Serialize back
  const newBytes = await serializeFchFile(char);
  console.log('Serialized new bytes size:', newBytes.length);

  // Re-parse the newly serialized bytes
  const reloaded = await parseFchFile(newBytes);
  console.log('Reloaded name:', reloaded.playerName);
  console.log('Reloaded items count:', reloaded.items.length);

  // Verify each item matches
  let allMatched = true;
  for (let i = 0; i < char.items.length; i++) {
    const orig = char.items[i];
    const rel = reloaded.items[i];
    if (orig.hash !== rel.hash || orig.gridX !== rel.gridX || orig.gridY !== rel.gridY || orig.stack !== rel.stack) {
      console.error(`Mismatch at item ${i}:`, orig, rel);
      allMatched = false;
    }
  }
  if (allMatched) {
    console.log('SUCCESS: Roundtrip verification 100% matched!');
  }
}

run().catch(console.error);
