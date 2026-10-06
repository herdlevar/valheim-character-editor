const { app, BrowserWindow, ipcMain, shell, dialog, Menu, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Register custom scheme as privileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow = null;

// Determine Steam character directory on this PC
function getSteamDir() {
  const primaryDir = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
  if (fs.existsSync(primaryDir)) return primaryDir;

  // Search Steam userdata for 892970
  const steamUserData = 'C:\\Program Files (x86)\\Steam\\userdata';
  if (fs.existsSync(steamUserData)) {
    try {
      const userFolders = fs.readdirSync(steamUserData);
      for (const u of userFolders) {
        const candidate = path.join(steamUserData, u, '892970', 'remote', 'characters');
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {}
  }

  // Check local AppData
  const localDir = path.join(
    process.env.USERPROFILE || '',
    'AppData',
    'LocalLow',
    'IronGate',
    'Valheim',
    'characters_local'
  );
  if (fs.existsSync(localDir)) return localDir;

  const legacyLocal = path.join(
    process.env.USERPROFILE || '',
    'AppData',
    'LocalLow',
    'IronGate',
    'Valheim',
    'characters'
  );
  if (fs.existsSync(legacyLocal)) return legacyLocal;

  return primaryDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: 'Valheim Character & Inventory Editor',
    backgroundColor: '#0e1115',
    icon: path.join(__dirname, '../public/icons/walknut_bw.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Remove default menu bar for clean modern game styling
  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL;

  if (isDev && devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadURL('app://./index.html');
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC handlers
ipcMain.handle('api:get-steam-dir', () => {
  return getSteamDir();
});

ipcMain.handle('api:list-characters', () => {
  const charDir = getSteamDir();
  if (!fs.existsSync(charDir)) {
    return { characters: [], dir: charDir };
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
      })
      .sort((a, b) => b.modified - a.modified);

    return { characters, dir: charDir };
  } catch (err) {
    console.error('Failed to list characters:', err);
    return { characters: [], dir: charDir, error: err.message };
  }
});

ipcMain.handle('api:load-character', (event, filename) => {
  const charDir = getSteamDir();
  const safeName = path.basename(filename);
  const filePath = path.join(charDir, safeName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
});

ipcMain.handle('api:save-character', (event, { filename, dataBase64 }) => {
  if (!filename || !dataBase64) {
    throw new Error('Missing filename or dataBase64');
  }

  const charDir = getSteamDir();
  if (!fs.existsSync(charDir)) {
    fs.mkdirSync(charDir, { recursive: true });
  }

  const safeName = path.basename(filename);
  const targetPath = path.join(charDir, safeName);
  const targetOldPath = path.join(charDir, `${safeName}.old`);
  const buffer = Buffer.from(dataBase64, 'base64');

  // 1. Create timestamped safety backup of existing character file
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

  // 3. Update file modification timestamps so Steam Cloud detects the newest save
  const nowSec = Date.now() / 1000;
  fs.utimesSync(targetPath, nowSec, nowSec);
  fs.utimesSync(targetOldPath, nowSec, nowSec);

  return {
    success: true,
    targetPath,
    backupName,
    bytesWritten: buffer.length,
  };
});

ipcMain.handle('api:open-steam-folder', async () => {
  const charDir = getSteamDir();
  if (!fs.existsSync(charDir)) {
    fs.mkdirSync(charDir, { recursive: true });
  }
  await shell.openPath(charDir);
  return { success: true, dir: charDir };
});

ipcMain.handle('api:browse-file', async () => {
  const charDir = getSteamDir();
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Valheim Character Save (.fch)',
    defaultPath: charDir,
    filters: [{ name: 'Valheim Character Save (*.fch)', extensions: ['fch'] }],
    properties: ['openFile'],
  });

  if (res.canceled || res.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = res.filePaths[0];
  const filename = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);

  return {
    canceled: false,
    filePath,
    filename,
    dataBase64: buffer.toString('base64'),
  };
});

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const parsed = new URL(request.url);
    let pathname = decodeURIComponent(parsed.pathname);
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }
    const distPath = path.join(__dirname, '../dist');
    let filePath = path.join(distPath, pathname);

    // Fallback to public folder if asset not found in dist
    if (!fs.existsSync(filePath)) {
      const publicPath = path.join(__dirname, '../public', pathname);
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      }
    }

    return net.fetch(url.pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
