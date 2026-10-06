import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Path to character save directory
// Priority: 1. CHARACTERS_DIR env var, 2. /characters (container mount), 3. local Steam path, 4. /app/samples fallback
const getCharDir = () => {
  if (process.env.CHARACTERS_DIR && fs.existsSync(process.env.CHARACTERS_DIR)) {
    return process.env.CHARACTERS_DIR;
  }
  if (fs.existsSync('/characters')) {
    return '/characters';
  }
  const winSteam = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
  if (fs.existsSync(winSteam)) {
    return winSteam;
  }
  const sampleDir = path.join(__dirname, 'public', 'samples');
  if (fs.existsSync(sampleDir)) {
    return sampleDir;
  }
  return '/characters';
};

app.use(express.json({ limit: '50mb' }));

// Serve built assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  const dir = getCharDir();
  res.json({
    status: 'ok',
    service: 'valheim-character-editor',
    charactersDir: dir,
    dirExists: fs.existsSync(dir),
    timestamp: new Date().toISOString(),
  });
});

// 1b. Live BepInEx Bridge Proxy
app.all('/api/live/*', async (req, res) => {
  const subPath = req.params[0] || '';
  const targetUrl = `http://127.0.0.1:8765/api/${subPath}`;

  try {
    const isImageRequest = subPath.includes('texture');
    const timeoutMs = isImageRequest ? 15000 : 3500;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, options);
    clearTimeout(timeout);

    const contentType = upstream.headers.get('content-type') || 'application/json';
    if (contentType.startsWith('image/')) {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status).type(contentType).send(buffer);
    } else {
      const data = await upstream.text();
      res.status(upstream.status).type(contentType).send(data);
    }
  } catch (e) {
    res.status(503).json({
      online: false,
      inGame: false,
      message: 'Valheim Live Bridge is offline (game not running or in loading screen)',
    });
  }
});

// 2. List characters
app.get('/api/list-characters', (req, res) => {
  const charDir = getCharDir();
  if (!fs.existsSync(charDir)) {
    return res.json({ characters: [], dir: charDir, warning: 'Directory not found' });
  }

  try {
    const files = fs.readdirSync(charDir);
    const characters = files
      .filter((f) => f.endsWith('.fch') && !f.endsWith('.fch.old') && !f.includes('_backup_'))
      .map((f) => {
        const stat = fs.statSync(path.join(charDir, f));
        return {
          filename: f,
          name: f.replace('.fch', ''),
          size: stat.size,
          modified: stat.mtimeMs,
        };
      });

    res.json({ characters, dir: charDir });
  } catch (e) {
    console.error('Error listing characters:', e);
    res.status(500).json({ error: e.message });
  }
});

// 3. Load character file
app.get('/api/load-character', (req, res) => {
  const filename = req.query.file;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).send('Missing file query parameter');
  }

  const charDir = getCharDir();
  const safeName = path.basename(filename);
  const filePath = path.join(charDir, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Character file not found');
  }

  try {
    const data = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(data);
  } catch (e) {
    console.error(`Error reading ${safeName}:`, e);
    res.status(500).send(e.message);
  }
});

// 4. Save character file directly
app.post('/api/save-character', (req, res) => {
  try {
    const { filename, dataBase64 } = req.body;
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: 'Missing filename or dataBase64' });
    }

    const charDir = getCharDir();
    if (!fs.existsSync(charDir)) {
      fs.mkdirSync(charDir, { recursive: true });
    }

    let safeName = path.basename(filename);
    if (!safeName.endsWith('.fch')) {
      safeName += '.fch';
    }

    const targetPath = path.join(charDir, safeName);
    const targetOldPath = path.join(charDir, `${safeName}.old`);
    const buffer = Buffer.from(dataBase64, 'base64');

    // 1. Create timestamped safety backup of existing file
    let backupName = '';
    if (fs.existsSync(targetPath)) {
      const now = new Date();
      const stamp = now
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .slice(0, 15);
      const base = safeName.replace('.fch', '');
      backupName = `${base}_backup_auto-${stamp}.fch`;
      const backupPath = path.join(charDir, backupName);
      fs.copyFileSync(targetPath, backupPath);
      console.log(`[Save] Created safety backup: ${backupName}`);
    }

    // 2. Write new .fch and .fch.old
    fs.writeFileSync(targetPath, buffer);
    fs.writeFileSync(targetOldPath, buffer);

    // 3. Update file modification timestamps to now so Steam synchronizes immediately
    const nowSec = Date.now() / 1000;
    fs.utimesSync(targetPath, nowSec, nowSec);
    fs.utimesSync(targetOldPath, nowSec, nowSec);

    console.log(`[Save] Successfully saved ${safeName} (${buffer.length} bytes) to ${charDir}`);

    res.json({
      success: true,
      targetPath,
      backupName,
      bytesWritten: buffer.length,
    });
  } catch (e) {
    console.error('Error saving character:', e);
    res.status(500).json({ error: e.message });
  }
});

// Fallback to index.html for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Valheim Character Editor server running on http://0.0.0.0:${PORT}`);
  console.log(`Active character save directory: ${getCharDir()}`);
});
