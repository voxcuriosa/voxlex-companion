/**
 * Skript for å generere Chrome Web Store-skjermbilder og promo-bannere
 * i eksakt påkrevde dimensjoner (1280x800, 440x280, 1400x560) uten alfakanal (JPEG/24-bit).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STORE_DIR = path.join(ROOT, 'store-assets');
fs.mkdirSync(STORE_DIR, { recursive: true });

const LOGO_BASE64 = fs.readFileSync(path.join(ROOT, 'icons', 'voxlex-logo.png')).toString('base64');
const LOGO_SRC = `data:image/png;base64,${LOGO_BASE64}`;

// 1. Skjermbilde 1 (1280x800): Leseopplevelse i læremiddel med oppslagskort
const htmlScreenshot1 = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 800px;
    background: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    overflow: hidden;
  }
  .browser-bar {
    height: 48px; background: #0f172a;
    display: flex; align-items: center; padding: 0 16px; gap: 12px;
    border-bottom: 1px solid #334155;
  }
  .dots { display: flex; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .url-bar {
    flex: 1; max-width: 680px; height: 32px; background: #1e293b;
    border-radius: 8px; display: flex; align-items: center; padding: 0 14px;
    color: #94a3b8; font-size: 13px; margin: 0 auto;
  }
  .url-bar strong { color: #f8fafc; font-weight: 500; }
  .ext-icon { width: 24px; height: 24px; border-radius: 6px; }
  
  .page-container {
    display: flex; height: calc(800px - 48px);
  }
  .sidebar {
    width: 260px; background: #ffffff; border-right: 1px solid #e2e8f0;
    padding: 24px 20px;
  }
  .sidebar h3 { font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 16px; }
  .sidebar-item { padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #334155; margin-bottom: 4px; }
  .sidebar-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 600; }
  
  .content-area {
    flex: 1; padding: 48px 72px; background: #ffffff; position: relative;
    max-width: 860px;
  }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
  h1 { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 18px; line-height: 1.25; }
  .ingress { font-size: 19px; line-height: 1.6; color: #334155; margin-bottom: 24px; font-weight: 400; }
  p { font-size: 16.5px; line-height: 1.7; color: #475569; margin-bottom: 18px; }
  
  .highlight-word {
    background: #fef08a; color: #0f172a; padding: 2px 4px; border-radius: 4px; font-weight: 600;
  }

  /* VoxLex Floating Popup */
  .voxlex-popup {
    position: absolute;
    top: 260px; left: 240px;
    width: 380px;
    background: #0f172a;
    color: #f8fafc;
    border: 1.5px solid #334155;
    border-radius: 18px;
    padding: 16px 18px 14px 18px;
    box-shadow: 0 20px 40px rgba(2, 6, 23, 0.65), 0 0 0 1px rgba(251, 191, 36, 0.2);
    font-family: Inter, -apple-system, sans-serif;
    line-height: 1.55;
  }
  .voxlex-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #1e293b;
  }
  .voxlex-title { display: flex; align-items: center; gap: 8px; }
  .voxlex-badge { font-size: 11px; font-weight: 700; color: #cbd5e1; background: #1e293b; border: 1px solid #475569; padding: 2px 7px; border-radius: 6px; }
  .voxlex-word { font-size: 19px; font-weight: 700; color: #fbbf24; }
  .voxlex-ctrls { display: flex; align-items: center; gap: 8px; }
  .voxlex-btn {
    background: #1e293b; color: #f8fafc; border: 1px solid #475569;
    padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 7px;
  }
  .voxlex-select {
    background: #1e293b; color: #f8fafc; border: 1px solid #475569;
    padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 7px;
  }
  .voxlex-close { background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0 4px; }
  
  .voxlex-pills { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
  .voxlex-pill {
    background: #1e293b; color: #e2e8f0; border: 1px solid #475569;
    padding: 4px 12px; font-size: 13.5px; font-weight: 600; border-radius: 999px;
  }
  .voxlex-pill.active { border-color: #fbbf24; color: #fbbf24; }
  .voxlex-def { font-size: 15px; color: #f8fafc; margin-bottom: 14px; line-height: 1.55; }
  
  .voxlex-footer {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid #1e293b; padding-top: 10px; font-size: 11.5px;
  }
  .voxlex-brand { color: #94a3b8; font-weight: 600; }
  .voxlex-links a { color: #cbd5e1; text-decoration: none; margin-left: 8px; font-weight: 600; }
</style>
</head>
<body>
<div class="browser-bar">
  <div class="dots"><div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div></div>
  <div class="url-bar">https://<strong>skole.smartbok.no</strong>/samfunnsfag-vgs/kapittel-3/demokrati</div>
  <img class="ext-icon" src="${LOGO_SRC}" alt="VoxLex">
</div>
<div class="page-container">
  <div class="sidebar">
    <h3>Innhold - Samfunnskunnskap</h3>
    <div class="sidebar-item">1. Individ og samfunn</div>
    <div class="sidebar-item">2. Velferdsstaten</div>
    <div class="sidebar-item active">3. Politikk og demokrati</div>
    <div class="sidebar-item">4. Internasjonale forhold</div>
  </div>
  <div class="content-area">
    <span class="badge">KAPITTEL 3.1</span>
    <h1>Folkestyre og medborgerskap</h1>
    <p class="ingress">Hvordan kan innbyggerne påvirke samfunnet de lever i, og hva kjennetegner et velfungerende samfunn med maktfordeling og frie valg?</p>
    <p>Norge er bygget på prinsipper om likeverd, ytringsfrihet og rettssikkerhet. I et moderne <span class="highlight-word">demokrati</span> har innbyggerne rett til å delta i frie valg og ytre sine meninger åpent.</p>
    <p>Gjennom organisasjonsliv, offentlig debatt og folkevalgte representanter sikres at politiske beslutninger har legitimitet i befolkningen.</p>
    
    <!-- Popup Card -->
    <div class="voxlex-popup">
      <div class="voxlex-header">
        <div class="voxlex-title">
          <span class="voxlex-badge">[ORDBOK]</span>
          <strong class="voxlex-word">demokrati</strong>
        </div>
        <div class="voxlex-ctrls">
          <button class="voxlex-btn">LYD</button>
          <select class="voxlex-select"><option>Norsk</option><option>Ukrainsk</option><option>Arabisk</option></select>
          <span class="voxlex-close">✕</span>
        </div>
      </div>
      <div class="voxlex-pills">
        <span class="voxlex-pill active">folkestyre</span>
        <span class="voxlex-pill">folkemakt</span>
        <span class="voxlex-pill">flertallsstyre</span>
        <span class="voxlex-pill">medbestemmelse</span>
      </div>
      <p class="voxlex-def">Styreform der flertallet av folket har den avgjørende makten, enten gjennom direkte avstemninger eller gjennom valg av representanter.</p>
      <div class="voxlex-footer">
        <span class="voxlex-brand">VoxLex Lesehjelp</span>
        <div class="voxlex-links">
          <a href="#">[Ordbøkene]</a>
          <a href="#">[SNL]</a>
          <a href="#">[Wikipedia]</a>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

// 2. Skjermbilde 2 (1280x800): Morsmålsstøtte og sammensatte ord
const htmlScreenshot2 = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 800px;
    background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .header-banner {
    padding: 36px 64px 24px 64px; text-align: center;
  }
  .logo-row { display: inline-flex; align-items: center; gap: 14px; margin-bottom: 12px; }
  .logo-img { width: 44px; height: 44px; border-radius: 10px; }
  .brand-title { font-size: 28px; font-weight: 800; color: #fbbf24; }
  .tagline { font-size: 16px; color: #94a3b8; }

  .cards-grid {
    display: flex; justify-content: center; gap: 36px; padding: 12px 64px 40px 64px;
  }
  .card-wrap {
    width: 380px; background: #1e293b; border: 1.5px solid #334155; border-radius: 18px;
    padding: 20px; box-shadow: 0 16px 36px rgba(0,0,0,0.5);
  }
  .card-label { font-size: 11px; font-weight: 700; color: #fbbf24; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
  .voxlex-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #334155;
  }
  .voxlex-title { display: flex; align-items: center; gap: 8px; }
  .voxlex-badge { font-size: 11px; font-weight: 700; color: #cbd5e1; background: #0f172a; border: 1px solid #475569; padding: 2px 7px; border-radius: 6px; }
  .voxlex-word { font-size: 18px; font-weight: 700; color: #fbbf24; }
  .voxlex-btn {
    background: #0f172a; color: #f8fafc; border: 1px solid #475569;
    padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 7px;
  }
  .voxlex-select {
    background: #0f172a; color: #f8fafc; border: 1px solid #475569;
    padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 7px;
  }
  .voxlex-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .voxlex-pill {
    background: #0f172a; color: #e2e8f0; border: 1px solid #475569;
    padding: 3px 11px; font-size: 13px; font-weight: 600; border-radius: 999px;
  }
  .voxlex-def { font-size: 14.5px; color: #f8fafc; margin-bottom: 12px; line-height: 1.5; }
  
  .trans-box {
    background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;
  }
  .trans-head { font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 3px; }
  .trans-text { font-size: 13.5px; color: #e2e8f0; line-height: 1.45; }

  .voxlex-footer {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid #334155; padding-top: 10px; font-size: 11.5px;
  }
  .voxlex-brand { color: #94a3b8; font-weight: 600; }
  .voxlex-links a { color: #cbd5e1; text-decoration: none; margin-left: 8px; font-weight: 600; }
</style>
</head>
<body>
<div class="header-banner">
  <div class="logo-row">
    <img class="logo-img" src="${LOGO_SRC}" alt="VoxLex">
    <div class="brand-title">VoxLex Companion</div>
  </div>
  <p class="tagline">96 000+ oppslagsord lokalt • 0 ms responstid • 100 % personverntrygg for videregående skole</p>
</div>

<div class="cards-grid">
  <!-- Card 1: Multilingual -->
  <div class="card-wrap">
    <div class="card-label">Flerspråklig støtte</div>
    <div class="voxlex-header">
      <div class="voxlex-title">
        <span class="voxlex-badge">[ORDBOK]</span>
        <strong class="voxlex-word">bærekraftig</strong>
      </div>
      <div class="voxlex-ctrls">
        <button class="voxlex-btn">LYD</button>
        <select class="voxlex-select"><option>Ukrainsk</option><option>Arabisk</option><option>Engelsk</option></select>
      </div>
    </div>
    <div class="voxlex-pills">
      <span class="voxlex-pill">miljøvennlig</span>
      <span class="voxlex-pill">langsiktig</span>
      <span class="voxlex-pill">levedyktig</span>
    </div>
    <p class="voxlex-def">Noe som tar vare på miljø, økonomi og sosiale forhold slik at det kan vare over lang tid.</p>
    <div class="trans-box">
      <div class="trans-head">сталий (stalyy)</div>
      <p class="trans-text">Те, що зберігає довкілля та ресурси для майбутніх поколінь.</p>
    </div>
    <div class="voxlex-footer">
      <span class="voxlex-brand">Morsmålsstøtte</span>
      <div class="voxlex-links"><a href="#">[SNL]</a><a href="#">[Ordbøkene]</a></div>
    </div>
  </div>

  <!-- Card 2: Compound words -->
  <div class="card-wrap">
    <div class="card-label">Sammensatte fagord</div>
    <div class="voxlex-header">
      <div class="voxlex-title">
        <span class="voxlex-badge">[SAMMENSATT]</span>
        <strong class="voxlex-word">solcelletak</strong>
      </div>
      <div class="voxlex-ctrls">
        <button class="voxlex-btn">LYD</button>
        <select class="voxlex-select"><option>Norsk</option></select>
      </div>
    </div>
    <div class="voxlex-pills">
      <span class="voxlex-pill">solcelle</span>
      <span class="voxlex-pill">hustak</span>
      <span class="voxlex-pill">solpanel</span>
    </div>
    <p class="voxlex-def">Sammensatt av «solcelle» og «tak». En teknisk enhet som omdanner lysenergi til strøm, montert på den øverste delen som dekker en bygning.</p>
    <div class="voxlex-footer">
      <span class="voxlex-brand">Lokal delingsmotor</span>
      <div class="voxlex-links"><a href="#">[SNL]</a><a href="#">[Wikipedia]</a></div>
    </div>
  </div>
</div>
</body>
</html>`;

// 3. Small Promo Tile (440x280)
const htmlPromoSmall = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 440px; height: 280px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 24px; text-align: center; overflow: hidden;
    position: relative;
  }
  .border-glow {
    position: absolute; inset: 6px;
    border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 14px;
    pointer-events: none;
  }
  .logo { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px; box-shadow: 0 8px 18px rgba(0,0,0,0.4); }
  h1 { font-size: 22px; font-weight: 800; color: #fbbf24; margin-bottom: 6px; letter-spacing: -0.01em; }
  .subtitle { font-size: 13.5px; font-weight: 600; color: #e2e8f0; margin-bottom: 12px; }
  .tags { display: flex; gap: 6px; justify-content: center; }
  .tag {
    background: #0f172a; border: 1px solid #475569; color: #cbd5e1;
    font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px;
  }
  .school-badge {
    margin-top: 14px; font-size: 11px; font-weight: 600; color: #94a3b8;
  }
</style>
</head>
<body>
<div class="border-glow"></div>
<img class="logo" src="${LOGO_SRC}" alt="VoxLex">
<h1>VoxLex Companion</h1>
<p class="subtitle">Synonymer & enkle ordforklaringer ved dobbeltklikk</p>
<div class="tags">
  <span class="tag">0 ms lokal ordbok</span>
  <span class="tag">Taleopplesing</span>
  <span class="tag">Morsmålsstøtte</span>
</div>
<p class="school-badge">100 % personverntrygg • Videregående skole</p>
</body>
</html>`;

// 4. Marquee Promo Tile (1400x560)
const htmlPromoMarquee = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1400px; height: 560px;
    background: radial-gradient(circle at 75% 50%, #1e293b 0%, #0f172a 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 96px; overflow: hidden;
  }
  .left-col { max-width: 600px; }
  .logo-row { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; }
  .logo { width: 72px; height: 72px; border-radius: 16px; box-shadow: 0 10px 24px rgba(0,0,0,0.5); }
  .brand-name { font-size: 40px; font-weight: 900; color: #fbbf24; letter-spacing: -0.02em; }
  h2 { font-size: 26px; font-weight: 700; color: #f8fafc; line-height: 1.3; margin-bottom: 16px; }
  p.desc { font-size: 17px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
  
  .feature-list { display: flex; flex-direction: column; gap: 10px; }
  .feat-item { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: #e2e8f0; }
  .bullet { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; }

  /* Right Mockup */
  .right-col {
    width: 440px; background: #0f172a; border: 1.5px solid #334155; border-radius: 20px;
    padding: 22px; box-shadow: 0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.2);
  }
  .m-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #1e293b; margin-bottom: 14px; }
  .m-badge { font-size: 11px; font-weight: 700; color: #cbd5e1; background: #1e293b; border: 1px solid #475569; padding: 2px 8px; border-radius: 6px; }
  .m-word { font-size: 22px; font-weight: 700; color: #fbbf24; margin-left: 8px; }
  .m-ctrls button { background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 7px; }
  .m-pills { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
  .m-pill { background: #1e293b; color: #e2e8f0; border: 1px solid #475569; padding: 4px 12px; font-size: 14px; font-weight: 600; border-radius: 999px; }
  .m-pill.hi { border-color: #fbbf24; color: #fbbf24; }
  .m-def { font-size: 16px; color: #f8fafc; line-height: 1.55; margin-bottom: 16px; }
  .m-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 12px; font-size: 12px; color: #94a3b8; }
  .m-links a { color: #cbd5e1; text-decoration: none; margin-left: 8px; font-weight: 600; }
</style>
</head>
<body>
<div class="left-col">
  <div class="logo-row">
    <img class="logo" src="${LOGO_SRC}" alt="VoxLex">
    <div class="brand-name">VoxLex Companion</div>
  </div>
  <h2>Universell lese- og ordforklaring for videregående skole</h2>
  <p class="desc">Fungerer direkte i Smartbok, Unibok, NDLA og på alle nettsider. Dobbeltklikk for umiddelbare synonymer, enkel forklaring og opplesing.</p>
  <div class="feature-list">
    <div class="feat-item"><span class="bullet"></span> 96 000+ oppslagsord fra Bokmålsordboka (0 ms offline)</div>
    <div class="feat-item"><span class="bullet"></span> Taleopplesing (nb-NO) & flerspråklig morsmålsstøtte</div>
    <div class="feat-item"><span class="bullet"></span> 100 % GDPR-trygg: Null innlogging, null sporing, null cookies</div>
  </div>
</div>

<div class="right-col">
  <div class="m-header">
    <div>
      <span class="m-badge">[ORDBOK]</span>
      <span class="m-word">demokrati</span>
    </div>
    <div class="m-ctrls">
      <button>LYD</button>
    </div>
  </div>
  <div class="m-pills">
    <span class="m-pill hi">folkestyre</span>
    <span class="m-pill">folkemakt</span>
    <span class="m-pill">flertallsstyre</span>
    <span class="m-pill">medbestemmelse</span>
  </div>
  <p class="m-def">Styreform der flertallet av folket har den avgjørende makten, enten gjennom direkte avstemninger eller valg av politiske representanter.</p>
  <div class="m-footer">
    <span>VoxLex Lesehjelp</span>
    <div class="m-links">
      <a href="#">[Ordbøkene]</a>
      <a href="#">[SNL]</a>
      <a href="#">[Wikipedia]</a>
    </div>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync('/tmp/cws-screenshot-1.html', htmlScreenshot1, 'utf8');
fs.writeFileSync('/tmp/cws-screenshot-2.html', htmlScreenshot2, 'utf8');
fs.writeFileSync('/tmp/cws-promo-small.html', htmlPromoSmall, 'utf8');
fs.writeFileSync('/tmp/cws-promo-marquee.html', htmlPromoMarquee, 'utf8');

console.log('[OK] HTML templates skrevet til /tmp/');
