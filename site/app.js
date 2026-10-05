(() => {
  const REGION_LABEL = { domestic: '국내', global: '해외' };
  const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

  const blogs = JSON.parse(document.getElementById('blog-data').textContent).map((blog, order) => ({
    ...blog,
    order,
    hue: hashHue(blog.name),
    haystack: normalize(`${blog.name} ${blog.urls.map((u) => u.label).join(' ')}`),
    initials: toChosung(blog.name.replace(/\s/g, '')),
  }));

  const $search = document.getElementById('search');
  const $sort = document.getElementById('sort');
  const $grid = document.getElementById('grid');
  const $meta = document.getElementById('result-meta');
  const $empty = document.getElementById('empty');
  const $template = document.getElementById('card-template');
  const $regionButtons = [...document.querySelectorAll('[data-region]')];

  const params = new URLSearchParams(location.search);
  const state = {
    query: params.get('q') ?? '',
    region: REGION_LABEL[params.get('region')] ? params.get('region') : 'all',
    sort: params.get('sort') === 'name' ? 'name' : 'curated',
  };
  let visible = [];

  $search.value = state.query;
  $sort.value = state.sort;

  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, '');
  }

  function toChosung(text) {
    return [...text].map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSUNG[Math.floor(code / 588)] : ch.toLowerCase();
    }).join('');
  }

  function hashHue(text) {
    let hash = 0;
    for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash % 360;
  }

  function isChosung(query) {
    return /^[ㄱ-ㅎ]+$/.test(query);
  }

  function matches(blog, query) {
    if (!query) return true;
    if (isChosung(query)) return blog.initials.includes(query);
    return blog.haystack.includes(query);
  }

  function highlight(target, text, query) {
    const index = query && !isChosung(query) ? text.toLowerCase().indexOf(query) : -1;
    if (index < 0) {
      target.textContent = text;
      return;
    }
    const mark = document.createElement('mark');
    mark.textContent = text.slice(index, index + query.length);
    target.replaceChildren(text.slice(0, index), mark, text.slice(index + query.length));
  }

  function createCard(blog, index, query) {
    const card = $template.content.firstElementChild.cloneNode(true);
    const [primary, ...extra] = blog.urls;
    card.style.setProperty('--hue', blog.hue);
    card.style.setProperty('--i', index);
    card.dataset.order = blog.order;

    const img = card.querySelector('img');
    img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(primary.host)}&sz=64`;
    img.addEventListener('error', () => img.classList.add('is-broken'), { once: true });
    card.querySelector('.monogram').textContent = [...blog.name][0].toUpperCase();
    card.querySelector('.tag').textContent = REGION_LABEL[blog.region];

    const link = card.querySelector('.card-link');
    link.href = primary.url;
    highlight(link, blog.name, query);
    highlight(card.querySelector('.card-host'), primary.label, query);

    const $extra = card.querySelector('.card-extra');
    for (const { url, label } of extra) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label;
      $extra.append(a);
    }
    return card;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (state.query) next.set('q', state.query);
    if (state.region !== 'all') next.set('region', state.region);
    if (state.sort !== 'curated') next.set('sort', state.sort);
    const qs = next.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function render() {
    const query = normalize(state.query);
    visible = blogs.filter((blog) => (state.region === 'all' || blog.region === state.region) && matches(blog, query));
    if (state.sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    $grid.replaceChildren(...visible.map((blog, i) => createCard(blog, i, query)));
    $empty.hidden = visible.length > 0;
    $meta.innerHTML = `<strong>${visible.length}</strong>개의 블로그${state.query ? '가 검색됐어요' : ''}`;

    $regionButtons.forEach((btn) => btn.setAttribute('aria-checked', String(btn.dataset.region === state.region)));
    syncUrl();
  }

  function setQuery(value) {
    $search.value = value;
    state.query = value.trim();
    render();
  }

  $search.addEventListener('input', () => setQuery($search.value));

  $sort.addEventListener('change', () => {
    state.sort = $sort.value;
    render();
  });

  $regionButtons.forEach((btn) => btn.addEventListener('click', () => {
    state.region = btn.dataset.region;
    render();
  }));

  // radiogroup 키보드 탐색
  document.querySelector('.segmented').addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = $regionButtons.findIndex((btn) => btn.dataset.region === state.region);
    const next = $regionButtons[(current + step + $regionButtons.length) % $regionButtons.length];
    next.focus();
    next.click();
  });

  document.getElementById('random').addEventListener('click', () => {
    const pool = visible.length ? visible : blogs;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const card = $grid.querySelector(`[data-order="${pick.order}"]`);
    $grid.querySelectorAll('.is-picked').forEach((el) => el.classList.remove('is-picked'));
    card?.classList.add('is-picked');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.open(pick.urls[0].url, '_blank', 'noopener');
  });

  document.addEventListener('keydown', (event) => {
    const typing = event.target.closest?.('input, textarea, select');
    if (event.key === '/' && !typing) {
      event.preventDefault();
      $search.focus();
    } else if (event.key === 'Escape' && event.target === $search) {
      setQuery('');
    }
  });

  // 테마: 시스템 설정을 기본으로, 토글 시에만 저장
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
  });

  // 스크롤 시 툴바 하단 경계선
  const $toolbar = document.getElementById('toolbar');
  const sentinel = document.createElement('div');
  $toolbar.before(sentinel);
  new IntersectionObserver(([entry]) => $toolbar.classList.toggle('is-stuck', !entry.isIntersecting)).observe(sentinel);

  // GitHub 스타 수 (실패하면 조용히 숨김)
  fetch('https://api.github.com/repos/seongkyu-lim/TechBlogs')
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(({ stargazers_count: stars }) => {
      const $stars = document.getElementById('star-count');
      $stars.textContent = stars.toLocaleString('ko-KR');
      $stars.hidden = false;
    })
    .catch(() => {});

  render();
})();
