import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const file of ['index.html', 'guide.html', 'style.css', 'app.js', 'icon.svg', '.nojekyll']) {
  await copyFile(new URL(file, import.meta.url), new URL('dist/' + file, import.meta.url));
}
