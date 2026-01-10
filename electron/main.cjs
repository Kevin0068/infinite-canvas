const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// 开发模式检测 - 只有明确设置 NODE_ENV=development 时才是开发模式
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// 配置自动更新
function setupAutoUpdater() {
  // 使用 GitHub Releases 作为更新源
  // 会自动从 package.json 的 publish 配置读取
  // 如果需要手动设置，取消下面的注释：
  // autoUpdater.setFeedURL({
  //   provider: 'github',
  //   owner: 'YOUR_GITHUB_USERNAME',
  //   repo: 'infinite-canvas',
  // });

  // 禁用自动下载，让用户确认后再下载
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 检查更新出错
  autoUpdater.on('error', (error) => {
    console.error('更新错误:', error);
  });

  // 检查到新版本
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}`,
      detail: '是否立即下载更新？',
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
        mainWindow?.webContents.send('update-downloading');
      }
    });
  });

  // 没有新版本
  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本');
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', progress.percent);
  });

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '重启应用以完成更新。',
      buttons: ['立即重启', '稍后重启'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 非开发模式下检查更新
  if (!isDev) {
    // 启动后延迟 3 秒检查更新
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('检查更新失败:', err);
      });
    }, 3000);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '无限画布',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#1a1a1a',
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 设置菜单
  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getMenuTemplate() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建画布',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new'),
        },
        {
          label: '打开草稿...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [{ name: 'JSON 草稿', extensions: ['json'] }],
              properties: ['openFile'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('menu-open', result.filePaths[0]);
            }
          },
        },
        {
          label: '保存草稿',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        { type: 'separator' },
        {
          label: '导出图片...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-export'),
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新...',
          click: () => {
            if (!isDev) {
              autoUpdater.checkForUpdates().then((result) => {
                if (!result || !result.updateInfo) {
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '检查更新',
                    message: '当前已是最新版本',
                  });
                }
              }).catch((err) => {
                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: '检查更新失败',
                  message: '无法连接到更新服务器',
                  detail: err.message,
                });
              });
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '开发模式',
                message: '开发模式下不检查更新',
              });
            }
          },
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于无限画布',
              message: '无限画布 v1.0.0',
              detail: '一个支持图片和视频的无限画布应用。\n\n功能：上传、拖动、合并、导出、保存草稿。',
            });
          },
        },
      ],
    },
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    });
  }

  return template;
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

// IPC: 手动检查更新
ipcMain.handle('check-for-updates', async () => {
  if (!isDev) {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      console.error('检查更新失败:', error);
      return null;
    }
  }
  return null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
