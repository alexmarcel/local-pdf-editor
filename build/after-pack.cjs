const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const projectDir = context.packager.projectDir;
  const iconPath = path.join(projectDir, "build", "app-icon.ico");
  const exePath = findAppExecutable(context.appOutDir, context.packager.appInfo.productFilename);
  const rceditPath = findRcedit();

  execFileSync(rceditPath, [exePath, "--set-icon", iconPath], { stdio: "inherit" });
};

function findAppExecutable(appOutDir, productFilename) {
  const preferredPath = path.join(appOutDir, `${productFilename}.exe`);

  if (fs.existsSync(preferredPath)) {
    return preferredPath;
  }

  const exePath = fs
    .readdirSync(appOutDir)
    .find((fileName) => fileName.toLowerCase().endsWith(".exe"));

  if (!exePath) {
    throw new Error(`Unable to find packaged executable in ${appOutDir}`);
  }

  return path.join(appOutDir, exePath);
}

function findRcedit() {
  const cacheDir = path.join(process.env.LOCALAPPDATA || "", "electron-builder", "Cache", "winCodeSign");

  if (!fs.existsSync(cacheDir)) {
    throw new Error(`Unable to find Electron Builder winCodeSign cache at ${cacheDir}`);
  }

  for (const cacheEntry of fs.readdirSync(cacheDir)) {
    const candidate = path.join(cacheDir, cacheEntry, "rcedit-x64.exe");

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find rcedit-x64.exe in ${cacheDir}`);
}
