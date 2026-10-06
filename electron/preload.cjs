const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSteamDir: () => ipcRenderer.invoke('api:get-steam-dir'),
  listCharacters: () => ipcRenderer.invoke('api:list-characters'),
  loadCharacter: (filename) => ipcRenderer.invoke('api:load-character', filename),
  saveCharacter: (filename, dataBase64) =>
    ipcRenderer.invoke('api:save-character', { filename, dataBase64 }),
  openSteamFolder: () => ipcRenderer.invoke('api:open-steam-folder'),
  browseFile: () => ipcRenderer.invoke('api:browse-file'),
});
