/** Ported 1:1 from the `art()` illustration generator in the original main.js. */
export function buildStackArt(index: number, c: string): string {
  const variant = index % 4
  const a = (d: number, body: string) => `<g class="ap" style="transition-delay:${d}ms">${body}</g>`
  const grad = `<defs><linearGradient id="ag${index}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity=".95"/><stop offset="100%" stop-color="${c}" stop-opacity=".55"/></linearGradient><linearGradient id="as${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity=".28"/><stop offset="100%" stop-color="${c}" stop-opacity=".04"/></linearGradient></defs>`

  if (variant === 0) {
    return (
      grad +
      [0, 1, 2, 3]
        .map((j) => a(j * 90, `<rect x="24" y="${26 + j * 26}" width="${104 - j * 12}" height="16" rx="8" fill="${c}" fill-opacity="${0.16 + j * 0.05}"/>`))
        .join('') +
      a(380, `<path d="M146 74 C168 74 168 100 190 100" fill="none" stroke="${c}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 5"/>`) +
      a(460, `<rect x="186" y="78" width="70" height="44" rx="12" fill="url(#ag${index})"/><rect x="198" y="92" width="46" height="5" rx="2.5" fill="#fff" fill-opacity=".9"/><rect x="198" y="103" width="30" height="5" rx="2.5" fill="#fff" fill-opacity=".6"/>`) +
      a(560, `<rect x="24" y="136" width="232" height="12" rx="6" fill="url(#as${index})"/><rect x="24" y="136" width="168" height="12" rx="6" fill="url(#ag${index})"/>`)
    )
  }
  if (variant === 1) {
    return (
      grad +
      a(
        0,
        `<rect x="24" y="20" width="232" height="150" rx="14" fill="#fff" stroke="${c}" stroke-opacity=".3"/><rect x="24" y="20" width="232" height="26" rx="14" fill="${c}" fill-opacity=".1"/><circle cx="40" cy="33" r="4" fill="${c}" fill-opacity=".5"/><circle cx="54" cy="33" r="4" fill="${c}" fill-opacity=".35"/><circle cx="68" cy="33" r="4" fill="${c}" fill-opacity=".2"/>`,
      ) +
      [0, 1, 2, 3, 4]
        .map((j) => a(120 + j * 90, `<rect x="${42 + (j % 2) * 16}" y="${62 + j * 18}" width="${[80, 110, 64, 96, 50][j]}" height="7" rx="3.5" fill="${c}" fill-opacity="${0.25 + j * 0.08}"/>`))
        .join('') +
      a(
        620,
        `<rect x="176" y="62" width="62" height="88" rx="10" fill="url(#ag${index})"/><rect x="186" y="76" width="42" height="5" rx="2.5" fill="#fff" fill-opacity=".9"/><rect x="186" y="88" width="28" height="5" rx="2.5" fill="#fff" fill-opacity=".6"/><rect x="186" y="124" width="42" height="14" rx="7" fill="#fff" fill-opacity=".85"/>`,
      )
    )
  }
  if (variant === 2) {
    return (
      grad +
      a(0, `<path d="M70 150 C70 110 140 110 140 70 M210 150 C210 110 140 110 140 70" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 5"/>`) +
      a(150, `<rect x="98" y="34" width="84" height="44" rx="14" fill="url(#ag${index})"/><path d="M122 64a10 10 0 0 1 2-19 14 14 0 0 1 27 4 8 8 0 0 1 1 15Z" fill="#fff" fill-opacity=".9"/>`) +
      [70, 210]
        .map((x, j) =>
          a(
            320 + j * 120,
            `<rect x="${x - 40}" y="132" width="80" height="40" rx="12" fill="#fff"/><rect x="${x - 40}" y="132" width="80" height="40" rx="12" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".3"/><rect x="${x - 26}" y="146" width="40" height="5" rx="2.5" fill="${c}" fill-opacity=".55"/><rect x="${x - 26}" y="156" width="26" height="5" rx="2.5" fill="${c}" fill-opacity=".35"/>`,
          ),
        )
        .join('')
    )
  }
  return (
    grad +
    a(0, `<path d="M90 30 L140 18 L190 30 V90 C190 128 166 150 140 162 C114 150 90 128 90 90Z" fill="url(#ag${index})"/>`) +
    a(220, `<path d="M118 90 L134 106 L164 74" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`) +
    [0, 1, 2]
      .map((j) =>
        a(
          340 + j * 100,
          `<rect x="${j % 2 ? 206 : 24}" y="${[46, 96, 140][j]}" width="50" height="28" rx="9" fill="#fff"/><rect x="${j % 2 ? 206 : 24}" y="${[46, 96, 140][j]}" width="50" height="28" rx="9" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".3"/><circle cx="${(j % 2 ? 206 : 24) + 14}" cy="${[46, 96, 140][j] + 14}" r="4" fill="${c}" fill-opacity=".7"/><rect x="${(j % 2 ? 206 : 24) + 22}" y="${[46, 96, 140][j] + 11.5}" width="20" height="5" rx="2.5" fill="${c}" fill-opacity=".45"/>`,
        ),
      )
      .join('')
  )
}
