// Generates the Recent Activity constellation and the contribution skyline as themed SVGs.
// Run by .github/workflows/recent.yml. Needs GH_TOKEN, OWNER, SELF. Node 18+, no dependencies.
import fs from 'node:fs';
import path from 'node:path';
const { OWNER, SELF, GH_TOKEN } = process.env;
const FONT = JSON.parse(fs.readFileSync(new URL('./fonts.json', import.meta.url), 'utf8')).css;
const H = { Authorization: 'Bearer ' + GH_TOKEN, 'User-Agent': 'profile-activity', Accept: 'application/vnd.github+json' };
const api = async p => { const r = await fetch('https://api.github.com/' + p, { headers: H }); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); };
const OUT = process.env.OUT_DIR || 'assets';
fs.mkdirSync(OUT, { recursive: true });

function recentKit(data, FONT) {
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
const ago = iso => { const h = Math.max(1, Math.round((Date.now() - new Date(iso)) / 36e5)); return h < 48 ? h + 'h ago' : Math.round(h / 24) + 'd ago'; };
const serif = "'Cormorant Garamond', Georgia, serif", mono = "'JetBrains Mono', Consolas, monospace";
const LANG = { Python: '#5b8fc7', JavaScript: '#d9b84a', 'Jupyter Notebook': '#d9833a' };
const short = l => l === 'Jupyter Notebook' ? 'Jupyter' : l;
const lc = l => LANG[l] || '#9a9484';
const T = {
  dark: { bg1: '#0b0e2a', bg2: '#04050e', card: '#121741', ink: '#f3efe6', body: '#c3c2d6', mute: '#9a99b4', brass: '#b89c60', hi: '#e2d3a6', onGold: '#0b0e2a', edge: .34, dust: '#8e8ad8', dustO: .1, starO: .5, dark: true },
  light: { bg1: '#f9f2e1', bg2: '#ecdcb4', card: '#fbf6e8', ink: '#2a1e0e', body: '#4a3a22', mute: '#7a6a4c', brass: '#a07838', hi: '#7a5a1c', onGold: '#fff8e6', edge: .5, dust: '#c8a050', dustO: .16, starO: .3, dark: false },
};
const packName = n => { const parts = n.match(/[^-]+-?/g); const lines = []; let cur = ''; parts.forEach(p => { if ((cur + p).length > 17 && cur) { lines.push(cur); cur = p; } else cur += p; }); lines.push(cur); return lines.slice(0, 2); };

function sparkle(x, y, r, t, o = 1) { return `<path d="M${x} ${y - r * 1.6}L${x + r * .34} ${y - r * .34}L${x + r * 1.6} ${y}L${x + r * .34} ${y + r * .34}L${x} ${y + r * 1.6}L${x - r * .34} ${y + r * .34}L${x - r * 1.6} ${y}L${x - r * .34} ${y - r * .34}Z" fill="${t.hi}" opacity="${o}"/><circle cx="${x}" cy="${y}" r="${r * .32}" fill="#fff" opacity=".95"/>`; }
function ring(x, y, R, days, t) {
  const mx = Math.max(1, ...days); let s = `<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${t.brass}" stroke-opacity=".22" stroke-width=".8"/>`;
  days.forEach((n, i) => { const a = (i / 30) * Math.PI * 2 - Math.PI / 2, len = n ? 4 + 5 * n / mx : 2, r1 = R, r2 = R + len; s += `<line x1="${x + Math.cos(a) * r1}" y1="${y + Math.sin(a) * r1}" x2="${x + Math.cos(a) * r2}" y2="${y + Math.sin(a) * r2}" stroke="${n ? t.hi : t.brass}" stroke-opacity="${n ? .95 : .25}" stroke-width="${n ? 1.8 : 1}" stroke-linecap="round"/>`; });
  return s;
}
function pip(x, y, t, bubble) {
  return `<g transform="translate(${x} ${y})"><animateTransform attributeName="transform" type="translate" values="${x} ${y};${x} ${y - 5};${x} ${y}" dur="2.4s" repeatCount="indefinite"/>
<rect x="-12" y="-14" width="24" height="26" rx="8" fill="${t.hi}"/><rect x="-14" y="-6" width="5" height="9" rx="2.5" fill="${t.brass}"/><rect x="9" y="-6" width="5" height="9" rx="2.5" fill="${t.brass}"/>
<rect x="-6" y="-7" width="3.4" height="9" rx="1.7" fill="${t.onGold}"/><rect x="2.6" y="-7" width="3.4" height="9" rx="1.7" fill="${t.onGold}"/><path d="M-3 6q3 2.5 6 0" stroke="${t.onGold}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${bubble ? `<g transform="translate(18 -30)"><rect width="82" height="22" rx="11" fill="${t.card}" stroke="${t.brass}" stroke-opacity=".6"/><path d="M10 22 L6 29 L18 22Z" fill="${t.card}" stroke="${t.brass}" stroke-opacity=".6"/><rect x="4" y="19" width="16" height="4" fill="${t.card}"/><text x="41" y="15" text-anchor="middle" font-family="${mono}" font-size="10" letter-spacing="1" fill="${t.hi}">just pushed</text></g>` : ''}</g>`;
}
function bgFx(W, H, t, seed) {
  let s = `<g transform="rotate(-14 ${W / 2} ${H / 2})"><ellipse cx="${W / 2}" cy="${H / 2}" rx="${W * .7}" ry="${H * .13}" fill="${t.dust}" opacity="${t.dustO}" filter="url(#blur)"/><ellipse cx="${W / 2 + 80}" cy="${H / 2 - 20}" rx="${W * .4}" ry="${H * .07}" fill="${t.hi}" opacity="${t.dustO * .7}" filter="url(#blur)"/></g>`;
  for (let i = 0; i < Math.round(W / 11); i++) { const x = (i * 211 + seed) % (W - 40) + 20, y = (i * 97 + seed * 3) % (H - 60) + 30; s += `<circle class="tw t${i % 4}" cx="${x}" cy="${y}" r="${i % 6 ? .9 : 1.6}" fill="${t.hi}" opacity="${t.starO}"/>`; }
  return s;
}
const STYLE = FONT + `.tw{animation:tw 4s ease-in-out infinite}.t1{animation-delay:-1s}.t2{animation-delay:-2s}.t3{animation-delay:-3s}@keyframes tw{0%,100%{opacity:.15}50%{opacity:.75}}`;
const shell = (t, W, H, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recent activity: ${data.map(d => d.name).join(', ')}"><defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.hi}" stop-opacity=".55"/><stop offset="1" stop-color="${t.hi}" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
<clipPath id="r"><rect x="0" y="0" width="${W}" height="${H}" rx="22"/></clipPath></defs>
<style>${STYLE}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>
<g clip-path="url(#r)"><rect width="${W}" height="${H}" fill="url(#bg)"/>${inner}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.brass}" stroke-opacity="${t.edge}"/></svg>`;

function card(x, y, w, h, d, t, latest) {
  const ln = packName(d.name);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.card}" fill-opacity="${t.dark ? .85 : .9}" stroke="${t.brass}" stroke-opacity="${latest ? .75 : t.edge}"/>
${ln.map((l, i) => `<text x="${x + 14}" y="${y + 26 + i * 18}" font-family="${serif}" font-size="14.5" font-weight="700" fill="${t.ink}">${esc(l)}</text>`).join('')}
<text x="${x + 14}" y="${y + 26 + ln.length * 18 + 4}" font-family="${mono}" font-size="10" fill="${t.body}">${esc(trunc(d.msg, w > 200 ? 38 : 24))}</text>
<circle cx="${x + 17}" cy="${y + h - 16}" r="3.5" fill="${lc(d.lang)}"/><text x="${x + 26}" y="${y + h - 12.5}" font-family="${mono}" font-size="9.5" letter-spacing=".5" fill="${t.mute}">${esc(short(d.lang) || '—')}</text>
<text x="${x + w - 14}" y="${y + h - 12.5}" text-anchor="end" font-family="${mono}" font-size="9.5" letter-spacing="1" fill="${latest ? t.hi : t.brass}">${ago(d.pushed).toUpperCase()}</text>`;
}

function desktop(t) {
  const W = 1000, H = 478, cw = 176, gap = 14, x0 = 32, cy = 356, ch = 96;
  const sp = [[120, 205], [310, 135], [500, 225], [690, 150], [880, 215]];
  const R = [24, 18, 16, 14, 13];
  let b = bgFx(W, H, t, 37);
  // ruler
  b += `<line x1="32" y1="76" x2="${W - 32}" y2="76" stroke="${t.brass}" stroke-opacity=".25"/>`;
  for (let i = 0; i <= 48; i++) { const x = 32 + i * (936 / 48), big = i % 6 === 0; b += `<line x1="${x}" y1="76" x2="${x}" y2="${big ? 84 : 80}" stroke="${t.brass}" stroke-opacity="${big ? .5 : .25}"/>`; if (big) b += `<text x="${x}" y="97" text-anchor="middle" font-family="${mono}" font-size="8.5" fill="${t.mute}" opacity=".8">${String(i / 6 * 3).padStart(2, '0')}h</text>`; }
  b += `<text x="32" y="48" font-family="${mono}" font-size="12" letter-spacing="3" fill="${t.brass}">THE SKY THIS WEEK</text><text x="${W - 32}" y="48" text-anchor="end" font-family="${mono}" font-size="10.5" letter-spacing="2" fill="${t.mute}">RING = LAST 30 DAYS · BRIGHTER = FRESHER</text>`;
  // lines old -> new
  const order = [...sp.slice(0, data.length)].reverse();
  const path = 'M' + order.map(p => p.join(' ')).join(' L');
  b += `<path d="${path}" fill="none" stroke="${t.brass}" stroke-opacity=".38" stroke-width="1.1"/>
<circle r="3.2" fill="${t.hi}"><animateMotion dur="9s" repeatCount="indefinite" path="${path}"/></circle><circle r="9" fill="url(#gl)"><animateMotion dur="9s" repeatCount="indefinite" path="${path}"/></circle>`;
  data.forEach((d, i) => {
    const [x, y] = sp[i], r = [11, 8, 7, 6, 5.5][i], cx = x0 + i * (cw + gap);
    b += `<line x1="${x}" y1="${y + R[i] + 12}" x2="${x}" y2="${cy - 8}" stroke="${t.brass}" stroke-opacity=".35" stroke-dasharray="2 5"/><circle cx="${x}" cy="${cy - 8}" r="2.2" fill="${t.brass}" opacity=".7"/>
<circle cx="${x}" cy="${y}" r="${r * 4}" fill="url(#gl)" opacity="${[1, .55, .4, .3, .25][i]}">${i === 0 ? `<animate attributeName="r" values="${r * 3.4};${r * 4.6};${r * 3.4}" dur="3.2s" repeatCount="indefinite"/>` : ''}</circle>
${ring(x, y, R[i], d.days, t)}${sparkle(x, y, r, t, [1, .9, .8, .7, .6][i])}
<g class="cd" transform="translate(0 0)">${card(cx, cy, cw, ch, d, t, i === 0)}</g>`;
  });
  b += pip(sp[0][0] + 58, sp[0][1] + 46, t, true);
  return shell(t, W, H, b);
}

function phone(t) {
  const W = 400, rowH = 104, top = 96, H = top + data.length * rowH + 20;
  const sx = [52, 86, 48, 84, 56];
  const R = [20, 16, 14, 13, 12];
  let b = bgFx(W, H, t, 91);
  b += `<text x="24" y="44" font-family="${mono}" font-size="11" letter-spacing="3" fill="${t.brass}">THE SKY THIS WEEK</text><text x="24" y="64" font-family="${mono}" font-size="9" letter-spacing="1.5" fill="${t.mute}">RING = LAST 30 DAYS</text>`;
  const pts = data.map((d, i) => [sx[i], top + i * rowH + 36]);
  const path = 'M' + [...pts].reverse().map(p => p.join(' ')).join(' L');
  b += `<path d="${path}" fill="none" stroke="${t.brass}" stroke-opacity=".38" stroke-width="1.1"/>
<circle r="3" fill="${t.hi}"><animateMotion dur="9s" repeatCount="indefinite" path="${path}"/></circle><circle r="8" fill="url(#gl)"><animateMotion dur="9s" repeatCount="indefinite" path="${path}"/></circle>`;
  data.forEach((d, i) => {
    const [x, y] = pts[i], r = [10, 7.5, 6.5, 6, 5.5][i];
    b += `<circle cx="${x}" cy="${y}" r="${r * 4}" fill="url(#gl)" opacity="${[1, .55, .4, .3, .25][i]}"/>${ring(x, y, R[i], d.days, t)}${sparkle(x, y, r, t, [1, .9, .8, .7, .6][i])}
<line x1="${x + R[i] + 12}" y1="${y}" x2="124" y2="${y}" stroke="${t.brass}" stroke-opacity=".3" stroke-dasharray="2 5"/>
<rect x="124" y="${y - 40}" width="252" height="80" rx="14" fill="${t.card}" fill-opacity="${t.dark ? .85 : .9}" stroke="${t.brass}" stroke-opacity="${i === 0 ? .75 : t.edge}"/>
<text x="138" y="${y - 14}" font-family="${serif}" font-size="15" font-weight="700" fill="${t.ink}">${esc(trunc(d.name, 26))}</text>
<text x="138" y="${y + 4}" font-family="${mono}" font-size="9.5" fill="${t.body}">${esc(trunc(d.msg, 34))}</text>
<circle cx="141" cy="${y + 26}" r="3.3" fill="${lc(d.lang)}"/><text x="149" y="${y + 29.5}" font-family="${mono}" font-size="9" fill="${t.mute}">${esc(short(d.lang) || '—')}</text>
<text x="362" y="${y + 29.5}" text-anchor="end" font-family="${mono}" font-size="9" letter-spacing="1" fill="${i === 0 ? t.hi : t.brass}">${ago(d.pushed).toUpperCase()}</text>`;
  });
  b += pip(356, 56, t, false);
  return shell(t, W, H, b);
}


  return { desktop, phone, T };
}
function skylineKit(cal, FONT) {
const weeks = cal.weeks.map(w => w.contributionDays);
const days = weeks.flat();
const MAX = Math.max(...days.map(d => d.contributionCount));
const lvl = n => n === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(4 * Math.sqrt(n / MAX))));
const total = cal.totalContributions, active = days.filter(d => d.contributionCount).length;
const busiest = days.reduce((a, b) => b.contributionCount > a.contributionCount ? b : a);
let streak = 0, cur = 0; days.forEach(d => { cur = d.contributionCount ? cur + 1 : 0; streak = Math.max(streak, cur); });
const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const weekSum = weeks.map(w => w.reduce((a, d) => a + d.contributionCount, 0)), maxWeek = Math.max(...weekSum);
const serif = "'Cormorant Garamond', Georgia, serif", mono = "'JetBrains Mono', Consolas, monospace";
const T = {
  dark: { bg1: '#0b0e2a', bg2: '#04050e', card: '#121741', ink: '#f3efe6', body: '#c3c2d6', mute: '#9a99b4', brass: '#b89c60', hi: '#e2d3a6', onGold: '#0b0e2a', edge: .34, empty: '#141a47', L: ['#141a47', '#5d5230', '#8d7640', '#b89c60', '#e2d3a6'], dust: '#8e8ad8', dustO: .1, starO: .5 },
  light: { bg1: '#f9f2e1', bg2: '#ecdcb4', card: '#fbf6e8', ink: '#2a1e0e', body: '#4a3a22', mute: '#7a6a4c', brass: '#a07838', hi: '#7a5a1c', onGold: '#fff8e6', edge: .5, empty: '#e6d9b6', L: ['#e6d9b6', '#d9c288', '#c09a50', '#a07838', '#6e4a14'], dust: '#c8a050', dustO: .16, starO: .3 },
};
const STYLE = FONT + `.tw{animation:tw 4s ease-in-out infinite}.t1{animation-delay:-1s}.t2{animation-delay:-2s}.t3{animation-delay:-3s}@keyframes tw{0%,100%{opacity:.15}50%{opacity:.75}}`;
const shell = (t, W, H, inner, extraStyle = '', defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Commit history: ${total} commits in the last year"><defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.hi}" stop-opacity=".6"/><stop offset="1" stop-color="${t.hi}" stop-opacity="0"/></radialGradient>${defs}
<clipPath id="r"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
<style>${STYLE}${extraStyle}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>
<g clip-path="url(#r)"><rect width="${W}" height="${H}" fill="url(#bg)"/>${inner}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.brass}" stroke-opacity="${t.edge}"/></svg>`;
const stars = (W, H, t, n, seed = 17) => { let s = ''; for (let i = 0; i < n; i++) { const x = (i * 211 + seed) % (W - 40) + 20, y = (i * 97 + seed * 3) % (H - 60) + 30; s += `<circle class="tw t${i % 4}" cx="${x}" cy="${y}" r="${i % 6 ? .9 : 1.5}" fill="${t.hi}" opacity="${t.starO}"/>`; } return s; };
const head = (t, W, title, sub) => `<text x="32" y="46" font-family="${mono}" font-size="12" letter-spacing="3" fill="${t.brass}">${title}</text><text x="${W - 32}" y="46" text-anchor="end" font-family="${mono}" font-size="10.5" letter-spacing="2" fill="${t.mute}">${sub}</text>`;
function pip(x, y, t, s = 1, bob = true) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${bob ? `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -4;0 0" dur=".5s" repeatCount="indefinite"/>` : ''}<rect x="-12" y="-26" width="24" height="26" rx="8" fill="${t.hi}"/><rect x="-14" y="-18" width="5" height="9" rx="2.5" fill="${t.brass}"/><rect x="9" y="-18" width="5" height="9" rx="2.5" fill="${t.brass}"/><rect x="-6" y="-19" width="3.4" height="9" rx="1.7" fill="${t.onGold}"/><rect x="2.6" y="-19" width="3.4" height="9" rx="1.7" fill="${t.onGold}"/><path d="M-3 -6q3 2.5 6 0" stroke="${t.onGold}" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="-8" y="0" width="5" height="5" rx="2" fill="${t.brass}"/><rect x="3" y="0" width="5" height="5" rx="2" fill="${t.brass}"/></g>`;
}
const stat = (t, x, y, big, small) => `<text x="${x}" y="${y}" font-family="${serif}" font-size="40" font-weight="700" fill="${t.ink}">${big}</text><text x="${x}" y="${y + 18}" font-family="${mono}" font-size="10" letter-spacing="2" fill="${t.mute}">${small}</text>`;
const legend = (t, x, y) => { let s = `<text x="${x}" y="${y + 9}" font-family="${mono}" font-size="9.5" fill="${t.mute}">LESS</text>`; t.L.forEach((c, i) => s += `<rect x="${x + 34 + i * 16}" y="${y}" width="12" height="12" rx="3" fill="${c}"/>`); return s + `<text x="${x + 34 + 5 * 16 + 4}" y="${y + 9}" font-family="${mono}" font-size="9.5" fill="${t.mute}">MORE</text>`; };

/* skyline (m = phone layout: last 26 weeks) */
function d4(t, m) {
  const W = m ? 400 : 1000, H = m ? 300 : 340, gy = m ? 252 : 296, x0 = m ? 22 : 38, pitch = m ? 13.9 : 17.8, bw = m ? 11 : 14;
  const WK = m ? weeks.slice(-26) : weeks, WS = m ? weekSum.slice(-26) : weekSum, mw = Math.max(1, ...WS);
  let b = stars(W, H, t, m ? 34 : 70, 7);
  b += m ? `<text x="22" y="40" font-family="${mono}" font-size="11" letter-spacing="3" fill="${t.brass}">THE SKYLINE</text><text x="22" y="58" font-family="${mono}" font-size="9" letter-spacing="1.5" fill="${t.mute}">A LIT WINDOW = A DAY I COMMITTED</text>` : head(t, W, 'THE SKYLINE', 'A LIT WINDOW IS A DAY I COMMITTED');
  const mx = m ? 340 : 880, my = m ? 56 : 92;
  b += `<circle cx="${mx}" cy="${my}" r="18" fill="${t.hi}" opacity=".9"/><circle cx="${mx + 7}" cy="${my - 4}" r="16" fill="${t.dark ? '#0b0e2a' : '#f3e6c4'}" opacity=".92"/>`;
  const hs = WS.map(s => (m ? 64 : 72) + (m ? 96 : 110) * Math.sqrt(s / mw));
  let tallest = 0; hs.forEach((h, i) => { if (h > hs[tallest]) tallest = i; });
  WK.forEach((w, i) => {
    const x = x0 + i * pitch, h = hs[i], y = gy - h;
    b += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="2" fill="${t.card}" stroke="${t.brass}" stroke-opacity=".4"/>`;
    const step = (h - 14) / 6.6;
    for (let r = 0; r < 7; r++) { const day = w[r], L = day ? lvl(day.contributionCount) : 0;
      b += `<rect x="${x + (bw - (m ? 5 : 6)) / 2}" y="${y + 6 + r * step}" width="${m ? 5 : 6}" height="5" rx="1.2" fill="${L ? t.hi : t.dark ? '#1b2158' : '#d8caa0'}" opacity="${L ? .72 + L * .07 : .7}" ${L >= 3 ? `class="tw t${r % 4}"` : ''}/>`; }
  });
  const tx = x0 + tallest * pitch + bw / 2, ty = gy - hs[tallest];
  b += `<line x1="${tx + bw / 2 - 2}" y1="${ty}" x2="${tx + bw / 2 - 2}" y2="${ty - 20}" stroke="${t.brass}"/><circle cx="${tx + bw / 2 - 2}" cy="${ty - 22}" r="2.4" fill="#ff6b6b"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>` + pip(tx - 2, ty, t, .72, false);
  b += `<rect x="${m ? 14 : 30}" y="${gy}" width="${W - (m ? 28 : 60)}" height="2" fill="${t.brass}" opacity=".5"/>`;
  b += `<text x="${m ? 22 : 32}" y="${H - 14}" font-family="${mono}" font-size="${m ? 8.5 : 10}" letter-spacing="1" fill="${t.mute}">${m ? `${total} COMMITS · ${active} ACTIVE DAYS` : `${total} COMMITS · ${active} ACTIVE DAYS · BUSIEST: ${fmt(busiest.date).toUpperCase()} (${busiest.contributionCount})`}</text>`;
  return shell(t, W, H, b);
}

  return { d4, T };
}

