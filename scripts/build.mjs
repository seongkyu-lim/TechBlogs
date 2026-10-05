import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { parseReadme } from './parse-readme.mjs';

const root = new URL('../', import.meta.url);
const siteDir = new URL('site/', root);
const distDir = new URL('dist/', root);

const blogs = parseReadme(await readFile(new URL('README.md', root), 'utf8'));
const count = (region) => blogs.filter((blog) => blog.region === region).length;
const stats = { TOTAL: blogs.length, DOMESTIC: count('domestic'), GLOBAL: count('global') };

// JSON을 <script> 안에 넣으므로 `</script>` 조기 종료를 막기 위해 `<`를 이스케이프한다.
const json = JSON.stringify(blogs).replace(/</g, '\\u003c');

const html = (await readFile(new URL('index.html', siteDir), 'utf8'))
  .replace('<!-- BLOG_DATA -->', `<script id="blog-data" type="application/json">${json}</script>`)
  .replace(/\{\{(TOTAL|DOMESTIC|GLOBAL)\}\}/g, (_, key) => String(stats[key]));

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(siteDir, distDir, { recursive: true });
await writeFile(new URL('index.html', distDir), html);
await writeFile(new URL('.nojekyll', distDir), '');

console.log(`dist/ 빌드 완료 — 국내 ${stats.DOMESTIC}곳, 해외 ${stats.GLOBAL}곳`);
