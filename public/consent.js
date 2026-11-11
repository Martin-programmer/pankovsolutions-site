/*!
 * Pankov Solutions – съгласие за бисквитки (GDPR / ePrivacy / чл. 4а ЗЕС)
 * Версия 1.0 · 10.11.2026
 *
 * Какво прави:
 *  - Нищо, което не е строго необходимо, не се зарежда преди съгласие
 *    (Google Analytics, Google Ads и Meta Pixel се зареждат САМО след „Приемам“).
 *  - Първи слой: „Отказвам всички“, „Настройки“, „Приемам всички“ с еднаква тежест.
 *  - Втори слой: категории с превключватели, всички изключени по подразбиране.
 *  - Запомня избора 12 месеца (бисквитка ps_consent) и пита отново при нова версия на политиката.
 *  - Записва доказателство за съгласието (ID, време, версия, избор) и го праща към CONSENT_LOG_URL.
 *  - Оттегляне по всяко време: всеки линк с href="#nastroiki-biskvitki" или data-cookie-settings
 *    отваря настройките; при оттегляне трие бисквитките на Google и Meta и презарежда страницата.
 *  - Google Consent Mode v2 (основен режим): default = denied за всичко, update след избора.
 *  - Meta Pixel: fbq('consent','revoke') преди init, 'grant' само при съгласие за маркетинг.
 *
 * Поставяне: src/layouts/Base.astro зарежда /consent.js на всяка страница. ID-тата идват от
 * data-атрибутите (env GA4_ID, GOOGLE_ADS_ID, META_PIXEL_ID при build). Без нито едно ID
 * банерът не се показва: тогава сайтът ползва само строго необходими бисквитки.
 * Не поставяйте gtag.js или пиксела директно в страниците.
 */
