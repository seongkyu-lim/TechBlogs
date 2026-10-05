import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseReadme } from './parse-readme.mjs';

test('회사명과 URL을 섹션별 지역으로 묶는다', () => {
  const blogs = parseReadme(`# 제목
### 안내

카카오

https://tech.kakao.com

--------

spotify

https://engineering.atspotify.com/
https://research.atspotify.com/

----------

지속해서 업데이트 될 예정입니다.
`);

  assert.deepEqual(blogs, [
    { name: '카카오', region: 'domestic', urls: [{ url: 'https://tech.kakao.com', host: 'tech.kakao.com', label: 'tech.kakao.com' }] },
    {
      name: 'Spotify',
      region: 'global',
      urls: [
        { url: 'https://engineering.atspotify.com/', host: 'engineering.atspotify.com', label: 'engineering.atspotify.com' },
        { url: 'https://research.atspotify.com/', host: 'research.atspotify.com', label: 'research.atspotify.com' },
      ],
    },
  ]);
});

test('인용문은 건너뛰고 www 접두사 없이 경로까지 표시한다', () => {
  const blogs = parseReadme('> 사이트 안내 https://example.com\n\n당근마켓\n\nhttps://www.medium.com/daangn/\n');
  assert.deepEqual(blogs, [
    {
      name: '당근마켓',
      region: 'domestic',
      urls: [{ url: 'https://www.medium.com/daangn/', host: 'medium.com', label: 'medium.com/daangn' }],
    },
  ]);
});

test('URL 형식이 잘못된 항목이 있으면 빌드를 실패시킨다', () => {
  assert.throws(() => parseReadme('토스\n\nhttps://toss.tech (기술 블로그)\n'), /토스/);
  assert.throws(() => parseReadme('토스\n\n- https://toss.tech\n'), /URL이 없는 항목/);
});

test('실제 README를 빠짐없이 파싱한다', async () => {
  const blogs = parseReadme(await readFile(new URL('../README.md', import.meta.url), 'utf8'));
  const domestic = blogs.filter((blog) => blog.region === 'domestic');
  const global = blogs.filter((blog) => blog.region === 'global');

  assert.ok(domestic.length >= 40, `국내 ${domestic.length}곳`);
  assert.ok(global.length >= 20, `해외 ${global.length}곳`);
  assert.ok(blogs.every((blog) => blog.urls.length > 0 && !blog.name.startsWith('http')));
  assert.ok(!blogs.some((blog) => blog.name.includes('업데이트')));
});
