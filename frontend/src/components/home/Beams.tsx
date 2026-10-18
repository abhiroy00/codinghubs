const BEAMS: [string, number, number][] = [
  ['M-60,300 C220,300 300,90 620,120 C900,146 980,320 1260,286', 11, 0],
  ['M-60,180 C260,180 340,340 640,320 C920,302 1000,120 1260,150', 14, -4],
  ['M-60,420 C300,420 420,220 760,246 C1000,264 1100,400 1260,384', 17, -8],
]
const DOTS: [number, number, number][] = [
  [220, 288, 3], [620, 120, 3.5], [640, 320, 3], [980, 314, 3], [340, 336, 2.5], [1000, 122, 2.5],
]

/** Decorative background beams, ported from the [data-beams] injection in main.js. */
export function Beams({ index }: { index: number }) {
  const html = `<defs><linearGradient id="bs${index}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0"/><stop offset="30%" stop-color="var(--color-brand)" stop-opacity=".3"/><stop offset="70%" stop-color="#7c6cf0" stop-opacity=".3"/><stop offset="100%" stop-color="#7c6cf0" stop-opacity="0"/></linearGradient><linearGradient id="bk${index}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0"/><stop offset="50%" stop-color="var(--color-brand)" stop-opacity=".95"/><stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0"/></linearGradient></defs>
    <g style="opacity:.6">${BEAMS.map(([d, s, del]) => `<path d="${d}" fill="none" stroke="url(#bs${index})" stroke-width="1.25"/><path d="${d}" fill="none" stroke="url(#bk${index})" stroke-width="2" stroke-linecap="round" stroke-dasharray="90 1500" class="animate-beam" style="animation-duration:${s}s;animation-delay:${del}s"/>`).join('')}
    <g stroke="var(--color-brand)" stroke-opacity=".14" stroke-width=".75"><line x1="220" y1="288" x2="620" y2="120"/><line x1="620" y1="120" x2="640" y2="320"/><line x1="640" y1="320" x2="980" y2="314"/><line x1="340" y1="336" x2="640" y2="320"/></g>
    ${DOTS.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--color-brand)" fill-opacity=".4" class="animate-float-slow" style="animation-delay:${i * 1.3}s"/>`).join('')}</g>`

  return <svg className="beams" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: html }} />
}
