const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  print: (htmlContent) => ipcRenderer.invoke('print', htmlContent),
  onPrintReply: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('print-reply', callback);
      return () => ipcRenderer.removeListener('print-reply', callback);
    }
    return () => { };
  },
  getData: () => ipcRenderer.invoke('get-data'),
  onOpenBillsPage: (callback) => ipcRenderer.on('open-bills-page', callback),
  onOpenUpdaterPage: (callback) => ipcRenderer.on('open-updater-page', callback),
  onOpenExportModal: (callback) => ipcRenderer.on('open-export-modal', callback),
  onOpenPricePage: (callback) => ipcRenderer.on('price-management', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  onDataUpdate: (callback) => {
    const channel = 'data-update';
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
    return () => ipcRenderer.removeListener(channel, callback);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdateDownload: () => ipcRenderer.invoke('start-download'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', callback);
    return () => ipcRenderer.removeListener('update-checking', callback);
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', callback);
    return () => ipcRenderer.removeListener('update-not-available', callback);
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', callback);
    return () => ipcRenderer.removeListener('update-error', callback);
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', callback);
    return () => ipcRenderer.removeListener('update-progress', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  }
});
window.addEventListener('DOMContentLoaded', () => {
 
});