async function recent() {
  const repos = (await api(`users/${OWNER}/repos?sort=pushed&per_page=30&type=owner`)).filter(r => !r.fork && !r.archived && !r.private && r.name !== SELF);
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const data = [];
  for (const r of repos) {
    // only commits authored by the profile owner (teammates and bots do not count)
    let c = []; try { c = await api(`repos/${OWNER}/${r.name}/commits?author=${OWNER}&per_page=100&since=${since}`); } catch {}
    let first = c[0];
    if (!first) { try { first = (await api(`repos/${OWNER}/${r.name}/commits?author=${OWNER}&per_page=1`))[0]; } catch {} }
    if (!first) continue;
    const days = Array(30).fill(0); c.forEach(x => { const d = Math.floor((Date.now() - new Date(x.commit.author.date)) / 864e5); if (d >= 0 && d < 30) days[29 - d]++; });
    data.push({ name: r.name, lang: r.language || null, pushed: first.commit.author.date, msg: first.commit.message.split(String.fromCharCode(10))[0], days });
  }
  data.sort((a, b) => new Date(b.pushed) - new Date(a.pushed));
  data.length = Math.min(data.length, 5);
  if (!data.length) throw new Error('no repos');
  const k = recentKit(data, FONT);
  for (const m of ['dark', 'light']) { fs.writeFileSync(path.join(OUT, `recent-${m}.svg`), k.desktop(k.T[m])); fs.writeFileSync(path.join(OUT, `recent-m-${m}.svg`), k.phone(k.T[m])); }
  console.log('recent ok', data.map(d => d.name).join(', '));
}
async function gql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query, variables }) });
  return r.json();
}
async function skyline() {
  const calQ = 'query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{weeks{contributionDays{date weekday}}}}}}';
  const comQ = 'query($l:String!){user(login:$l){contributionsCollection{commitContributionsByRepository(maxRepositories:100){contributions(first:100){nodes{occurredAt commitCount}}}}}}';
  const cal = (await gql(calQ, { l: OWNER }))?.data?.user?.contributionsCollection?.contributionCalendar;
  const by = (await gql(comQ, { l: OWNER }))?.data?.user?.contributionsCollection?.commitContributionsByRepository;
  if (!cal || !by) throw new Error('no calendar or commit data');
  // commits only: the calendar also counts issues, pull requests and new repos, which would overstate "commit history"
  const perDay = {};
  by.forEach(r => r.contributions.nodes.forEach(n => { const d = n.occurredAt.slice(0, 10); perDay[d] = (perDay[d] || 0) + n.commitCount; }));
  let total = 0;
  cal.weeks.forEach(w => w.contributionDays.forEach(d => { d.contributionCount = perDay[d.date] || 0; total += d.contributionCount; }));
  cal.totalContributions = total;
  const k = skylineKit(cal, FONT);
  for (const m of ['dark', 'light']) { fs.writeFileSync(path.join(OUT, `skyline-${m}.svg`), k.d4(k.T[m], false)); fs.writeFileSync(path.join(OUT, `skyline-m-${m}.svg`), k.d4(k.T[m], true)); }
  console.log('skyline ok', total, 'commits');
}
let failed = 0;
for (const f of [recent, skyline]) { try { await f(); } catch (e) { failed++; console.error('::warning::' + f.name + ' failed: ' + e.message); } }
if (failed === 2) process.exit(1);

