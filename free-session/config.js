/*
 * ============================================================
 *  LANDING PAGE CONFIGURATION — edit this file only.
 *  Nothing secret goes here: this file is public in the browser.
 *  API keys / CRM tokens must live on your server (see README.md).
 * ============================================================
 */
window.LP_CONFIG = {
  institute: {
    name: 'Coding Hubs School of AI',
    phone: '+91 74640 99059',            // shown on page
    email: 'info@codingnowai.in',
    address: '9th Floor, Pearls Best Heights-I, 904, Netaji Subhash Place, Delhi – 110034',
    website: 'https://codingnowai.in/',   // e.g. 'https://www.yourdomain.com' (row hidden if empty)
    social: {                             // links hidden if empty
      instagram: 'https://www.instagram.com/codinghubschoolofai',
      linkedin: 'https://www.linkedin.com/in/codinghub-school-of-ai-a4934843b',
      youtube: 'https://www.youtube.com/channel/UCs9KndvnhsYtoy2OCHsmf5g',
      facebook: 'https://www.facebook.com/profile.php?id=61595114751548'
    }
  },

  // Session details — leave as 'To Be Announced' until confirmed.
  session: {
    date: 'To Be Announced',
    time: 'To Be Announced'
  },

  // WhatsApp (country code + number, digits only). Empty = hide WhatsApp button.
  whatsapp: {
    number: '917464099059',
    message: 'Hi! I just registered for the free 2-hour live session for "{course}". My name is {name}. Please share the session details.'
  },

  form: {
    // Your lead endpoint: own API, CRM webhook, Zapier/Make webhook, Google Apps Script, etc.
    // EMPTY = demo mode on localhost/file only; on a live domain the form shows an error instead of fake success.
    endpoint: '',
    // 'application/json' | 'text/plain' (Google Apps Script, avoids CORS preflight) | 'application/x-www-form-urlencoded'
    contentType: 'application/json',
    timeoutMs: 15000,
    duplicateWindowHours: 24              // same mobile + course on same device is not re-submitted within this window
  },

  // Free demo class videos (short vertical videos stored in img/videos/). Add / remove / reorder freely.
  // src = file path, title = shown under the video, duration = optional label on the video.
  videos: {
    course: '',   // optional: course preselected by the "join live session" button under the videos
    items: [
      { src: 'img/videos/demo-1.mp4', title: 'AI Challenge: Day 3', duration: '1:06' },
      { src: 'img/videos/demo-2.mp4', title: 'Multi-Agent Systems', duration: '0:44' },
      { src: 'img/videos/demo-3.mp4', title: 'Claude vs Codex', duration: '0:53' },
      { src: 'img/videos/demo-4.mp4', title: 'AI Concept Challenge', duration: '0:40' },
      { src: 'img/videos/demo-5.mp4', title: 'ChatGPT for Developers', duration: '1:06' },
      { src: 'img/videos/demo-6.mp4', title: 'End-to-End AI Solutions', duration: '0:30' }
    ]
  },

  tracking: {
    gtmId: '',               // 'GTM-XXXXXXX'  (if you use GTM, configure GA4/Ads tags inside GTM and leave the two below empty)
    ga4Id: '',               // 'G-XXXXXXXXXX'
    adsId: '',               // 'AW-XXXXXXXXXX'
    adsConversionLabel: '',  // conversion label from Google Ads → fires ONLY after a successful registration
    enhancedConversions: false, // sends hashed email/phone to Google Ads (only after consent). Enable in Ads too.
    requireConsent: true     // show cookie banner & use Consent Mode v2 (denied until user accepts)
  }
};
