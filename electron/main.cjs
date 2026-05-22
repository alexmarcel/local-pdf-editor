const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { unlockPdfPayload } = require("./pdfUnlock.cjs");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const electronMajor = Number(process.versions.electron.split(".")[0]);

if (electronMajor <= 22) {
  app.disableHardwareAcceleration();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: "JumiPDF",
    width: 1180,
    height: 780,
    minWidth: 840,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: "#f7f5f0",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("pdf:open-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "PDF files", extensions: ["pdf"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return readPdfPayload(result.filePaths[0]);
});

ipcMain.handle("pdf:read-path", async (_event, filePath) => {
  return readPdfPayload(filePath);
});

ipcMain.handle("pdf:unlock", async (_event, filePath, password) => {
  assertPdfPath(filePath, "Please choose a PDF file.");
  const unlockedBytes = await unlockPdfPayload(filePath, String(password ?? ""));

  return {
    path: filePath,
    file_name: path.basename(filePath),
    bytes_base64: unlockedBytes.toString("base64")
  };
});

ipcMain.handle("pdf:save-as", async (_event, bytesBase64, suggestedName) => {
  const result = await dialog.showSaveDialog({
    defaultPath: suggestedName,
    filters: [{ name: "PDF files", extensions: ["pdf"] }]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await writePdfPayload(result.filePath, bytesBase64);
  return { path: result.filePath };
});

ipcMain.handle("pdf:overwrite", async (_event, filePath, bytesBase64) => {
  await writePdfPayload(filePath, bytesBase64);
  return { path: filePath };
});

async function readPdfPayload(filePath) {
  assertPdfPath(filePath, "Please choose a PDF file.");
  const bytes = await fs.readFile(filePath);

  return {
    path: filePath,
    file_name: path.basename(filePath),
    bytes_base64: bytes.toString("base64")
  };
}

async function writePdfPayload(filePath, bytesBase64) {
  assertPdfPath(filePath, "Please save the edited file with a .pdf extension.");
  await fs.writeFile(filePath, Buffer.from(bytesBase64, "base64"));
}

function assertPdfPath(filePath, message) {
  if (path.extname(filePath).toLowerCase() !== ".pdf") {
    throw new Error(message);
  }
}