(function () {
  'use strict';

  // ---- Настройки ---------------------------------------------------------
  var me = document.currentScript || document.querySelector('script[src="/consent.js"]');
  var ds = (me && me.dataset) || {};
  var CONFIG = {
    policyVersion: '2026-11-10',          // сменете при промяна на политиката → банерът се показва отново
    cookieName: 'ps_consent',
    maxAgeDays: 365,                       // 12 месеца
    consentLogUrl: '/api/consent',         // ендпойнт за запис на доказателство (POST JSON); '' = изключено
    policyUrl: ds.policy || '/cookies',
    ga4Id: ds.ga4 || '',                   // Google Analytics 4 (G-…)
    adsId: ds.ads || '',                   // Google Ads (AW-…)
    metaPixelId: ds.meta || ''             // Meta Pixel
  };
  var EN = (ds.lang || document.documentElement.lang) === 'en';
  var T = EN ? {
    h: 'We use cookies',
    d: 'Strictly necessary cookies keep the website working. With your consent we will also use Google and Meta cookies to measure visits and our ads, and to show you our ads on other websites (data may be transferred to the USA). You can change your choice at any time via “Cookie settings” at the bottom of the page.',
    policy: 'Cookie policy', list: 'Full list of cookies',
    reject: 'Reject all', settings: 'Settings', accept: 'Accept all', save: 'Save my choice',
    sh: 'Cookie settings', sd: 'Choose which cookies to allow. Without your consent only strictly necessary cookies are used.',
    nec: 'Strictly necessary', always: 'Always active',
    necD: 'They remember your cookie choice and protect the forms from spam (Cloudflare Turnstile). The website cannot work properly without them.',
    an: 'Analytics', anD: 'Google Analytics: how many people visit the website, which pages they view and where they come from. Provider: Google Ireland Limited, with possible transfer to the USA.',
    mk: 'Marketing', mkD: 'Google Ads and Meta Pixel: measuring enquiries from our ads and showing our ads on Google, Facebook and Instagram. Providers: Google Ireland Limited and Meta Platforms Ireland Limited, with possible transfer to the USA.'
  } : {
    h: 'Използваме бисквитки',
    d: 'Строго необходимите бисквитки осигуряват работата на сайта. С Ваше съгласие ще използваме и бисквитки на Google и Meta, за да измерваме посещаемостта и рекламите си и да Ви показваме наши реклами в други сайтове (възможен е трансфер на данни към САЩ). Можете да промените избора си по всяко време от „Настройки на бисквитките“ в долната част на страницата.',
    policy: 'Политика за бисквитки', list: 'Пълен списък на бисквитките',
    reject: 'Отказвам всички', settings: 'Настройки', accept: 'Приемам всички', save: 'Запазвам избора',
    sh: 'Настройки на бисквитките', sd: 'Изберете кои бисквитки да разрешите. Без Ваше съгласие се използват само строго необходимите.',
    nec: 'Строго необходими', always: 'Винаги активни',
    necD: 'Запомнят избора Ви за бисквитките и защитават формите от спам (Cloudflare Turnstile). Без тях сайтът не може да работи правилно.',
    an: 'Аналитични', anD: 'Google Analytics: колко хора посещават сайта, кои страници разглеждат и откъде идват. Доставчик: Google Ireland Limited, с възможен трансфер към САЩ.',
    mk: 'Маркетингови', mkD: 'Google Ads и Meta Pixel: измерване на запитванията от рекламите и показване на наши реклами в Google, Facebook и Instagram. Доставчици: Google Ireland Limited и Meta Platforms Ireland Limited, с възможен трансфер към САЩ.'
  };
  var TRACKING = !!(CONFIG.ga4Id || CONFIG.adsId || CONFIG.metaPixelId);

  // ---- Помощни -----------------------------------------------------------
  function readConsent() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + CONFIG.cookieName + '=([^;]*)'));
    if (!m) return null;
    try {
      var c = JSON.parse(decodeURIComponent(m[1]));
      if (c.v !== CONFIG.policyVersion) return null;               // нова версия → пита отново
      if (Date.now() - Date.parse(c.ts) > CONFIG.maxAgeDays * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
      var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function writeConsent(choice, method) {
    var prev = readConsent();
    var rec = {
      id: (prev && prev.id) || uuid(),
      ts: new Date().toISOString(),
      v: CONFIG.policyVersion,
      necessary: true,
      analytics: !!choice.analytics,
      marketing: !!choice.marketing,
      method: method                      // accept_all | reject_all | custom | withdraw
    };
    document.cookie = CONFIG.cookieName + '=' + encodeURIComponent(JSON.stringify(rec)) +
      '; Max-Age=' + (CONFIG.maxAgeDays * 86400) + '; Path=/; SameSite=Lax' +
      (location.protocol === 'https:' ? '; Secure' : '');
    if (CONFIG.consentLogUrl) {
      var body = JSON.stringify({ id: rec.id, ts: rec.ts, version: rec.v, analytics: rec.analytics,
        marketing: rec.marketing, method: rec.method, page: location.pathname });
      try { navigator.sendBeacon(CONFIG.consentLogUrl, new Blob([body], { type: 'application/json' })); }
      catch (e) { fetch(CONFIG.consentLogUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }); }
    }
    return rec;
  }
  function deleteTrackingCookies() {
    var host = location.hostname.split('.');
    var domains = ['', location.hostname, '.' + location.hostname];
    if (host.length > 2) domains.push('.' + host.slice(-2).join('.'));
    document.cookie.split('; ').forEach(function (c) {
      var name = c.split('=')[0];
      if (/^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : '');
        });
      }
    });
  }
  function loadScript(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  // ---- Google Consent Mode v2: всичко отказано по подразбиране --------------
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'denied', personalization_storage: 'denied',
    security_storage: 'granted'
  });
  gtag('set', 'ads_data_redaction', true);

  var loaded = { google: false, meta: false };
  function applyConsent(c) {
    gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied'
    });
    // Основен режим: Google таговете се зареждат едва след съгласие
    var wantGa = c.analytics && CONFIG.ga4Id, wantAds = c.marketing && CONFIG.adsId;
    if ((wantGa || wantAds) && !loaded.google) {
      loaded.google = true;
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + (wantGa ? CONFIG.ga4Id : CONFIG.adsId));
      gtag('js', new Date());
      if (wantGa) gtag('config', CONFIG.ga4Id);
      if (wantAds) gtag('config', CONFIG.adsId);
    }
    if (c.marketing && CONFIG.metaPixelId && !loaded.meta) {
      loaded.meta = true;
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('consent', 'grant');
      fbq('init', CONFIG.metaPixelId);
      fbq('track', 'PageView');
    }
    if (window.fbq && !c.marketing) fbq('consent', 'revoke');
  }

  // ---- Интерфейс ------------------------------------------------------------
  var css = '' +
  '.pc-wrap,.pc-wrap *{font-feature-settings:"locl" 0}.pc-wrap{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;display:flex;justify-content:center;font-family:Manrope,system-ui,sans-serif}' +
  '.pc-box{width:100%;max-width:1040px;background:#fff;color:#0B1B3A;border:1px solid #DCE4F0;border-radius:16px 16px 48px 16px;box-shadow:0 24px 60px rgba(10,42,102,.22);padding:24px 28px;box-sizing:border-box;max-height:calc(100vh - 32px);overflow:auto}' +
  '.pc-h{margin:0 0 8px;font-family:Onest,sans-serif;font-weight:600;font-size:20px;line-height:28px}' +
  '.pc-p{margin:0;font-size:15px;line-height:24px;color:#2B3A55}.pc-p a{color:#2563EB}' +
  '.pc-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}' +
  '.pc-btn{flex:1 1 180px;height:48px;border-radius:10px;border:2px solid #0A2A66;background:#0A2A66;color:#fff;font:600 15px Manrope,sans-serif;cursor:pointer}' +
  '.pc-btn:hover{background:#163C85;border-color:#163C85}' +
  '.pc-btn2{background:#fff;color:#0A2A66}.pc-btn2:hover{background:#E3ECFE;border-color:#0A2A66}' +
  '.pc-btn:focus-visible,.pc-sw:focus-visible,.pc-x:focus-visible{outline:3px solid #2563EB;outline-offset:3px}' +
  '.pc-cat{border:1px solid #DCE4F0;border-radius:12px;padding:14px 16px;margin-top:10px}' +
  '.pc-cat-h{display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:600;font-size:16px}' +
  '.pc-cat p{margin:6px 0 0;font-size:14px;line-height:22px;color:#4A5872}' +
  '.pc-sw{flex:none;position:relative;width:48px;height:28px;border-radius:14px;border:0;background:#7C8AA3;cursor:pointer}' +
  '.pc-sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}' +
  '.pc-sw[aria-checked="true"]{background:#2563EB}.pc-sw[aria-checked="true"]::after{left:23px}' +
  '.pc-sw:disabled{background:#0A2A66;opacity:.55;cursor:not-allowed}' +
  '.pc-always{font-size:13px;color:#4A5872;font-weight:600}' +
  '@media(max-width:620px){.pc-wrap{left:8px;right:8px;bottom:8px}.pc-box{padding:18px;border-radius:16px}.pc-p{font-size:14px;line-height:22px}.pc-btn{flex-basis:100%;height:44px}.pc-row{gap:8px;margin-top:14px}}';

  var root, lastFocus;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function close() { if (root) { root.remove(); root = null; } if (lastFocus) lastFocus.focus(); }

  function finish(choice, method) {
    var prev = readConsent();
    var rec = writeConsent(choice, method);
    var revoked = prev && ((prev.analytics && !rec.analytics) || (prev.marketing && !rec.marketing));
    close();
    if (revoked) { deleteTrackingCookies(); location.reload(); return; }
    applyConsent(rec);
  }

  function showBanner() {
    if (root) close();
    lastFocus = document.activeElement;
    root = el('<div class="pc-wrap"><div class="pc-box" role="dialog" aria-modal="false" aria-labelledby="pc-h" aria-describedby="pc-d">' +
      '<p class="pc-h" id="pc-h">' + T.h + '</p>' +
      '<p class="pc-p" id="pc-d">' + T.d + ' <a href="' + CONFIG.policyUrl + '">' + T.policy + '</a></p>' +
      '<div class="pc-row"><button type="button" class="pc-btn" data-a="reject">' + T.reject + '</button>' +
      '<button type="button" class="pc-btn pc-btn2" data-a="settings">' + T.settings + '</button>' +
      '<button type="button" class="pc-btn" data-a="accept">' + T.accept + '</button></div></div></div>');
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-a');
      if (a === 'reject') finish({ analytics: false, marketing: false }, 'reject_all');
      if (a === 'accept') finish({ analytics: true, marketing: true }, 'accept_all');
      if (a === 'settings') showSettings();
    });
    root.querySelector('.pc-btn').focus();
  }

  function sw(id, on) { return '<button type="button" class="pc-sw" role="switch" id="' + id + '" aria-checked="' + (on ? 'true' : 'false') + '" aria-labelledby="' + id + '-l"></button>'; }
  function showSettings() {
    if (root) root.remove();
    var c = readConsent() || { analytics: false, marketing: false };
    root = el('<div class="pc-wrap"><div class="pc-box" role="dialog" aria-modal="true" aria-labelledby="pc-sh">' +
      '<p class="pc-h" id="pc-sh">' + T.sh + '</p>' +
      '<p class="pc-p">' + T.sd + ' <a href="' + CONFIG.policyUrl + '">' + T.list + '</a></p>' +
      '<div class="pc-cat"><div class="pc-cat-h"><span id="pc-n-l">' + T.nec + '</span><span class="pc-always">' + T.always + '</span></div><p>' + T.necD + '</p></div>' +
      '<div class="pc-cat"><div class="pc-cat-h"><span id="pc-an-l">' + T.an + '</span>' + sw('pc-an', c.analytics) + '</div><p>' + T.anD + '</p></div>' +
      '<div class="pc-cat"><div class="pc-cat-h"><span id="pc-mk-l">' + T.mk + '</span>' + sw('pc-mk', c.marketing) + '</div><p>' + T.mkD + '</p></div>' +
      '<div class="pc-row"><button type="button" class="pc-btn" data-a="reject">' + T.reject + '</button>' +
      '<button type="button" class="pc-btn pc-btn2" data-a="save">' + T.save + '</button>' +
      '<button type="button" class="pc-btn" data-a="accept">' + T.accept + '</button></div></div></div>');
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      if (e.target.classList.contains('pc-sw')) { e.target.setAttribute('aria-checked', e.target.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); return; }
      var a = e.target.getAttribute('data-a');
      if (a === 'reject') finish({ analytics: false, marketing: false }, 'reject_all');
      if (a === 'accept') finish({ analytics: true, marketing: true }, 'accept_all');
      if (a === 'save') finish({ analytics: root.querySelector('#pc-an').getAttribute('aria-checked') === 'true',
                                 marketing: root.querySelector('#pc-mk').getAttribute('aria-checked') === 'true' }, 'custom');
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && readConsent()) close(); });
    root.querySelector('.pc-sw').focus();
  }

  // ---- Старт ---------------------------------------------------------------
  function init() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#nastroiki-biskvitki"],[data-cookie-settings]');
      if (a) { e.preventDefault(); showSettings(); }
    });
    var c = readConsent();
    if (c) applyConsent(c); else if (TRACKING) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.PankovConsent = { open: showSettings, get: readConsent };
})();
