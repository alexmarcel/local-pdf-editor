# JumiPDF

JumiPDF is a local desktop PDF page editor built with Electron, React, TypeScript, PDF.js, and pdf-lib.

It keeps PDF files on your machine. There is no upload, account system, or cloud processing.

## Windows Support

JumiPDF ships two Windows installer tracks:

- **Modern:** Windows 10/11, built with the current Electron runtime.
- **Legacy:** Windows 7/8/8.1, built with Electron 22.

Use the modern installer whenever possible. The legacy installer exists for older Windows machines and should be treated as a compatibility build.

## Features

- Open local PDF files with a file picker.
- Drag and drop a local PDF into the app.
- Open password-protected PDFs when you know the password.
- Remove print/edit restrictions from PDFs before editing.
- Preview pages as thumbnails.
- Delete pages.
- Drag pages to rearrange order.
- Rotate pages left or right.
- Undo and redo page operations.
- Save as a new PDF copy.
- Overwrite the original PDF after confirmation.

## Requirements

- Node.js
- npm

If `npm` is not available on your PATH, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" --version
```

## Development

Install dependencies:

```powershell
npm install
```

Start the desktop app in development mode:

```powershell
npm run dev
```

If your terminal cannot find `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## Build

Create the production frontend build:

```powershell
npm run build
```

Create an unpacked Windows 10/11 desktop build:

```powershell
npm run pack
```

The runnable app will be created at:

```text
release/modern/win-unpacked/JumiPDF.exe
```

Create the standard Windows 10/11 installer:

```powershell
npm run dist
```

Or run the explicit modern command:

```powershell
npm run dist:modern
```

Create the Windows 7/8/8.1 legacy installer:

```powershell
npm run dist:legacy
```

Create both Windows installers:

```powershell
npm run dist:all
```

Installer outputs are written to:

```text
release/modern/JumiPDF Setup <version> Windows 10-11 x64.exe
release/legacy/JumiPDF Setup <version> Legacy Win7 x64.exe
```

The legacy installer is built with Electron 22, the final Electron major line that supports Windows 7/8/8.1. Use the modern installer for Windows 10/11 whenever possible.

Legacy compatibility depends on a few project choices:

- `electron-builder.legacy.json` pins packaging to Electron `22.3.27`.
- `vite.config.ts` uses `base: "./"` so packaged `file://` builds load assets from relative paths.
- `src/pdfjs.ts` lazy-loads `pdfjs-dist/legacy` so older Electron versions can show the app UI before PDF.js is needed.
- `electron/main.cjs` disables hardware acceleration on Electron 22 and older to avoid blank windows on older Windows graphics drivers.

On some Windows machines, installer packaging may require developer mode or symlink privileges.

## Locked PDFs

JumiPDF can open locked PDFs by running QPDF locally through the Electron main process. It does not guess or crack unknown passwords.

For development, place the Windows QPDF runtime files here:

```text
tools/qpdf/qpdf.exe
```

Include any DLLs that ship with that QPDF build in the same folder. The modern and legacy Electron Builder configs copy `tools/qpdf/` into packaged app resources as `qpdf/`.

When a locked PDF is opened:

- Password-protected PDFs prompt for the password.
- Print/edit restricted PDFs are unlocked locally before editing.
- Saved edited PDFs are written as unlocked PDFs.

## Project Structure

```text
electron/        Electron main process and preload bridge
build/           Packaging helper scripts and generated app icon
src/             React UI, PDF state logic, and tests
app-icon.png     Source icon used by the app UI and Windows packaging
index.html       Vite HTML entrypoint
package.json     npm scripts and dependencies
```

Generated folders such as `dist/`, `release/`, and `node_modules/` are not source files.

## Test

Run unit tests:

```powershell
npm run test
```

Run TypeScript and production build checks:

```powershell
npm run build
```
