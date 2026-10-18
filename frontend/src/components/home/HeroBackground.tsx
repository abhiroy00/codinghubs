const HERO_BG_HTML = `
<div style="background-image:linear-gradient(to bottom,#9cc9ec 0%,#b7dbf4 18%,#d2e8f9 38%,#e9f4fd 58%,#f6fbfe 76%,#fcfdfe 88%,var(--color-bg) 100%)"></div>
<div style="background-image:radial-gradient(46rem 28rem at 72% 38%,rgba(255,253,242,.8),rgba(255,253,242,0) 66%)"></div>
<svg viewBox="0 0 1440 440" preserveAspectRatio="xMidYMin slice" style="top:0;height:46%">
  <defs><filter id="cloud" x="-15%" y="-25%" width="130%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="11" result="soft"/><feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="4" seed="7" result="noise"/><feDisplacementMap in="soft" in2="noise" scale="86" xChannelSelector="R" yChannelSelector="G" result="torn"/><feGaussianBlur in="torn" stdDeviation="3.5"/></filter></defs>
  <g filter="url(#cloud)" fill="#fff">
    <ellipse cx="230" cy="140" rx="180" ry="42"/><ellipse cx="380" cy="122" rx="128" ry="32" opacity=".9"/><ellipse cx="120" cy="170" rx="120" ry="28" opacity=".8"/><ellipse cx="290" cy="186" rx="150" ry="24" opacity=".68"/>
    <ellipse cx="1180" cy="110" rx="196" ry="44"/><ellipse cx="1330" cy="140" rx="140" ry="34" opacity=".86"/><ellipse cx="1030" cy="146" rx="120" ry="30" opacity=".76"/><ellipse cx="1250" cy="190" rx="170" ry="24" opacity=".64"/>
    <ellipse cx="690" cy="220" rx="220" ry="32" opacity=".7"/><ellipse cx="880" cy="240" rx="146" ry="24" opacity=".58"/><ellipse cx="530" cy="254" rx="160" ry="22" opacity=".5"/>
    <ellipse cx="420" cy="330" rx="290" ry="18" opacity=".52"/><ellipse cx="1090" cy="344" rx="260" ry="16" opacity=".48"/><ellipse cx="760" cy="356" rx="210" ry="14" opacity=".4"/>
  </g>
</svg>
<svg class="road-lg" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" style="bottom:0;height:58%">
  <defs>
    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c3daf0" stop-opacity="0"/><stop offset=".18" stop-color="#c3daf0" stop-opacity=".6"/><stop offset="1" stop-color="#b3cde8" stop-opacity=".5"/></linearGradient>
    <linearGradient id="rr" x1="0" y1="0" x2="0" y2="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".34"/></linearGradient>
    <linearGradient id="rl" x1="0" y1="0" x2="0" y2="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff" stop-opacity=".9"/><stop offset=".78" stop-color="#fff" stop-opacity=".72"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>
    <linearGradient id="rf" x1="0" y1="0" x2="0" y2="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset=".16" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <mask id="rm"><rect x="-1440" y="0" width="4320" height="520" fill="url(#rf)"/></mask>
    <filter id="rh" x="-20%" y="-400%" width="140%" height="900%"><feGaussianBlur stdDeviation="23"/></filter>
    <filter id="rgl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <g mask="url(#rm)">
    <rect x="-1440" y="0" width="4320" height="520" fill="url(#rg)"/>
    <path d="M900 0 C780 156 495 322 150 520 L1340 520 C1138 322 970 156 900 0Z" fill="url(#rr)"/>
    <g fill="none" stroke="url(#rl)">
      <g stroke-width="11" opacity=".3" filter="url(#rgl)"><path d="M900 0C807 156 587 322 320 520"/><path d="M900 0C839 156 695 322 520 520"/><path d="M900 0C873 156 808 322 730 520"/><path d="M900 0C908 156 927 322 950 520"/><path d="M900 0C942 156 1040 322 1160 520"/></g>
      <g stroke-width="1.4" opacity=".85"><path d="M900 0C807 156 587 322 320 520"/><path d="M900 0C839 156 695 322 520 520"/><path d="M900 0C873 156 808 322 730 520"/><path d="M900 0C908 156 927 322 950 520"/><path d="M900 0C942 156 1040 322 1160 520"/></g>
      <g stroke-width="2.2" opacity=".95"><path d="M900 0C780 156 495 322 150 520"/><path d="M900 0C970 156 1138 322 1340 520"/></g>
    </g>
    <ellipse cx="900" cy="0" rx="950" ry="29" fill="#fff" opacity=".8" filter="url(#rh)"/>
  </g>
</svg>
<svg class="road-sm" viewBox="0 0 600 620" preserveAspectRatio="xMidYMax slice" style="bottom:0;height:58%">
  <defs><linearGradient id="rf2" x1="0" y1="0" x2="0" y2="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset=".2" stop-color="#fff"/></linearGradient><mask id="rm2"><rect x="-600" y="0" width="1800" height="620" fill="url(#rf2)"/></mask><linearGradient id="rr2" x1="0" y1="0" x2="0" y2="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient></defs>
  <g mask="url(#rm2)"><rect x="-600" width="1800" height="620" fill="#c3daf0" opacity=".45"/><path d="M300 0C250 190 120 400 -40 620L640 620C480 400 350 190 300 0Z" fill="url(#rr2)"/><g fill="none" stroke="#fff" stroke-width="1.4" opacity=".85"><path d="M300 0C280 190 210 400 120 620"/><path d="M300 0C303 190 304 400 300 620"/><path d="M300 0C320 190 390 400 480 620"/></g></g>
</svg>
<div style="background-image:radial-gradient(40rem 34rem at 6% 44%,rgba(255,255,255,.62),rgba(255,255,255,0) 72%)"></div>
<div style="top:auto;height:11rem;background-image:linear-gradient(to bottom,rgba(250,250,252,0),var(--color-bg))"></div>
`

export function HeroBackground() {
  return <div className="hero-bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HERO_BG_HTML }} />
}
