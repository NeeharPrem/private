import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import log from 'electron-log';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('Application Starting...');
log.info(`Running in ${isDev ? 'development' : 'production'} mode`);

autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const appVersion = app.getVersion();

function setupAutoUpdater(mainWindow) {
    if (isDev) {
        log.info('Auto-updater disabled in development mode');
        return;
    }

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
        mainWindow.webContents.send('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info);
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available:', info);
        mainWindow.webContents.send('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('Update error:', err);
        mainWindow.webContents.send('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const { bytesPerSecond, percent, transferred, total } = progressObj;
        log.info('Download progress:', percent);
        mainWindow.webContents.send('update-progress', {
            bytesPerSecond,
            percent,
            transferred,
            total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded:', info);
        mainWindow.webContents.send('update-downloaded', info);
    });
}

function simplifiedMonitorPrintJob(jobId) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 0.1;
        log.info(`Estimated print progress: ${Math.min(progress * 100, 100).toFixed(1)}%`);
        if (progress >= 1) {
            clearInterval(interval);
            log.info('Estimated print completion');
            ipcMain.emit('print-completed', { jobId, estimated: true });
        }
    }, 1000);
    const estimatedPrintTime = 18000 + Math.random() * 18000;
    setTimeout(() => {
        clearInterval(interval);
        log.info('Print job likely completed');
        ipcMain.emit('print-completed', { jobId, estimated: false });
    }, estimatedPrintTime);
}

function loadProductionBuild(mainWindow) {
    log.info('Loading production build...');
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(err => {
        log.error('Failed to load app:', err);
        app.quit();
    });
}

let mainWindow;

