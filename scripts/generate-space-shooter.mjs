import fs from 'node:fs/promises';

const USERNAME = process.env.GITHUB_USERNAME || 'Randevough';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OUTPUT = new URL('../assets/space-shooter.svg', import.meta.url);

async function fetchContributions() {
  if (!TOKEN) return demoCalendar();
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel weekday}}}}}}`;
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'randevough-readme' },
    body: JSON.stringify({ query, variables: { login: USERNAME } })
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  const json = await response.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
  return json.data.user.contributionsCollection.contributionCalendar;
}

function demoCalendar() {
  const weeks = Array.from({ length: 53 }, (_, w) => ({
    contributionDays: Array.from({ length: 7 }, (_, d) => {
      const wave = Math.sin(w * 0.52 + d * 1.8) + Math.cos(w * 0.17 - d);
      const count = wave > 1.15 ? 7 : wave > .55 ? 4 : wave > -.05 ? 2 : wave > -.55 ? 1 : 0;
      return { date: '', contributionCount: count, weekday: d };
    })
  }));
  return { totalContributions: 0, weeks, demo: true };
}

function escapeXml(value) {
  return String(value).replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}

function render(calendar) {
  const width = 1200, height = 430, x0 = 110, y0 = 132, dx = 18.2, dy = 31;
  const days = calendar.weeks.flatMap((week, w) => week.contributionDays.map((day, index) => ({ ...day, w, d: day.weekday ?? index })));
  const active = days.filter(d => d.contributionCount > 0).length;
  const max = Math.max(1, ...days.map(d => d.contributionCount));
  const objects = days.map((day, i) => {
    const x = x0 + day.w * dx, y = y0 + day.d * dy;
    if (!day.contributionCount) return `<circle cx="${x.toFixed(1)}" cy="${y}" r="1.2" fill="#164e63" opacity=".52"/>`;
    const level = day.contributionCount / max;
    const r = 2.8 + Math.min(5.7, level * 7);
    const delay = ((i % 17) * .13).toFixed(2);
    if (day.contributionCount >= max * .65) {
      return `<g class="target" style="animation-delay:-${delay}s" transform="translate(${x.toFixed(1)} ${y})"><path d="M0-${r} L${(r*.7).toFixed(1)}-${(r*.25).toFixed(1)} L${(r*.58).toFixed(1)} ${(r*.65).toFixed(1)} L0 ${(r*.35).toFixed(1)} L-${(r*.58).toFixed(1)} ${(r*.65).toFixed(1)} L-${(r*.7).toFixed(1)}-${(r*.25).toFixed(1)}Z" fill="#0e7490" stroke="#a5f3fc" stroke-width="1"/></g>`;
    }
    return `<circle class="target" style="animation-delay:-${delay}s" cx="${x.toFixed(1)}" cy="${y}" r="${r.toFixed(1)}" fill="${level > .25 ? '#0891b2' : '#155e75'}" stroke="#67e8f9" stroke-opacity=".7"/>`;
  }).join('');

  const score = calendar.demo ? 'SYNC ON PUSH' : Number(calendar.totalContributions).toLocaleString('en-US');
  const subtitle = calendar.demo ? 'Preview data · GitHub Actions will sync your real contributions' : `${active} active days · updated automatically`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(USERNAME)} contribution space shooter</title><desc id="desc">A space shooter visualization of one year of GitHub activity.</desc>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020617"/><stop offset=".5" stop-color="#061629"/><stop offset="1" stop-color="#03101d"/></linearGradient><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#38bdf8" stroke-opacity=".06"/></pattern><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="12"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter><linearGradient id="laser" x1="0" x2="1"><stop stop-color="#22d3ee" stop-opacity="0"/><stop offset="1" stop-color="#a5f3fc"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><style>.sans{font-family:Arial,Helvetica,sans-serif}.mono{font-family:Consolas,Menlo,monospace}.target{transform-box:fill-box;transform-origin:center;animation:blink 3.4s ease-in-out infinite}.ship{animation:drift 4s ease-in-out infinite}.laser{animation:shoot 2.6s ease-in-out infinite}@keyframes blink{0%,100%{opacity:.58}50%{opacity:1}}@keyframes drift{0%,100%{transform:translateY(-3px)}50%{transform:translateY(4px)}}@keyframes shoot{0%,40%{opacity:0;transform:scaleX(.08)}52%,70%{opacity:1;transform:scaleX(1)}85%,100%{opacity:0}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style></defs>
<rect width="1200" height="430" rx="24" fill="url(#bg)"/><rect x="18" y="18" width="1164" height="394" rx="16" fill="url(#grid)"/><rect x="18" y="18" width="1164" height="394" rx="16" filter="url(#grain)" opacity=".55"/><path d="M54 94H1164V382H54Z" fill="none" stroke="#0e7490" stroke-opacity=".28" transform="translate(8 -8)"/><path d="M42 86H1158M42 374H1158" stroke="#22d3ee" stroke-opacity=".16"/><text class="mono" x="48" y="48" font-size="15" letter-spacing="3" fill="#67e8f9">GITHUB ACTIVITY // A YEAR OF BUILDING THINGS</text><text class="sans" x="48" y="76" font-size="13" fill="#64748b">${escapeXml(subtitle)}</text>
<g opacity=".22" stroke="#22d3ee">${Array.from({length:7},(_,d)=>`<line x1="102" y1="${y0+d*dy}" x2="1080" y2="${y0+d*dy}"/>`).join('')}</g>
<g>${objects}</g>
<g transform="translate(52 236)" filter="url(#glow)"><g class="ship"><path d="M0 0 L34-13 L25-2 L53 0 L25 2 L34 13Z" fill="#07152d" stroke="#67e8f9" stroke-width="2"/><path d="M11 0H40" stroke="#e0f2fe" stroke-width="2"/><path d="M0 0L-18-5L-9 0L-18 5Z" fill="#22d3ee" opacity=".8"/></g></g><rect class="laser" x="103" y="234.5" width="94" height="3" rx="2" fill="url(#laser)" transform-origin="left" filter="url(#glow)"/>
<g transform="translate(944 108)"><rect width="206" height="116" rx="10" fill="#07182a" stroke="#22d3ee" stroke-opacity=".28"/><text class="mono" x="18" y="29" font-size="11" letter-spacing="2" fill="#64748b">PLAYER</text><text class="sans" x="18" y="53" font-size="18" font-weight="700" fill="#e0f2fe">${escapeXml(USERNAME)}</text><text class="mono" x="18" y="79" font-size="11" letter-spacing="2" fill="#64748b">CONTRIBUTIONS</text><text class="sans" x="18" y="103" font-size="20" font-weight="700" fill="#67e8f9">${escapeXml(score)}</text></g>
<text class="mono" x="48" y="404" font-size="11" fill="#475569">LESS ACTIVITY</text><g transform="translate(153 400)"><circle cx="0" cy="0" r="3" fill="#164e63"/><circle cx="14" cy="0" r="4" fill="#155e75"/><circle cx="30" cy="0" r="5" fill="#0891b2"/><circle cx="48" cy="0" r="6" fill="#0e7490" stroke="#a5f3fc"/></g><text class="mono" x="216" y="404" font-size="11" fill="#475569">MORE ACTIVITY</text><text class="mono" x="1149" y="404" text-anchor="end" font-size="11" fill="#334155">GENERATED DAILY</text></svg>`;
}

const calendar = await fetchContributions();
await fs.mkdir(new URL('../assets/', import.meta.url), { recursive: true });
await fs.writeFile(OUTPUT, render(calendar));
console.log(`Generated ${OUTPUT.pathname}`);
