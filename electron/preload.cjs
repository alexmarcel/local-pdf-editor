const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pdfApi", {
  openPdf: () => ipcRenderer.invoke("pdf:open-dialog"),
  readPdfFromPath: (path) => ipcRenderer.invoke("pdf:read-path", path),
  savePdfAs: (bytesBase64, suggestedName) =>
    ipcRenderer.invoke("pdf:save-as", bytesBase64, suggestedName),
  overwritePdf: (path, bytesBase64) => ipcRenderer.invoke("pdf:overwrite", path, bytesBase64)
});
