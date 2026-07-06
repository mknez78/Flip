// StPageFlip responsive flipbook
// Cita STVARNE dimenzije prve slike, pa prilagodjava prikaz bilo kom formatu.
// Radi za B5, A4, A5, custom — bilo sta.

const NUM_PAGES = 24;
const PAGES = Array.from({ length: NUM_PAGES }, (_, i) =>
  `pages/page_${String(i + 1).padStart(2, '0')}.jpg`
);

// Mode: 'book' = 2 strane horizontalno, 'single' = 1 strana
// Na mobilnim uredjajima UVEK forsiramo 'single' (telefon u portrait i u landscape)
function isMobileDevice() {
  // Touch uredjaj (telefon ili tablet) — ili uski ekran
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const narrowScreen = window.innerWidth < 1024;
  return hasTouch || narrowScreen;
}
function effectiveMode(requested) {
  if (isMobileDevice()) return 'single';
  return requested;
}
const getStoredMode = () => localStorage.getItem('flipbook-mode') || 'book';
const setMode = (m) => { if (!isMobileDevice()) localStorage.setItem('flipbook-mode', m); };

// Stvarni aspect ratio iz prve slike (ucitava se asinhrono, ali ceka se)
function loadImageDims(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

let pageFlip = null;
let currentMode = getStoredMode();
let pageAspect = 1.42; // fallback, prepisuje se iz prave slike

async function init() {
  try {
    const dims = await loadImageDims(PAGES[0]);
    pageAspect = dims.w / dims.h;
    console.log(`Flipbook: prva slika ${dims.w}x${dims.h}, aspect ${pageAspect.toFixed(4)}`);
  } catch (e) {
    console.warn('Ne mogu da procitam dimenzije, koristim fallback 1.42');
  }
  buildBook(currentMode);
}

// Dimenzije jedne strane koje STANU u viewport (StPageFlip automatski duplira u book modu)
function calcSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = isMobileDevice();
  const mode = effectiveMode(currentMode);

  // U book modu knjiga zauzima 2 × sirinu strane horizontalno
  const bookAspect = mode === 'book' ? pageAspect * 2 : pageAspect;

  // Na mobilnom koristimo 99% sirine (maksimalno iskoriscen prostor)
  // Na desktopu 95% da ostane malo prostora oko knjige
  const maxBookW = vw * (isMobile ? 0.99 : 0.95);
  // Visina: manje rezervacije za toolbar na mobilnom
  const toolbarH = isMobile ? 52 : 70;
  const maxBookH = vh - toolbarH - 8; // pikseli umesto procenta — preciznije

  // Velicina knjige (ukupna)
  let bookW = maxBookW;
  let bookH = bookW / bookAspect;
  if (bookH > maxBookH) {
    bookH = maxBookH;
    bookW = bookH * bookAspect;
  }
  // Velicina JEDNE strane (StPageFlip ocekuje ovo)
  const pageW = mode === 'book' ? bookW / 2 : bookW;
  return { pageWidth: Math.floor(pageW), pageHeight: Math.floor(bookH) };
}

function buildBook(mode) {
  const size = calcSize();
  const bookEl = document.getElementById('book');
  if (!bookEl) {
    console.error('Nema #book elementa');
    return;
  }

  if (pageFlip) {
    try { pageFlip.destroy(); } catch (e) { /* ignore */ }
    pageFlip = null;
  }
  bookEl.innerHTML = '';

  // U 'book' modu StPageFlip automatski prikazuje 2 strane, pa width = sirina JEDNE strane
  // U 'single' modu prikazuje 1 stranu, pa width = sirina te strane
  pageFlip = new St.PageFlip(bookEl, {
    width: size.pageWidth,
    height: size.pageHeight,
    size: 'fixed',
    minWidth: 200,
    maxWidth: 5000,
    minHeight: 200,
    maxHeight: 5000,
    showCover: true,
    mobileScrollSupport: false,
    swipeDistance: 30,
    clickEventForward: true,
    // usePortrait=true forsira 1-strani prikaz (bez spreada)
    // Na mobilnom UVEK forsiramo, čak i za landscape PDF — nema mesta za spread
    usePortrait: pageAspect < 1 || isMobileDevice(),
    startZIndex: 0,
    autoSize: false,
    maxShadowOpacity: 0.5,
    flippingTime: 600,
    useMouseEvents: true,
    disableFlipByClick: false,
  });

  pageFlip.loadFromImages(PAGES);

  pageFlip.on('flip', () => updatePageInfo());
  pageFlip.on('changeState', () => updatePageInfo());

  // Controls
  document.getElementById('btn-prev').onclick = () => pageFlip.flipPrev();
  document.getElementById('btn-next').onclick = () => pageFlip.flipNext();
  document.getElementById('btn-zoom-in').onclick = () => zoom(0.08);
  document.getElementById('btn-zoom-out').onclick = () => zoom(-0.08);
  document.getElementById('btn-fullscreen').onclick = toggleFullscreen;
  document.getElementById('btn-mode').onclick = toggleMode;

  updateModeButton();
  updatePageInfo();
}

function updatePageInfo() {
  if (!pageFlip) return;
  const cur = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  document.getElementById('page-info').textContent = `${cur} / ${total}`;
}

function updateModeButton() {
  const mode = effectiveMode(currentMode);
  const btn = document.getElementById('btn-mode');
  // Na mobilnom dugme nije vidljivo (display:none u CSS-u), ali azuriramo tekst za svaki slucaj
  btn.textContent = mode === 'book' ? '📖 Knjiga' : '📄 Pojedinačno';
}

function toggleMode() {
  // Na mobilnom nema smisla menjati mod — uvek je single
  if (isMobileDevice()) return;
  currentMode = currentMode === 'book' ? 'single' : 'book';
  setMode(currentMode);
  buildBook(currentMode);
}

function zoom(delta) {
  if (!pageFlip) return;
  const vw = window.innerWidth;
  const isMobile = isMobileDevice();
  // U book modu knjiga je 2x sirina, pa jedna strana = curW/2
  const mode = effectiveMode(currentMode);
  let curPageW;
  try {
    const curW = pageFlip.getFlipController().getPageRect(0).width;
    curPageW = mode === 'book' ? curW / 2 : curW;
  } catch (e) {
    // Fallback ako API pukne
    curPageW = size.pageWidth;
  }
  // Max sirina: 50% vw na mobilnom, 50% vw na desktopu (jedna strana)
  const maxSingleW = vw * 0.5;
  const newPageW = Math.max(200, Math.min(maxSingleW, curPageW + delta * vw));
  const newPageH = newPageW / pageAspect;
  pageFlip.update({ width: newPageW, height: newPageH });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  // Ako se promenila kategorija uredjaja (mobile <-> desktop), odmah rebuild
  const wasMobile = lastWidth < 1024;
  const isMobile = isMobileDevice();
  lastWidth = window.innerWidth;
  if (wasMobile !== isMobile) {
    buildBook(currentMode);
    return;
  }
  resizeTimer = setTimeout(() => buildBook(currentMode), 200);
});

document.addEventListener('DOMContentLoaded', init);
