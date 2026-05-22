const { app } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function unlockPdfPayload(inputPath, password) {
  const qpdfPath = resolveQpdfPath();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "jumipdf-unlock-"));
  const passwordPath = path.join(tempDir, "password.txt");
  const outputPath = path.join(tempDir, "unlocked.pdf");

  try {
    await fs.writeFile(passwordPath, password, "utf8");
    await runQpdf(qpdfPath, [
      "--decrypt",
      "--remove-restrictions",
      `--password-file=${passwordPath}`,
      "--",
      inputPath,
      outputPath
    ]);

    return await fs.readFile(outputPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to unlock PDF.";

    if (/invalid password|incorrect password|supplied password is not correct/i.test(message)) {
      throw new Error("Incorrect password.");
    }

    throw new Error(message);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function resolveQpdfPath() {
  const relativePath = path.join("qpdf", "qpdf.exe");
  const qpdfPath = app.isPackaged
    ? path.join(process.resourcesPath, relativePath)
    : path.join(app.getAppPath(), "tools", relativePath);

  return qpdfPath;
}

function runQpdf(qpdfPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(qpdfPath, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"]
    });
    const stderr = [];

    child.stderr.on("data", (chunk) => {
      stderr.push(chunk);
    });

    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "QPDF is unavailable. Place qpdf.exe and its required files in tools/qpdf before opening locked PDFs."
          )
        );
        return;
      }

      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = Buffer.concat(stderr).toString("utf8").trim();
      reject(new Error(detail || `QPDF failed with exit code ${code}.`));
    });
  });
}

module.exports = {
  resolveQpdfPath,
  runQpdf,
  unlockPdfPayload
};
