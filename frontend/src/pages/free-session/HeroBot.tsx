/** Hero background: a drifting neural network with data pulses. Purely decorative. */
const NODES: [number, number][] = [
  [90, 140], [260, 70], [420, 190], [610, 90], [790, 210], [980, 110], [1160, 230], [1330, 120],
  [150, 420], [340, 520], [560, 400], [760, 560], [940, 430], [1120, 600], [1290, 470],
  [220, 760], [480, 720], [700, 820], [900, 740], [1180, 800], [1360, 700],
]
const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [0, 8], [2, 10], [4, 12], [6, 14], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14],
  [9, 15], [10, 16], [11, 17], [12, 18], [13, 19], [14, 20], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20], [3, 10], [5, 12],
]
const PATHS = [
  'M90 140 L260 70 L420 190 L610 90 L790 210 L980 110',
  'M150 420 L340 520 L560 400 L760 560 L940 430 L1120 600',
  'M220 760 L480 720 L700 820 L900 740 L1180 800',
]

export function HeroBot() {
  return (
    <>
      <svg className="hero-net" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="net-lines">
          {LINKS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
          ))}
        </g>
        <g className="net-nodes">
          {NODES.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 5 : 3.5} style={{ animationDelay: `${(i % 7) * 0.45}s` }} />
          ))}
        </g>
        {PATHS.map((d, i) => (
          <circle key={d} className="pkt" r="4.5">
            <animateMotion dur={`${7 + i * 2}s`} repeatCount="indefinite" path={d} begin={`${i * 1.2}s`} />
          </circle>
        ))}
      </svg>
    </>
  )
}
