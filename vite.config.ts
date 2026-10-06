import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function valheimSavePlugin(): Plugin {
  // Discover characters directory on this PC
  const primaryDir = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
  const getCharDir = (): string => {
    if (fs.existsSync(primaryDir)) return primaryDir;
    // Check local AppData
    const local = path.join(process.env.USERPROFILE || '', 'AppData', 'LocalLow', 'IronGate', 'Valheim', 'characters_local');
    if (fs.existsSync(local)) return local;
    return primaryDir;
  };

  return {
    name: 'valheim-save-api',
    configureServer(server) {
      // 1. List characters
      server.middlewares.use('/api/list-characters', (req, res) => {
        const charDir = getCharDir();
        if (!fs.existsSync(charDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ characters: [], dir: charDir }));
          return;
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

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ characters, dir: charDir }));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // 2. Load character
      server.middlewares.use('/api/load-character', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost:3000');
        const filename = url.searchParams.get('file');
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing file parameter');
          return;
        }

        const charDir = getCharDir();
        const safeName = path.basename(filename);
        const filePath = path.join(charDir, safeName);

        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Character file not found');
          return;
        }

        try {
          const data = fs.readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${safeName}"`,
          });
          res.end(data);
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(e.message);
        }
      });

      // 3. Save character directly to game folder
      server.middlewares.use('/api/save-character', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { filename, dataBase64 } = JSON.parse(body);
            if (!filename || !dataBase64) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing filename or data' }));
              return;
            }

            const charDir = getCharDir();
            if (!fs.existsSync(charDir)) {
              fs.mkdirSync(charDir, { recursive: true });
            }

            const safeName = path.basename(filename);
            const targetPath = path.join(charDir, safeName);
            const targetOldPath = path.join(charDir, `${safeName}.old`);

            const buffer = Buffer.from(dataBase64, 'base64');

            // 1. Create timestamped safety backup of the existing character file
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
            }

            // 2. Write new .fch and .fch.old
            fs.writeFileSync(targetPath, buffer);
            fs.writeFileSync(targetOldPath, buffer);

            // 3. Update file modification timestamps to now so Steam recognizes the new save
            const nowSec = Date.now() / 1000;
            fs.utimesSync(targetPath, nowSec, nowSec);
            fs.utimesSync(targetOldPath, nowSec, nowSec);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                targetPath,
                backupName,
                bytesWritten: buffer.length,
              })
            );
          } catch (e: any) {
            console.error('Error saving character:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // 4. Save/Sync blueprint to PlanBuild directory
      server.middlewares.use('/api/planbuild-sync', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { name, content } = JSON.parse(body);
            if (!name || !content) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing name or content' }));
              return;
            }

            const bpDir = 'D:\\SteamLibrary\\steamapps\\common\\Valheim\\BepInEx\\config\\PlanBuild\\blueprints';
            if (!fs.existsSync(bpDir)) {
              fs.mkdirSync(bpDir, { recursive: true });
            }

            const safeName = name.replace(/[<>:"/\\|?*]/g, '_').trim();
            const filePath = path.join(bpDir, `${safeName}.blueprint`);
            fs.writeFileSync(filePath, content, 'utf8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, filePath, name: safeName }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), valheimSavePlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
