/** Hero background: a drifting neural network with data pulses and a friendly floating AI robot. Purely decorative. */
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

      <div className="hero-bot">
        <svg viewBox="0 0 240 300" width="240" height="300">
          <defs>
            <linearGradient id="botBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4f7ff" />
              <stop offset="1" stopColor="#b9c8ee" />
            </linearGradient>
            <linearGradient id="botScreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d1b44" />
              <stop offset="1" stopColor="#09112c" />
            </linearGradient>
          </defs>
          <ellipse className="bot-shadow" cx="120" cy="285" rx="62" ry="9" />
          <g className="bot-float">
            <g className="bot-antenna">
              <line x1="120" y1="38" x2="120" y2="12" stroke="#b9c8ee" strokeWidth="5" strokeLinecap="round" />
              <circle className="bot-bulb" cx="120" cy="10" r="7" fill="#ffde6b" />
            </g>
            <rect x="46" y="38" width="148" height="112" rx="34" fill="url(#botBody)" />
            <rect x="34" y="78" width="14" height="34" rx="7" fill="#8fa5da" />
            <rect x="192" y="78" width="14" height="34" rx="7" fill="#8fa5da" />
            <rect x="64" y="56" width="112" height="72" rx="22" fill="url(#botScreen)" />
            <g className="bot-eyes">
              <ellipse cx="96" cy="92" rx="11" ry="13" fill="#7dffe0" />
              <ellipse cx="144" cy="92" rx="11" ry="13" fill="#7dffe0" />
            </g>
            <path d="M104 114 Q120 124 136 114" fill="none" stroke="#7dffe0" strokeWidth="4" strokeLinecap="round" />
            <rect x="72" y="158" width="96" height="84" rx="26" fill="url(#botBody)" />
            <circle className="bot-chest" cx="120" cy="198" r="13" fill="#ffde6b" />
            <rect className="bot-arm-l" x="42" y="164" width="24" height="64" rx="12" fill="#8fa5da" />
            <g className="bot-arm-r">
              <rect x="174" y="164" width="24" height="64" rx="12" fill="#8fa5da" />
            </g>
            <rect x="88" y="244" width="24" height="26" rx="10" fill="#8fa5da" />
            <rect x="128" y="244" width="24" height="26" rx="10" fill="#8fa5da" />
          </g>
        </svg>
      </div>
    </>
  )
}
