// README.md를 사이트 데이터의 단일 소스로 사용한다.
// 형식: "회사명" 줄 다음에 하나 이상의 URL 줄, 섹션은 `---` 구분선으로 나뉜다 (국내 → 해외).

const URL_RE = /^https?:\/\/\S+$/;
const SEPARATOR_RE = /^-{3,}$/;
const REGIONS = ['domestic', 'global'];

// README 표기를 그대로 두되, 화면에는 공식 표기로 보여준다.
const DISPLAY_NAMES = {
  FACEBOOK: 'Facebook',
  APPLE: 'Apple',
  NETFLIX: 'Netflix',
  GOOGLE: 'Google',
  MICROSOFT: 'Microsoft',
  INSTAGRAM: 'Instagram',
  SLACK: 'Slack',
  'RIOT GAMES (ROLE)': 'Riot Games',
  'AMAZON (Alexa)': 'Amazon (Alexa)',
  ZOOM: 'Zoom',
  PAYPAL: 'PayPal',
  ESTSOFT: 'ESTsoft',
  airbnb: 'Airbnb',
  twitter: 'Twitter',
  spotify: 'Spotify',
  GITHUB: 'GitHub',
  'ebay(지마켓, 옥션, G9)': 'eBay (지마켓, 옥션, G9)',
  DropBox: 'Dropbox',
  CLASSMETHOD: 'Classmethod',
};

export function parseReadme(markdown) {
  const blogs = [];
  let section = 0;
  let current = null;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('>')) continue;

    if (SEPARATOR_RE.test(line)) {
      section += 1;
      current = null;
      if (section >= REGIONS.length) break;
      continue;
    }

    if (URL_RE.test(line)) {
      current?.urls.push(toLink(line));
      continue;
    }

    current = { name: DISPLAY_NAMES[line] ?? line, region: REGIONS[section], urls: [] };
    blogs.push(current);
  }

  const orphans = blogs.filter((blog) => blog.urls.length === 0).map((blog) => blog.name);
  if (orphans.length > 0) {
    throw new Error(`URL이 없는 항목이 있습니다 (URL은 한 줄에 하나, 다른 텍스트 없이 적어주세요): ${orphans.join(', ')}`);
  }
  return blogs;
}

// medium.com/daangn 처럼 플랫폼을 공유하는 블로그도 구분되도록 경로까지 표시한다.
function toLink(url) {
  if (!URL.canParse(url)) throw new Error(`잘못된 URL입니다: ${url}`);
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, '');
  return { url, host, label: `${host}${pathname.replace(/\/+$/, '')}` };
}
