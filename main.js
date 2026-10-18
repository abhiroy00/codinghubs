(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const MARK = '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M44 20 L16 50 L44 80" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M72 18 L52 70" stroke="currentColor" stroke-width="15" stroke-linecap="round"/><circle cx="80" cy="80" r="9.5" fill="var(--color-brand)"/></svg>';
  const LOGO = `<span class="logo">${MARK}<span class="logo-text">CodingHubs<b>AI</b></span><span class="sr-only">Coding Hubs School of AI home</span></span>`;
  const PHONE = '+91 84488 11540', WA = '918448811540';

  /* ================= shared chrome ================= */
  const hdrEl = $('[data-header]');
  if (hdrEl) hdrEl.innerHTML = `
  <nav class="container-x" aria-label="Primary">
    <a href="index.html" style="flex-shrink:0" aria-label="Coding Hubs School of AI home">${LOGO}</a>
    <ul class="nav-links">
      <li><a class="nav-link" href="index.html#demo">Free Demo Class</a></li>
      <li class="dd">
        <a class="nav-link" href="index.html#courses" aria-haspopup="true">Courses <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="dd-panel">
          <div><h4>AI &amp; Data</h4><a href="index.html#courses">Generative AI</a><a href="index.html#courses">Agentic AI</a><a href="index.html#courses">Prompt Engineering</a><a href="index.html#courses">AI Engineering Diploma</a><a href="index.html#courses">Data Science</a><a href="index.html#courses">Data Analytics</a></div>
          <div><h4>Full Stack</h4><a href="index.html#courses">AI-Integrated Full Stack</a><a href="index.html#courses">Python Full Stack</a><a href="index.html#courses">MERN Stack</a><a href="index.html#courses">MEAN Stack</a><a href="index.html#courses">React Full Stack</a><a href="index.html#courses">.NET Full Stack</a></div>
          <div><h4>Cloud &amp; Cyber</h4><a href="index.html#courses">AWS Solutions Architect</a><a href="index.html#courses">Azure (AZ-104)</a><a href="index.html#courses">Google Cloud</a><a href="index.html#courses">Cloud DevOps</a><a href="index.html#courses">Ethical Hacker (C|EH)</a><a href="index.html#courses">CISSP</a></div>
        </div>
      </li>
      <li><a class="nav-link" href="faq.html">FAQ</a></li>
      <li><button type="button" class="nav-link" data-open-modal>Talk to an Expert</button></li>
    </ul>
    <div class="nav-right">
      <a href="#" class="nav-link nav-login">Login</a>
      <button type="button" class="btn btn-lime btn-sm" data-open-modal data-mode="demo"><span class="shine"></span><span><span class="only-lg">Join Free Demo Class</span><span class="only-sm">Join Free</span></span></button>
      <button type="button" class="menu-btn" id="menuBtn" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg><span class="sr-only">Open menu</span></button>
    </div>
  </nav>`;

  const mobEl = $('[data-mobile]');
  if (mobEl) mobEl.innerHTML = `
  <div class="sheet">
    <div class="top">${LOGO}<button type="button" class="menu-btn" id="menuClose" style="display:inline-flex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="sr-only">Close menu</span></button></div>
    <a class="m" href="index.html#demo">Free Demo Class</a>
    <a class="m" href="index.html#courses">Courses</a>
    <a class="m" href="index.html#learners">Success Stories</a>
    <a class="m" href="faq.html">FAQ</a>
    <a class="m" href="faq.html#team">About Us</a>
    <a class="m" href="tel:+${WA}">Call ${PHONE}</a>
    <div style="margin-top:auto;padding-top:1.5rem;display:flex;flex-direction:column;gap:.75rem">
      <button type="button" class="btn btn-lime" data-open-modal data-mode="demo"><span class="shine"></span><span>Join Free Demo Class</span></button>
      <button type="button" class="btn btn-ghost" data-open-modal><span class="shine"></span><span>Talk to an Expert</span></button>
    </div>
  </div>`;

  const ftEl = $('[data-footer]');
  if (ftEl) ftEl.innerHTML = `
  <div class="container-x f-in">
    <div class="f-grid">
      <div>
        <a href="index.html" aria-label="Coding Hubs School of AI home">${LOGO}</a>
        <p style="margin-top:1rem;max-width:20rem;font-size:.9375rem;line-height:1.625;color:var(--color-muted)">Practical AI &amp; Full Stack education for the future of work.</p>
        <ul class="contact-list">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>9th Floor, Pearls Best Heights-I, 904, Netaji Subhash Place, Delhi – 110034</span></li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg><a href="tel:+${WA}">${PHONE}</a> · Mon – Sat, 9 AM – 7 PM</li>
        </ul>
        <ul class="social">
          <li><a href="https://instagram.com/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg><span class="sr-only">Instagram</span></a></li>
          <li><a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z"/></svg><span class="sr-only">LinkedIn</span></a></li>
          <li><a href="https://youtube.com/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z"/></svg><span class="sr-only">YouTube</span></a></li>
          <li><a href="https://x.com/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px"><path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3h6.8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L7.1 4.2H5.1l11.9 15.6Z"/></svg><span class="sr-only">X</span></a></li>
        </ul>
      </div>
      <div class="f-cols">
        <nav aria-label="Learn"><h2>Learn</h2><ul>
          <li><a href="index.html#demo">Free Demo Class</a></li><li><a href="index.html#courses">AI &amp; Data</a></li><li><a href="index.html#courses">Full Stack</a></li><li><a href="index.html#courses">Cloud &amp; Cyber</a></li><li><a href="index.html#compare">Compare Programs</a></li>
        </ul></nav>
        <nav aria-label="Company"><h2>Company</h2><ul>
          <li><a href="faq.html#team">About</a></li><li><a href="index.html#learners">Success Stories</a></li><li><a href="faq.html#team">Mentors</a></li><li><a href="index.html#placements">Hiring Partners</a></li><li><a href="tel:+${WA}">Contact</a></li>
        </ul></nav>
        <nav aria-label="Support"><h2>Support</h2><ul>
          <li><a href="faq.html">FAQ</a></li><li><a href="#">Terms</a></li><li><a href="#">Privacy</a></li><li><a href="#">Refund Policy</a></li>
        </ul></nav>
      </div>
    </div>
    <div class="f-bottom">
      <p>© ${new Date().getFullYear()} Coding Hubs School of AI. All rights reserved.</p>
      <p>AI skills for the future of work.</p>
    </div>
  </div>`;

  const modEl = $('[data-modal]');
  if (modEl) modEl.innerHTML = `
  <div class="box">
    <button type="button" class="x" id="mClose" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <form id="leadForm">
      <p class="eyebrow" id="mEyebrow">Talk to an expert</p>
      <h3 id="mTitle" class="display-md" style="font-size:1.75rem;margin-top:.5rem">Get a call back.</h3>
      <p id="mSub" style="margin-top:.5rem;font-size:.9375rem;color:var(--color-muted)">Leave your number. We will call you back.</p>
      <div class="field"><label for="fName">Full name</label><input id="fName" name="name" required autocomplete="name" placeholder="Your name" /></div>
      <div class="field"><label for="fPhone">Phone / WhatsApp</label><input id="fPhone" name="phone" required type="tel" inputmode="tel" pattern="[0-9+\\s-]{10,15}" autocomplete="tel" placeholder="+91" /></div>
      <div class="field"><label for="fCourse">Interested in</label><select id="fCourse" name="course">
        <option>Not sure yet</option><option>AI Engineering Diploma</option><option>Generative AI</option><option>Agentic AI</option><option>Data Science</option><option>Data Analytics</option><option>AI-Integrated Full Stack</option><option>MERN Stack</option><option>Python Full Stack</option><option>AWS / Azure Cloud</option><option>Cyber Security</option>
      </select></div>
      <button type="submit" class="btn btn-lime" style="width:100%;margin-top:1.5rem"><span class="shine"></span><span id="mBtn">Call me back</span></button>
      <p class="form-note">🔒 Your details are safe with us. No spam, ever.</p>
    </form>
    <div class="form-ok" id="formOk">
      <div style="width:56px;height:56px;margin:0 auto;border-radius:50%;background:var(--color-lime);display:grid;place-items:center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111218" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
      <h3 class="display-md" style="font-size:1.5rem;margin-top:1rem">Thank you!</h3>
      <p style="margin-top:.5rem;color:var(--color-muted)">Our counsellor will call you within 30 minutes.</p>
    </div>
  </div>`;

  /* ================= home data ================= */
  const fav = d => `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
  const companies = [['Google','google.com'],['Microsoft','microsoft.com'],['NVIDIA','nvidia.com'],['Amazon','amazon.com'],['Meta','meta.com'],['Apple','apple.com'],['OpenAI','openai.com'],['Adobe','adobe.com'],['Salesforce','salesforce.com'],['IBM','ibm.com'],['Infosys','infosys.com'],['TCS','tcs.com'],['Accenture','accenture.com'],['Wipro','wipro.com'],['Deloitte','deloitte.com']];
  const quotes = [
    { t: 'AI is one of the most important things humanity is working on. It is more profound than, I dunno, electricity or fire.', n: 'Sundar Pichai', r: 'CEO, Google and Alphabet', m: 'Speaking at a town hall event, 2018', src: ['CNBC', 'https://www.cnbc.com/2018/02/01/google-ceo-sundar-pichai-ai-is-more-important-than-fire-electricity.html'], c: 'linear-gradient(140deg,#4285F4,#34A853)' },
    { t: 'You’re not going to lose your job to an AI, but you’re going to lose your job to somebody who uses AI.', n: 'Jensen Huang', r: 'Founder and CEO, NVIDIA', m: 'Milken Institute Global Conference, 2025', c: 'linear-gradient(140deg,#76B900,#3f6b00)' },
    { t: 'AI is the new electricity.', n: 'Andrew Ng', r: 'Founder, DeepLearning.AI', m: 'Stanford Graduate School of Business, 2017', c: 'linear-gradient(140deg,#4f46e5,#7c6cf0)' }
  ];
  const dv = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/';
  const tools = [
    ['Python', 'python/python-original.svg', '#FADCE5', -3], ['React', 'react/react-original.svg', '#FFD9D2', 2], ['Node.js', 'nodejs/nodejs-original.svg', '#CFEBE8', -1],
    ['TensorFlow', 'tensorflow/tensorflow-original.svg', '#DFE9CD', 4], ['AWS', 'amazonwebservices/amazonwebservices-plain-wordmark.svg', '#FFE4CE', -2], ['PyTorch', 'pytorch/pytorch-original.svg', '#F0E3D2', 3],
    ['GitHub', 'github/github-original.svg', '#F4F4F2', -4], ['Docker', 'docker/docker-original.svg', '#DCE1FB', 1], ['MongoDB', 'mongodb/mongodb-original.svg', '#E7E0F6', -3],
    ['JavaScript', 'javascript/javascript-original.svg', '#E7E7E7', 2], ['VS Code', 'vscode/vscode-original.svg', '#DCE1FB', -2], ['Figma', 'figma/figma-original.svg', '#FFD9D2', 4]
  ];
  const cats = [
    { k: 'AI & Data', c: '#4f46e5', t: 'Become an AI engineer, not just an AI user.', d: 'Generative AI, Agentic AI, LLMs and Machine Learning — from prompt to production.', l: ['Generative AI', 'Agentic AI', 'Prompt Engineering', 'AI Engineering Diploma', 'Data Science', 'Data Analytics'] },
    { k: 'Full Stack', c: '#0ea5a4', t: 'Build products end to end.', d: 'Frontend, backend, databases and AI integrations — the stack companies hire for.', l: ['AI-Integrated Full Stack', 'Python Full Stack', 'MERN Stack', 'MEAN Stack', 'React Full Stack', '.NET Full Stack'] },
    { k: 'Cloud', c: '#7c6cf0', t: 'Run what the world builds.', d: 'Certification-ready AWS, Azure and Google Cloud tracks, with DevOps built in.', l: ['AWS Solutions Architect', 'AWS Developer Associate', 'Azure AZ-104', 'Azure AZ-305', 'Google Cloud', 'Cloud DevOps'] },
    { k: 'Cyber Security', c: '#e11d48', t: 'Defend what matters.', d: 'Ethical hacking, SOC operations and governance — including AI for cybersecurity.', l: ['Ethical Hacker (C|EH) v13', 'AI/GenAI for Cybersecurity', 'Cloud Security', 'Cyber Law & GRC', 'CISSP'] }
  ];
  const compare = [
    ['₹8–18', 'LPA', 'AI Engineering Diploma', '6 months · <b>95% placement</b> · AI / ML careers', 'var(--color-brand)'],
    ['₹7–16', 'LPA', 'AI-Integrated Full Stack', '6 months · <b>94% placement</b> · Full Stack + AI', 'var(--color-brand)'],
    ['₹6–14', 'LPA', 'Data Science', '4 months · <b>92% placement</b> · Analytics &amp; research', 'var(--color-brand)'],
    ['₹5–12', 'LPA', 'MERN Stack', '4 months · <b>90% placement</b> · Web development', 'var(--color-brand)'],
    ['₹10–22', 'LPA', 'AWS Solutions Architect', '3 months · <b>88% placement</b> · Cloud careers', 'var(--color-brand)'],
    ['₹8–20', 'LPA', 'Ethical Hacker (C|EH)', '3 months · <b>87% placement</b> · Cybersecurity', 'var(--color-success)']
  ];
  const posts = [
    'Campus Connect at <b>Bharati Vidyapeeth</b> 🎓 Live workshop, hands-on labs and a placement talk with our mentors. Next stop: MSIT. <span class="ht">#CampusConnect</span>',
    'New on the blog: <b>GitHub Portfolio for Freshers</b> — showcase your coding skills without experience. 👇',
    '3200+ students placed. Highest package <b>₹34 LPA</b>. Admissions are open for the next job-ready batch in Delhi NCR. 🚀',
    'From UPI to AI Agents: <b>what’s next for digital payments in India?</b> UPI just turned ten. Here’s the next chapter.',
    'This month’s Campus Connect drives: <b>VIPS, JIMS, Tecnia &amp; MERI College</b>. Real projects, real mentors. <span class="ht">#CampusConnect</span>',
    'Can someone hack you through public Wi-Fi? Our cyber security mentors break it down. 🔐 <span class="ht">#CyberSecurity</span>'
  ];
  const learners = [
    ['Rahul Sharma', 'AI Engineer @ TCS', 'Coding Hubs School of AI helped me switch my career into AI. The mentorship and real projects were amazing!', 'Career switch into AI', 'linear-gradient(140deg,#4f46e5,#7c6cf0)', 'TCS'],
    ['Priya Verma', 'Frontend Developer @ Infosys', 'Best institute for Full Stack. Placement support is real, not fake like others.', 'Fresher to frontend developer', 'linear-gradient(140deg,#0ea5a4,#14b8a6)', 'Infosys'],
    ['Amit Kumar', 'Data Analyst', 'Gurukul style teaching is unique. You don’t just learn, you understand deeply.', 'Non-IT graduate to data analyst', 'linear-gradient(140deg,#e11d48,#f43f5e)', 'Data Analyst'],
    ['Your name here', 'Your dream role @ your dream company', '3200+ students have already written their story here. The next one could be yours — it starts with a free demo class.', 'Book a free demo →', 'linear-gradient(140deg,#111218,#2c2f3b)', 'Next batch']
  ];
  const initials = n => n.split(' ').map(s => s[0]).join('').slice(0, 2);
  const QUOTE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.2 17.5c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Zm9.1 0c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Z"/></svg>';

  /* ================= home render ================= */
  const coList = $('#coList');
  if (coList) coList.innerHTML = companies.map(([n, d]) => `<li class="rv-pop"><span class="co-tile"><img src="${fav(d)}" alt="${n}" loading="lazy" decoding="async" draggable="false" onerror="this.outerHTML='<span class=mono>${n.slice(0, 2)}</span>'"></span><span class="nm">${n}</span></li>`).join('');

  if ($('#quote')) {
    $('#qDots').innerHTML = quotes.map((q, i) => `<button type="button" aria-label="Show the quote from ${q.n}" aria-current="${i === 0}"><span class="avatar" style="width:${i === 0 ? 40 : 34}px;height:${i === 0 ? 40 : 34}px;background:${q.c};font-size:.75rem">${initials(q.n)}</span></button>`).join('');
    let qi = 0, qTimer;
    const show = (i, anim = true) => {
      const q = quotes[i], box = $('#quote');
      const set = () => {
        $('#qText').textContent = q.t; $('#qName').textContent = q.n; $('#qRole').textContent = q.r;
        $('#qMeta').innerHTML = q.m + (q.src ? ` · <a href="${q.src[1]}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;text-underline-offset:2px">${q.src[0]}</a>` : '');
        const av = $('#qAv'); av.style.background = q.c; av.textContent = initials(q.n);
        $$('#qDots button').forEach((b, j) => { b.setAttribute('aria-current', j === i); const a = b.firstElementChild; a.style.width = a.style.height = (j === i ? 40 : 34) + 'px'; });
        box.classList.remove('out');
      };
      if (anim) { box.classList.add('out'); setTimeout(set, 300); } else set();
      qi = i;
    };
    show(0, false);
    const auto = () => { clearInterval(qTimer); qTimer = setInterval(() => show((qi + 1) % quotes.length), 7000); };
    $$('#qDots button').forEach((b, i) => b.addEventListener('click', () => { show(i); auto(); }));
    if (!reduce) auto();
  }

  /* tools along the curve — 12 tools, each twice (offset by 50%), draggable */
  const host = $('#toolHost');
  if (host) {
    const PATH = "path('M1 269.434C58.5872 315.935 387.926 385.938 482.583 269.434C600.905 123.8051 525.516 16.7789 427.332 79.9613C329.149 143.1436 352.902 302.723 515.041 327.302C644.752 346.966 943.56 241.94 995 216.5')";
    const all = [];
    tools.forEach((t, i) => { all.push([...t, i / 24, i + 1]); all.push([...t, i / 24 + .5, i + 11]); });
    host.innerHTML = all.map(([n, f, bg, rot, off, z]) => `<div class="tool" data-off="${off}" style="offset-path:${PATH};animation:none;offset-distance:${(off * 100).toFixed(3)}%;z-index:${z}"><span class="block" style="display:block;transform:rotate(${rot}deg)"><span class="tile" title="${n}" style="background:${bg}"><img src="${dv + f}" alt="${n}" loading="lazy" draggable="false"></span></span></div>`).join('');
    const items = $$('.tool', host), area = $('#pathArea'), scaleEl = $('#pathScale');
    let k = 1;
    const fit = () => { k = Math.min(area.clientWidth / 1060, area.clientHeight / 470); scaleEl.style.transform = `translate(-50%,-50%) scale(${k})`; };
    fit(); addEventListener('resize', fit);
    if (!CSS.supports('offset-path', "path('M0 0L1 1')")) {
      host.style.cssText = 'position:absolute;inset:0;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-content:center';
      items.forEach((t, i) => { t.style.position = 'relative'; if (i % 2) t.remove(); });
    } else {
      let phase = 0, last = performance.now(), drag = null, visible = true;
      new IntersectionObserver(e => visible = e[0].isIntersecting).observe(area);
      const place = () => items.forEach(t => { const d = ((+t.dataset.off + phase) % 1 + 1) % 1; t.style.offsetDistance = (d * 100).toFixed(3) + '%'; });
      const tick = now => {
        const dt = Math.min(now - last, 64); last = now;
        if (!drag && visible && !reduce) phase += dt / 60000;
        place(); requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      area.addEventListener('pointerdown', e => { drag = { x: e.clientX, p: phase }; area.setPointerCapture(e.pointerId); area.style.cursor = 'grabbing'; });
      area.addEventListener('pointermove', e => { if (drag) phase = drag.p - (e.clientX - drag.x) / (area.clientWidth * 1.4); });
      const end = () => { drag = null; area.style.cursor = ''; };
      area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
      area.style.cursor = 'grab'; area.style.touchAction = 'pan-y';
    }
  }

  /* stacked programme cards with mini illustrations */
  const art = (i, c) => {
    const a = (d, body) => `<g class="ap" style="transition-delay:${d}ms">${body}</g>`;
    const grad = `<defs><linearGradient id="ag${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity=".95"/><stop offset="100%" stop-color="${c}" stop-opacity=".55"/></linearGradient><linearGradient id="as${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity=".28"/><stop offset="100%" stop-color="${c}" stop-opacity=".04"/></linearGradient></defs>`;
    if (i === 0) return grad + [0, 1, 2, 3].map(j => a(j * 90, `<rect x="24" y="${26 + j * 26}" width="${104 - j * 12}" height="16" rx="8" fill="${c}" fill-opacity="${.16 + j * .05}"/>`)).join('') +
      a(380, `<path d="M146 74 C168 74 168 100 190 100" fill="none" stroke="${c}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 5"/>`) +
      a(460, `<rect x="186" y="78" width="70" height="44" rx="12" fill="url(#ag${i})"/><rect x="198" y="92" width="46" height="5" rx="2.5" fill="#fff" fill-opacity=".9"/><rect x="198" y="103" width="30" height="5" rx="2.5" fill="#fff" fill-opacity=".6"/>`) +
      a(560, `<rect x="24" y="136" width="232" height="12" rx="6" fill="url(#as${i})"/><rect x="24" y="136" width="168" height="12" rx="6" fill="url(#ag${i})"/>`);
    if (i === 1) return grad + a(0, `<rect x="24" y="20" width="232" height="150" rx="14" fill="#fff" stroke="${c}" stroke-opacity=".3"/><rect x="24" y="20" width="232" height="26" rx="14" fill="${c}" fill-opacity=".1"/><circle cx="40" cy="33" r="4" fill="${c}" fill-opacity=".5"/><circle cx="54" cy="33" r="4" fill="${c}" fill-opacity=".35"/><circle cx="68" cy="33" r="4" fill="${c}" fill-opacity=".2"/>`) +
      [0, 1, 2, 3, 4].map(j => a(120 + j * 90, `<rect x="${42 + (j % 2) * 16}" y="${62 + j * 18}" width="${[80, 110, 64, 96, 50][j]}" height="7" rx="3.5" fill="${c}" fill-opacity="${.25 + j * .08}"/>`)).join('') +
      a(620, `<rect x="176" y="62" width="62" height="88" rx="10" fill="url(#ag${i})"/><rect x="186" y="76" width="42" height="5" rx="2.5" fill="#fff" fill-opacity=".9"/><rect x="186" y="88" width="28" height="5" rx="2.5" fill="#fff" fill-opacity=".6"/><rect x="186" y="124" width="42" height="14" rx="7" fill="#fff" fill-opacity=".85"/>`);
    if (i === 2) return grad + a(0, `<path d="M70 150 C70 110 140 110 140 70 M210 150 C210 110 140 110 140 70" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 5"/>`) +
      a(150, `<rect x="98" y="34" width="84" height="44" rx="14" fill="url(#ag${i})"/><path d="M122 64a10 10 0 0 1 2-19 14 14 0 0 1 27 4 8 8 0 0 1 1 15Z" fill="#fff" fill-opacity=".9"/>`) +
      [70, 210].map((x, j) => a(320 + j * 120, `<rect x="${x - 40}" y="132" width="80" height="40" rx="12" fill="#fff"/><rect x="${x - 40}" y="132" width="80" height="40" rx="12" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".3"/><rect x="${x - 26}" y="146" width="40" height="5" rx="2.5" fill="${c}" fill-opacity=".55"/><rect x="${x - 26}" y="156" width="26" height="5" rx="2.5" fill="${c}" fill-opacity=".35"/>`)).join('');
    return grad + a(0, `<path d="M90 30 L140 18 L190 30 V90 C190 128 166 150 140 162 C114 150 90 128 90 90Z" fill="url(#ag${i})"/>`) +
      a(220, `<path d="M118 90 L134 106 L164 74" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`) +
      [0, 1, 2].map(j => a(340 + j * 100, `<rect x="${j % 2 ? 206 : 24}" y="${[46, 96, 140][j]}" width="50" height="28" rx="9" fill="#fff"/><rect x="${j % 2 ? 206 : 24}" y="${[46, 96, 140][j]}" width="50" height="28" rx="9" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".3"/><circle cx="${(j % 2 ? 206 : 24) + 14}" cy="${[46, 96, 140][j] + 14}" r="4" fill="${c}" fill-opacity=".7"/><rect x="${(j % 2 ? 206 : 24) + 22}" y="${[46, 96, 140][j] + 11.5}" width="20" height="5" rx="2.5" fill="${c}" fill-opacity=".45"/>`)).join('');
  };
  const stack = $('#stack');
  if (stack) stack.innerHTML = cats.map((c, i) => `<div class="stack-item" style="top:${6 + i * 1.25}rem"><article class="stack-card" data-io>
    <span class="glow" style="background:radial-gradient(120% 100% at 100% 0%,${c.c}1f 0%,${c.c}08 38%,transparent 72%)"></span>
    <span class="topbar" style="background:linear-gradient(to right,${c.c},${c.c}00 78%)"></span>
    <div class="stack-in"><div>
      <div class="stack-head"><span class="num">0${i + 1}</span><span class="pill" style="color:${c.c};background:${c.c}14">${c.k}</span></div>
      <p class="ttl">${c.t}</p><p class="dsc">${c.d}</p>
      <div class="stack-chips">${c.l.map(x => `<a href="#" data-open-modal data-course="${x}">${x}</a>`).join('')}</div>
    </div>
    <div class="stack-art"><svg viewBox="0 0 280 200" aria-hidden="true">${art(i, c.c)}</svg></div></div>
  </article></div>`).join('');

  const cl = $('#compareList');
  if (cl) cl.innerHTML = compare.map(([v, u, k, d, col]) => `<li class="rv-up"><p class="stat-big" style="color:${col}">${v}<small>${u}</small></p><p class="stat-k">${k}</p><p class="stat-d">${d}</p><button type="button" class="stat-link" data-open-modal data-course="${k}">Enquire →</button></li>`).join('');

  const XL = '<svg class="xlogo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3h6.8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L7.1 4.2H5.1l11.9 15.6Z"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Verified"><path d="M22.5 12.5c0-1.6-.9-2.9-2.2-3.6.5-1.4.2-3.1-.9-4.2s-2.8-1.4-4.2-.9C14.5 2.5 13.2 1.5 11.6 1.5s-2.9 1-3.6 2.3c-1.4-.5-3.1-.2-4.2.9s-1.4 2.8-.9 4.2C1.6 9.6.6 10.9.6 12.5s1 2.9 2.3 3.6c-.5 1.4-.2 3.1.9 4.2s2.8 1.4 4.2.9c.7 1.3 2 2.3 3.6 2.3s2.9-1 3.6-2.3c1.4.5 3.1.2 4.2-.9s1.4-2.8.9-4.2c1.3-.7 2.2-2 2.2-3.6Zm-12.3 4.6-4-4 1.4-1.4 2.6 2.6 5.8-5.8 1.4 1.4-7.2 7.2Z"/></svg>';
  const post = (t) => `<span class="mq-item"><a class="xpost" href="#"><div class="xin"><div class="hd"><span class="avatar" style="background:#111218;color:var(--color-lime)">CH</span><div class="xwho"><b>Coding Hubs School of AI ${TICK}</b><span>@CodingHubsAI · Delhi NCR</span></div>${XL}</div><p class="tx">${t}</p></div></a></span>`;
  const group = (h, hidden) => `<div class="marquee-group"${hidden ? ' aria-hidden="true"' : ''}>${h}</div>`;
  const mq1 = $('#mq1'), mq2 = $('#mq2');
  if (mq1) { const a = posts.slice(0, 3).map(post).join(''), b = posts.slice(3).map(post).join(''); mq1.innerHTML = group(a) + group(a, 1); mq2.innerHTML = group(b) + group(b, 1); }

  const ll = $('#learnerList');
  if (ll) ll.innerHTML = learners.map(([n, r, q, tag, bg, co], i) => `<li class="rv-up lcard"><div class="g">
    <div class="ph"><div style="background:${bg}"><span class="ini"${i === 3 ? ' style="color:var(--color-lime)"' : ''}>${i === 3 ? 'You?' : initials(n)}</span></div><span class="co">${co}</span></div>
    <figure>${QUOTE_SVG}<blockquote>${q}</blockquote>
      <figcaption><b>${n}</b><span class="r">${r}</span>${i === 3 ? `<button type="button" class="soft-pill" data-open-modal data-mode="demo" style="cursor:pointer">${tag}</button>` : `<span class="soft-pill">${tag}</span>`}</figcaption></figure>
  </div></li>`).join('');

  /* beams (decorative) */
  const beams = [['M-60,300 C220,300 300,90 620,120 C900,146 980,320 1260,286', 11, 0], ['M-60,180 C260,180 340,340 640,320 C920,302 1000,120 1260,150', 14, -4], ['M-60,420 C300,420 420,220 760,246 C1000,264 1100,400 1260,384', 17, -8]];
  $$('[data-beams]').forEach((svg, n) => {
    svg.innerHTML = `<defs><linearGradient id="bs${n}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0"/><stop offset="30%" stop-color="var(--color-brand)" stop-opacity=".3"/><stop offset="70%" stop-color="#7c6cf0" stop-opacity=".3"/><stop offset="100%" stop-color="#7c6cf0" stop-opacity="0"/></linearGradient><linearGradient id="bk${n}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0"/><stop offset="50%" stop-color="var(--color-brand)" stop-opacity=".95"/><stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0"/></linearGradient></defs>
    <g style="opacity:.6">${beams.map(([d, s, del]) => `<path d="${d}" fill="none" stroke="url(#bs${n})" stroke-width="1.25"/><path d="${d}" fill="none" stroke="url(#bk${n})" stroke-width="2" stroke-linecap="round" stroke-dasharray="90 1500" class="animate-beam" style="animation-duration:${s}s;animation-delay:${del}s"/>`).join('')}
    <g stroke="var(--color-brand)" stroke-opacity=".14" stroke-width=".75"><line x1="220" y1="288" x2="620" y2="120"/><line x1="620" y1="120" x2="640" y2="320"/><line x1="640" y1="320" x2="980" y2="314"/><line x1="340" y1="336" x2="640" y2="320"/></g>
    ${[[220, 288, 3], [620, 120, 3.5], [640, 320, 3], [980, 314, 3], [340, 336, 2.5], [1000, 122, 2.5]].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--color-brand)" fill-opacity=".4" class="animate-float-slow" style="animation-delay:${i * 1.3}s"/>`).join('')}</g>`;
  });

  $$('.words').forEach(el => { el.innerHTML = `<span aria-hidden="true">${el.dataset.words.split(' ').map((w, i) => `<span class="w"><span style="transition-delay:${i * 70}ms">${w}&nbsp;</span></span>`).join('')}</span><span class="sr-only">${el.dataset.words}</span>`; });

  /* ================= reveal / counters ================= */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv,.rv-up,.rv-left,.rv-pop,.rv-zoom,.line-mask,.words,[data-io]').forEach(el => io.observe(el));
  $$('ul,ol').forEach(l => [...l.children].forEach((c, i) => { if (/\brv-/.test(c.className)) c.style.transitionDelay = (i * 70) + 'ms'; }));
  $$('[data-d]').forEach(el => el.style.transitionDelay = el.dataset.d + 'ms');

  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || ''; if (reduce) return;
    const t0 = performance.now();
    (function tick(t) { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))) + suf; if (p < 1) requestAnimationFrame(tick); })(t0);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* billboard */
  const slides = $$('#bbStage .bb-slide');
  if (slides.length) {
    let bi = 0; $('#bbTot').textContent = String(slides.length).padStart(2, '0');
    if (!reduce) setInterval(() => { slides[bi].classList.remove('on'); bi = (bi + 1) % slides.length; slides[bi].classList.add('on'); $('#bbNum').textContent = String(bi + 1).padStart(2, '0'); }, 3200);
  }

  /* ================= scroll: lenis, header, progress, stack ================= */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]'); if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    const t = document.getElementById(url.hash.slice(1)); if (!t) return;
    e.preventDefault(); setMenu(false);
    lenis ? lenis.scrollTo(t, { offset: -72 }) : t.scrollIntoView({ behavior: 'smooth' });
  });

  const hdr = $('#hdr'), prog = $('#progress'), cards = $$('.stack-card');
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    hdr && hdr.classList.toggle('scrolled', y > 24);
    if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    if (!reduce && innerWidth >= 640) cards.forEach((c, i) => {
      const nx = cards[i + 1]; if (!nx) return;
      const gap = nx.getBoundingClientRect().top - c.getBoundingClientRect().top;
      const p = Math.max(0, Math.min(1, 1 - gap / c.offsetHeight));
      c.style.transform = `scale(${1 - p * .05})`; c.style.filter = `brightness(${1 - p * .04})`;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ================= mobile menu ================= */
  const mob = $('#mobile'), mb = $('#menuBtn');
  function setMenu(o) { if (!mob) return; mob.classList.toggle('open', o); mb && mb.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; o ? lenis && lenis.stop() : lenis && lenis.start(); }
  mb && mb.addEventListener('click', () => setMenu(true));
  $('#menuClose') && $('#menuClose').addEventListener('click', () => setMenu(false));
  mob && mob.addEventListener('click', e => { if (e.target === mob || e.target.closest('a.m')) setMenu(false); });

  /* ================= modal / lead form ================= */
  const modal = $('#modal'), form = $('#leadForm'), ok = $('#formOk');
  function openModal(mode, course) {
    setMenu(false);
    const demo = mode === 'demo';
    $('#mEyebrow').textContent = demo ? 'Free demo class' : 'Talk to an expert';
    $('#mTitle').textContent = demo ? 'Book your free demo.' : 'Get a call back.';
    $('#mSub').textContent = demo ? 'Experience a live session — completely free, no commitment.' : 'Leave your number. We will call you back.';
    $('#mBtn').textContent = demo ? 'Book my free demo' : 'Call me back';
    const s = $('#fCourse');
    if (course) { const o = [...s.options].find(o => o.text === course); if (o) s.value = o.text; else s.add(new Option(course, course, true, true)); }
    form.style.display = ''; ok.classList.remove('show');
    modal.classList.add('open'); document.body.style.overflow = 'hidden'; lenis && lenis.stop();
    setTimeout(() => $('#fName').focus(), 200);
  }
  const closeModal = () => { if (!modal) return; modal.classList.remove('open'); document.body.style.overflow = ''; lenis && lenis.start(); };
  document.addEventListener('click', e => { const t = e.target.closest('[data-open-modal]'); if (t) { e.preventDefault(); openModal(t.dataset.mode, t.dataset.course); } });
  if (modal) {
    $('#mClose').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const msg = `Hi Coding Hubs! I'm ${d.get('name')} (${d.get('phone')}). Interested in: ${d.get('course')}. (${$('#mEyebrow').textContent})`;
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      form.style.display = 'none'; ok.classList.add('show'); form.reset();
    });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); setMenu(false); } });

  /* ================= preloader ================= */
  const pl = $('#preloader');
  if (pl) {
    const done = () => pl.classList.add('done');
    addEventListener('load', () => setTimeout(done, reduce ? 0 : 550));
    setTimeout(done, 2500);
  }
})();
