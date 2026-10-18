(function () {
  'use strict';
  const CFG = window.LP_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), CFG);
  const store = {
    get(k, s = localStorage) { try { return JSON.parse(s.getItem(k)); } catch (e) { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  const isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  /* ================= 1. Apply config to page ================= */
  function applyConfig() {
    $$('[data-cfg]').forEach(el => {
      const v = get(el.dataset.cfg);
      if (typeof v === 'string' && v) el.textContent = v.replace(/^https?:\/\//, '').replace(/\/$/, '');
    });
    $$('[data-cfg-href]').forEach(el => {
      const v = get(el.dataset.cfgKey || el.dataset.cfg);
      if (!v) return;
      const kind = el.dataset.cfgHref;
      el.href = kind === 'tel' ? 'tel:' + v.replace(/[^\d+]/g, '') : kind === 'mailto' ? 'mailto:' + v : v;
    });
    $$('[data-hide-empty]').forEach(el => { if (!get(el.dataset.hideEmpty)) el.hidden = true; });
    const wa = (get('whatsapp.number') || '').replace(/\D/g, '');
    const waContact = $('#waContact');
    if (wa && waContact) {
      waContact.href = `https://wa.me/${wa}?text=${encodeURIComponent('Hi! I have a question about the free 2-hour live session.')}`;
      waContact.hidden = false;
    }
    const ftrWa = $('#ftrWa');
    if (wa && ftrWa) ftrWa.href = `https://wa.me/${wa}`;
    const waFloat = $('#waFloat');
    if (wa && waFloat) {
      waFloat.href = `https://wa.me/${wa}?text=${encodeURIComponent('Hi! I have a question about the free 2-hour live session.')}`;
      waFloat.hidden = false;
      waFloat.addEventListener('click', () => track('whatsapp_click', { location: 'floating_button' }));
    }
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }

  /* ================= 2. Attribution (UTM + click IDs) ================= */
  const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  function captureAttribution() {
    const qs = new URLSearchParams(location.search);
    const fresh = {};
    ATTR_KEYS.forEach(k => { const v = qs.get(k); if (v) fresh[k] = v.slice(0, 200); });
    if (Object.keys(fresh).length) {
      // last non-empty click wins; click IDs kept 90 days for offline conversion import
      store.set('lp_attr', { ...fresh, landing_page: location.href.split('#')[0], ts: Date.now() });
    } else if (!store.get('lp_attr')) {
      store.set('lp_attr', { landing_page: location.href.split('#')[0], ts: Date.now() });
    }
    if (!store.get('lp_ref', sessionStorage)) store.set('lp_ref', document.referrer || '', sessionStorage);
  }
  function attribution() {
    const a = store.get('lp_attr') || {};
    if (a.ts && Date.now() - a.ts > 90 * 864e5) return { landing_page: location.href.split('#')[0] };
    const { ts, ...rest } = a;
    return rest;
  }

  /* ================= 3. Tracking + consent ================= */
  const T = CFG.tracking || {};
  const hasTracking = !!(T.gtmId || T.ga4Id || T.adsId);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function loadScript(src) { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  function initTracking() {
    if (!hasTracking) return;
    const saved = store.get('lp_consent');
    const granted = !T.requireConsent || saved === 'granted';
    const state = granted ? 'granted' : 'denied';
    gtag('consent', 'default', { ad_storage: state, analytics_storage: state, ad_user_data: state, ad_personalization: state, wait_for_update: 500 });
    gtag('set', 'url_passthrough', true); // keeps gclid in URLs when cookies are denied
    gtag('set', 'ads_data_redaction', !granted);

    if (T.gtmId) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      loadScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(T.gtmId));
    }
    const tagId = T.ga4Id || T.adsId;
    if (tagId) {
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(tagId));
      gtag('js', new Date());
      if (T.ga4Id) gtag('config', T.ga4Id);
      if (T.adsId) gtag('config', T.adsId, T.enhancedConversions ? { allow_enhanced_conversions: true } : {});
    }

    const banner = $('#consent');
    const settingsBtn = $('[data-open-consent]');
    if (T.requireConsent && banner) {
      if (settingsBtn) { settingsBtn.hidden = false; settingsBtn.addEventListener('click', () => { banner.hidden = false; }); }
      if (!saved) banner.hidden = false;
      const decide = (v) => {
        store.set('lp_consent', v);
        gtag('consent', 'update', { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
        gtag('set', 'ads_data_redaction', v !== 'granted');
        window.dataLayer.push({ event: 'consent_update', consent: v });
        banner.hidden = true;
      };
      $('#consentAccept').addEventListener('click', () => decide('granted'));
      $('#consentReject').addEventListener('click', () => decide('denied'));
    }
  }

  // Generic event: goes to dataLayer (GTM) and gtag (GA4 direct).
  function track(event, params = {}) {
    window.dataLayer.push({ event, ...params });
    if (T.ga4Id) gtag('event', event, params);
  }

  /* ================= 4. Header / nav ================= */
  function initNav() {
    const burger = $('#burger'), nav = $('#nav');
    const close = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); };
    burger.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); burger.focus(); } });
    document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('#hdr')) close(); });
  }

  /* ================= 5. Course filter ================= */
  function initCourses() {
    const cards = $$('#courseGrid .course');
    const tabs = $$('.tab');
    const empty = $('#emptyState');
    let filter = 'all';
    function apply() {
      let n = 0;
      cards.forEach(c => {
        const show = filter === 'all' || c.dataset.cat === filter;
        c.hidden = !show; if (show) n++;
      });
      empty.hidden = n !== 0;
    }
    tabs.forEach(t => t.addEventListener('click', () => {
      filter = t.dataset.filter;
      tabs.forEach(x => { const on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      apply();
    }));
    $('#clearSearch').addEventListener('click', () => tabs[0].click());
  }

  /* ================= 6. CTA → scroll to form (+ preselect course) ================= */
  function goToForm(course) {
    const thanks = $('#thanks');
    if (!thanks.hidden) resetForm();
    const select = $('#f-course');
    if (course) {
      select.value = course;
      clearError(select);
      select.classList.remove('flash'); void select.offsetWidth; select.classList.add('flash');
      track('course_select', { course, source: 'course_card' });
    }
    $('#register').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    const firstEmpty = ['#f-name', '#f-phone', '#f-email', '#f-course'].map(s => $(s)).find(el => !el.value);
    setTimeout(() => (firstEmpty || $('#submitBtn')).focus({ preventScroll: true }), 450);
  }

  function initCtas() {
    document.addEventListener('click', e => {
      const courseBtn = e.target.closest('[data-course]');
      if (courseBtn) {
        track('cta_click', { cta_location: courseBtn.dataset.ctaLocation || 'course_card', course: courseBtn.dataset.course });
        goToForm(courseBtn.dataset.course);
        return;
      }
      const cta = e.target.closest('[data-cta]');
      if (cta) {
        track('cta_click', { cta_location: cta.dataset.cta });
        if (cta.getAttribute('href') === '#register') { e.preventDefault(); goToForm(); }
      }
    });
  }

  /* ================= 7. Form validation ================= */
  const form = $('#leadForm');
  const fields = {
    name: { el: $('#f-name'), test: v => /^[\p{L}][\p{L} .'-]{1,79}$/u.test(v.trim()) && v.trim().replace(/[^\p{L}]/gu, '').length >= 2, msg: 'Please enter your full name (letters only).' },
    phone: { el: $('#f-phone'), test: v => !!normalizePhone(v), msg: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).' },
    email: { el: $('#f-email'), test: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) && v.trim().length <= 120, msg: 'Enter a valid email address, e.g. name@example.com.' },
    course: { el: $('#f-course'), test: v => !!v, msg: "Please select the course you're interested in." }
  };
  function normalizePhone(v) {
    let d = String(v).replace(/[\s\-().]/g, '');
    if (/[^\d+]/.test(d)) return null;
    d = d.replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  }
  function showError(el, msg) { el.setAttribute('aria-invalid', 'true'); $('#' + el.getAttribute('aria-describedby')).textContent = msg; }
  function clearError(el) { el.removeAttribute('aria-invalid'); const e = $('#' + el.getAttribute('aria-describedby')); if (e) e.textContent = ''; }
  function validateField(key) {
    const f = fields[key];
    const ok = f.test(f.el.value);
    ok ? clearError(f.el) : showError(f.el, f.msg);
    return ok;
  }
  Object.keys(fields).forEach(k => {
    const el = fields[k].el;
    el.addEventListener('blur', () => { if (el.value) validateField(k); });
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.getAttribute('aria-invalid') === 'true') validateField(k); });
  });
  fields.phone.el.addEventListener('input', e => {
    const el = e.target, cleaned = el.value.replace(/[^\d+\s-]/g, '');
    if (cleaned !== el.value) el.value = cleaned;
  });
  $('#f-course').addEventListener('change', e => { if (e.target.value) track('course_select', { course: e.target.value, source: 'dropdown' }); });

  /* ================= 8. Submission ================= */
  const status = $('#formStatus');
  const btn = $('#submitBtn');
  let submitting = false;
  let formStarted = false;
  form.addEventListener('focusin', () => { if (!formStarted) { formStarted = true; track('form_start', { form_id: 'free_session' }); } });

  function setStatus(msg, type) { status.textContent = msg; status.className = 'form-status' + (msg ? ' is-' + type : ''); }
  function setLoading(on) {
    btn.disabled = on; btn.classList.toggle('loading', on); btn.setAttribute('aria-busy', String(on));
    $('.btn-label', btn).textContent = on ? 'Submitting…' : 'Reserve My Free Seat';
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  async function send(payload) {
    const fc = CFG.form || {};
    if (!fc.endpoint) {
      if (isLocal) { await new Promise(r => setTimeout(r, 700)); return { demo: true }; }
      throw new Error('not-configured');
    }
    const ctype = fc.contentType || 'application/json';
    const body = ctype === 'application/x-www-form-urlencoded' ? new URLSearchParams(payload).toString() : JSON.stringify(payload);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), fc.timeoutMs || 15000);
    try {
      const res = await fetch(fc.endpoint, { method: 'POST', headers: { 'Content-Type': ctype, Accept: 'application/json' }, body, signal: ctrl.signal, credentials: 'omit', redirect: 'follow' });
      if (!res.ok) throw new Error('http-' + res.status);
      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON 2xx is treated as success */ }
      if (data && (data.ok === false || data.success === false || data.result === 'error' || data.status === 'error')) throw new Error('rejected');
      return data || {};
    } finally { clearTimeout(timer); }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    setStatus('', '');

    const results = Object.keys(fields).map(validateField);
    if (results.includes(false)) {
      const first = Object.values(fields).find(f => f.el.getAttribute('aria-invalid') === 'true');
      setStatus('Please correct the highlighted fields.', 'error');
      first.el.focus();
      track('form_error', { form_id: 'free_session', field: Object.keys(fields).find(k => fields[k] === first) });
      return;
    }
    if ($('#f-company').value) { showThanks({ name: '', course: fields.course.el.value }, { silent: true }); return; } // bot

    const phone = normalizePhone(fields.phone.el.value);
    const course = fields.course.el.value;
    const dupKey = 'lp_reg_' + phone + '_' + course;
    const prev = store.get(dupKey);
    const windowMs = ((CFG.form && CFG.form.duplicateWindowHours) || 24) * 36e5;
    if (prev && Date.now() - prev.ts < windowMs) {
      setStatus(`You've already registered for ${course} with this mobile number. We'll contact you with the session details — no need to register again.`, 'info');
      return;
    }

    const payload = {
      submission_id: uid(),
      name: fields.name.el.value.trim().replace(/\s+/g, ' '),
      phone: '+91' + phone,
      email: fields.email.el.value.trim().toLowerCase(),
      course,
      education: $('#f-edu').value || '',
      whatsapp_consent: $('#f-wa').checked,
      session_date: get('session.date') || '',
      session_time: get('session.time') || '',
      page_url: location.href.split('#')[0],
      referrer: store.get('lp_ref', sessionStorage) || '',
      submitted_at: new Date().toISOString(),
      ...attribution()
    };

    submitting = true; setLoading(true);
    try {
      const res = await send(payload);
      store.set(dupKey, { ts: Date.now() });
      const demo = !!(res && res.demo);
      showThanks(payload, { demo });
      if (!demo) fireConversion(payload);
      else console.info('[LP] Demo mode — no endpoint configured. Payload:', payload);
    } catch (err) {
      const msg = err.message === 'not-configured'
        ? "Registration isn't available right now. Please call us or try again later."
        : err.name === 'AbortError'
          ? 'The request timed out. Please check your internet connection and try again.'
          : 'Something went wrong and your registration was not submitted. Please try again.';
      setStatus(msg, 'error');
      track('form_submit_failed', { form_id: 'free_session', reason: err.name === 'AbortError' ? 'timeout' : err.message });
      console.error('[LP] submission failed:', err);
    } finally {
      submitting = false; setLoading(false);
    }
  });

  function fireConversion(p) {
    // Separate from cta_click: this fires ONLY after the endpoint confirmed the submission.
    track('generate_lead', { form_id: 'free_session', course: p.course, lead_id: p.submission_id });
    window.dataLayer.push({ event: 'virtual_pageview', page_path: location.pathname + 'thank-you', page_title: 'Registration Thank You' });
    if (T.ga4Id) gtag('event', 'page_view', { page_location: location.origin + location.pathname + '#thank-you', page_title: 'Registration Thank You' });
    if (T.adsId && T.adsConversionLabel) {
      if (T.enhancedConversions && store.get('lp_consent') === 'granted') gtag('set', 'user_data', { email: p.email, phone_number: p.phone });
      gtag('event', 'conversion', { send_to: `${T.adsId}/${T.adsConversionLabel}`, transaction_id: p.submission_id });
    }
  }

  function showThanks(p, opts = {}) {
    $('#formWrap').hidden = true;
    const t = $('#thanks');
    $('#thanksSub').textContent = p.name ? `Thank you, ${p.name.split(' ')[0]}. We've received your registration for the free live session.` : "We've received your registration for the free live session.";
    $('#thanksCourse').textContent = p.course;
    const wa = (get('whatsapp.number') || '').replace(/\D/g, '');
    const waBtn = $('#waBtn');
    if (wa && !opts.silent) {
      const text = (get('whatsapp.message') || '').replace('{course}', p.course).replace('{name}', p.name);
      waBtn.href = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
      waBtn.hidden = false; $('#waNote').hidden = false;
      waBtn.onclick = () => track('whatsapp_click', { location: 'thank_you', course: p.course });
    }
    $('#demoNote').hidden = !opts.demo;
    t.hidden = false;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#thank-you');
    $('#register').scrollIntoView({ block: 'start' });
    t.focus({ preventScroll: true });
    updateSticky();
  }

  function resetForm() {
    form.reset();
    Object.values(fields).forEach(f => clearError(f.el));
    setStatus('', '');
    $('#thanks').hidden = true; $('#formWrap').hidden = false;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    updateSticky();
  }
  $('#againBtn').addEventListener('click', () => { resetForm(); $('#f-name').focus(); });

  /* ================= 9. Mobile sticky CTA ================= */
  const sticky = $('#stickyCta');
  let formVisible = true, pastHero = false;
  function updateSticky() {
    const show = !formVisible && pastHero && $('#thanks').hidden;
    sticky.classList.toggle('show', show);
    sticky.setAttribute('aria-hidden', String(!show));
    $('a', sticky).tabIndex = show ? 0 : -1;
    document.body.classList.toggle('has-sticky', show);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { formVisible = en.isIntersecting; updateSticky(); }, { threshold: 0.15 }).observe($('#register'));
    new IntersectionObserver(([en]) => { pastHero = !en.isIntersecting && en.boundingClientRect.top < 0; updateSticky(); }).observe($('.hero-top'));
  }

  /* ================= 10. Free demo class videos (local short videos) ================= */
  function initVideos() {
    const V = CFG.videos || {};
    const items = (V.items || []).filter(v => v && v.src);
    const sec = $('#demo-classes');
    if (!items.length) { if (sec) sec.hidden = true; return; }
    const list = $('#vlist');
    $('#vCount').textContent = items.length;
    if (V.course) $('#videoCourseBtn').dataset.course = V.course;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

    list.innerHTML = items.map((v, i) => `
      <li class="reel">
        <div class="reel-frame">
          <video src="${esc(encodeURI(v.src))}#t=0.5" preload="metadata" playsinline${v.poster ? ` poster="${esc(encodeURI(v.poster))}"` : ''}></video>
          <button type="button" class="reel-btn" data-play="${i}" aria-label="Play video: ${esc(v.title)}">
            <span class="n">VIDEO ${String(i + 1).padStart(2, '0')}</span>
            ${v.duration ? `<span class="d">${esc(v.duration)}</span>` : ''}
            <span class="pl" aria-hidden="true">${PLAY}</span>
          </button>
        </div>
        <h4>${esc(v.title)}</h4>
      </li>`).join('');

    const reels = $$('.reel', list);
    const stop = r => { const vid = $('video', r); vid.pause(); vid.controls = false; r.classList.remove('is-playing'); };
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-play]'); if (!b) return;
      const i = +b.dataset.play, r = reels[i], vid = $('video', r);
      reels.forEach(x => { if (x !== r) stop(x); }); // only one video plays at a time
      r.classList.add('is-playing');
      vid.controls = true;
      vid.play().catch(() => {});
      track('video_play', { video_title: items[i].title, video_index: i + 1 });
    });
    reels.forEach(r => $('video', r).addEventListener('ended', () => stop(r)));

    // carousel: arrows, dots, auto-slide (pauses on hover/touch/focus, while a video plays, or when the tab is hidden)
    const prev = $('#rcPrev'), next = $('#rcNext'), dotsEl = $('#rcDots');
    const step = () => reels[0].getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap || 0);
    const maxScroll = () => list.scrollWidth - list.clientWidth;
    const pages = () => Math.max(1, Math.round(maxScroll() / step()) + 1);
    const go = dir => {
      if (dir > 0 && list.scrollLeft >= maxScroll() - 4) list.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && list.scrollLeft <= 4) list.scrollTo({ left: maxScroll(), behavior: 'smooth' });
      else list.scrollBy({ left: dir * step(), behavior: 'smooth' });
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    function buildDots() {
      const n = pages();
      dotsEl.innerHTML = n > 1 ? Array.from({ length: n }, (_, k) => `<button type="button" tabindex="-1" data-k="${k}"></button>`).join('') : '';
      syncDots();
    }
    function syncDots() {
      const k = Math.round(list.scrollLeft / step());
      $$('button', dotsEl).forEach((d, i) => d.classList.toggle('on', i === k));
      const scrollable = maxScroll() > 4;
      prev.hidden = next.hidden = !scrollable;
    }
    dotsEl.addEventListener('click', e => { const d = e.target.closest('[data-k]'); if (d) list.scrollTo({ left: +d.dataset.k * step(), behavior: 'smooth' }); });
    list.addEventListener('scroll', () => requestAnimationFrame(syncDots), { passive: true });
    addEventListener('resize', buildDots);
    buildDots();

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hold = false;
    const box = list.parentElement;
    ['mouseenter', 'focusin', 'touchstart'].forEach(ev => box.addEventListener(ev, () => { hold = true; }, { passive: true }));
    ['mouseleave', 'focusout'].forEach(ev => box.addEventListener(ev, () => { hold = false; }));
    box.addEventListener('touchend', () => setTimeout(() => { hold = false; }, 4000), { passive: true });
    if (!reduced) setInterval(() => {
      if (hold || document.hidden || $('.reel.is-playing', list) || maxScroll() <= 4) return;
      go(1);
    }, 3500);
  }

  /* ================= 11. Scroll reveal ================= */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    // stagger siblings inside the same grid
    $$('.bento, .v-layout').forEach(g => $$('.reveal', g).forEach((el, i) => el.style.setProperty('--d', (i * 0.09) + 's')));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      io.unobserve(el);
      setTimeout(() => el.style.removeProperty('--d'), 1500); // so hover effects aren't delayed
    }), { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ================= init ================= */
  applyConfig();
  initVideos();
  initReveal();
  captureAttribution();
  initTracking();
  initNav();
  initCourses();
  initCtas();
  if (location.hash === '#thank-you' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
})();
