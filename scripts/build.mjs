import { mkdir, rm, copyFile } from 'fs/promises';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const rootFiles = [
  'index.html',
  'manifest.json',
  'sw.js'
];

/**
 * Recursively copies a directory preserving its structure.
 * Falls back to manual copy for environments without fs.cp support.
 * @param {string} from
 * @param {string} to
 */
async function copyDir(from, to) {
  if (typeof fs.cp === 'function') {
    await fs.cp(from, to, { recursive: true });
    return;
  }

  await mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }));
}

async function ensureDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
}

async function copyRootFiles() {
  await Promise.all(rootFiles.map(async (file) => {
    const srcPath = path.join(projectRoot, file);
    const destPath = path.join(distDir, file);
    try {
      await copyFile(srcPath, destPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Skipping missing file: ${file}`);
        return;
      }
      throw error;
    }
  }));
}

async function build() {
  console.log('[build] Preparing distribution directory...');
  await ensureDist();

  console.log('[build] Copying static assets...');
  await copyDir(path.join(projectRoot, 'public'), path.join(distDir, 'public'));

  console.log('[build] Copying application source for module imports...');
  await copyDir(path.join(projectRoot, 'src'), path.join(distDir, 'src'));

  console.log('[build] Copying root files...');
  await copyRootFiles();

  console.log('[build] Complete. Distribution ready at dist/');
}

build().catch((error) => {
  console.error('[build] Failed:', error);
  process.exitCode = 1;
});