async function waitForViteServer(mainWindow, retries = 30, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await mainWindow.loadURL('http://localhost:3000');
            log.info('Successfully connected to Vite dev server');
            return;
        } catch (err) {
            log.info(`Failed to connect to Vite dev server. Attempt ${i + 1}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Failed to connect to Vite dev server after multiple attempts');
}

function createWindow() {
    log.info('Creating main window...');
    const preloadPath = path.join(__dirname, 'preload.js');
    log.info(`Preload path: ${preloadPath}`);

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
            sandbox: true,
            webSecurity: !isDev,
            devTools: true
        },
    });
    log.info('Main window created');
    setupAutoUpdater(mainWindow);

    if (isDev) {
        log.info('Attempting to connect to development server...');
        waitForViteServer(mainWindow)
            .then(() => {
                log.info('Development server connected, opening DevTools');
                mainWindow.webContents.openDevTools();
                if (process.env.REACT_DEVTOOLS_PATH) {
                    BrowserWindow.addDevToolsExtension(process.env.REACT_DEVTOOLS_PATH);
                }
            })
            .catch(err => {
                log.error('Failed to load dev server:', err);
                loadProductionBuild(mainWindow);
            });
    } else {
        loadProductionBuild(mainWindow);
        setTimeout(() => {
            log.info('Checking for updates...');
            autoUpdater.checkForUpdates().catch(err => {
                log.error('Error checking for updates:', err);
            });
        }, 3000);
    }

    mainWindow.webContents.on('did-finish-load', () => {
        log.info('Main window finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error('Page failed to load:', errorCode, errorDescription);
    });

    mainWindow.on('close', (e) => {
        if (isDev) {
            log.info('Preventing window close in development mode');
            e.preventDefault();
            mainWindow.hide();
        }
    });

    ipcMain.handle('check-for-updates', async () => {
        if (!app.isPackaged) {
            return { status: 'disabled', message: 'Auto-updates are disabled in development' };
        }
        try {
            return await autoUpdater.checkForUpdates();
        } catch (error) {
            log.error('Failed to check for updates:', error);
            throw error;
        }
    });

    ipcMain.handle('start-download', async () => {
        try {
            await autoUpdater.downloadUpdate();
            return { status: 'success' };
        } catch (error) {
            log.error('Failed to start download:', error);
            throw error;
        }
    });

    ipcMain.handle('quit-and-install', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('print', async (event,htmlContent) => {
        log.info('Print request received');
        try {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                }
            });

            const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { margin: 0; font-family: Helvetica, Arial, sans-serif; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .item-end { align-items: flex-end; }
                    .item-start { align-items: flex-start; }
                    .text-black { color: black; }
                    .text-sm { font-size: 0.875rem; }
                    .font-semibold { font-weight: 600; }
                    .mt-2 { margin-top: 0.5rem; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlTemplate)}`);

            return new Promise((resolve) => {
                const printOptions = {
                    silent: true,
                    printBackground: true,
                    color: false,
                    margin: { marginType: 'none' },
                    landscape: false,
                    pagesPerSheet: 1,
                    collate: false,
                    copies: 1,
                    header: '',
                    footer: '',
                    pageSize: {
                        width: 105000,
                        height: 148000,
                    }
                };

                win.webContents.print(printOptions, (success, failureReason) => {
                    if (success) {
                        const jobId = Date.now();
                        log.info(`Print job initiated with ID: ${jobId}`);
                        simplifiedMonitorPrintJob(jobId);
                        win.close();
                        resolve({ success: true, jobId, message: 'Print Initiated' });
                    } else {
                        log.error(`Print failed: ${failureReason}`);
                        win.close();
                        resolve({ success: false, message: failureReason });
                    }
                });
            });
        } catch (error) {
            log.error('Print error:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('print-to-pdf', async (event, options) => {
        log.info('Print to PDF request received');
        try {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                }
            });

            const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { margin: 0; font-family: Helvetica, Arial, sans-serif; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .item-end { align-items: flex-end; }
                    .item-start { align-items: flex-start; }
                    .text-black { color: black; }
                    .text-sm { font-size: 0.875rem; }
                    .font-semibold { font-weight: 600; }
                    .mt-2 { margin-top: 0.5rem; }
                </style>
            </head>
            <body>
                ${options.htmlContent}
            </body>
            </html>
        `;
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlTemplate)}`);


            const formatDate = (date) => {
                return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            }
            const formated = formatDate(new Date())
            const documentsPath = app.getPath('documents');
            const newPath = path.join(documentsPath, formated.replace(/\//g, path.sep));
            try {
                await fs.access(newPath);
            } catch {
                await fs.mkdir(newPath, { recursive: true });
            }

            const pdfPath = path.join(documentsPath, options.fileName || 'print.pdf');
            log.info(`Printing to PDF: ${pdfPath}`);

            const data = await win.webContents.printToPDF({
                printBackground: true,
                margins: {
                    marginType: 'none'
                },
                pageSize: 'A6',
                printSelectionOnly: false,
                landscape: false
            });

            await fs.writeFile(pdfPath, data);
            win.close();

            log.info('PDF created successfully');
            return { success: true, message: `Printed to: ${pdfPath}` };
        } catch (error) {
            log.error('Printing to PDF failed:', error);
            return { success: false, error: error.message };
        }
    });
}

const customMenu = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Reload',
                click: () => {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.reload();
                    } else {
                        console.error('Main window or webContents not defined.');
                    }
                }
            },
            {
                label: 'Export/import data',
                click: () => {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('open-export-modal');
                    } else {
                        console.error('Main window or webContents not defined.');
                    }
                }
            },
            { role: 'close' },
        ]
    },
    {
        label: 'Bills',
        submenu: [
            {
                label: 'Open Bills Page',
                click: () => {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('open-bills-page');
                    } else {
                        console.error('Main window or webContents not defined.');
                    }
                }
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'Check for Updates',
                click: () => {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('open-updater-page');
                    } else {
                        console.error('Main window or webContents not defined.');
                    }
                }
            },
            { type: 'separator' },
            {
                label: `Version ${appVersion}`,
                enabled: false
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(customMenu);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
    log.info('App is ready, creating window...');
    createWindow();
});

app.on('activate', () => {
    log.info('App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
        log.info('No windows found, creating new window');
        createWindow();
    }
});

app.on('window-all-closed', () => {
    log.info('All windows closed');
    if (process.platform !== 'darwin') {
        log.info('Quitting app');
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    app.quit();
});

app.allowRendererProcessReuse = true;