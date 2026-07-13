# Helvetas HTML5 Flipbook

Interaktivni flipbook za PDF brošure (StPageFlip + PyMuPDF).

## Upotreba (lokalno)

1. Drop-uj bilo koji `.pdf` u ovaj folder
2. Dupli-klik na `convert.bat` (ili `python convert.py`)
3. Dupli-klik na `index.html` — radi bez servera

`convert.py` automatski:
- Nalazi prvi PDF po abecedi
- Čisti stari sadržaj `pages/`
- Generiše `pages/page_NN.jpg` (DPI 150)
- Injektuje `PAGES` listu i `PDF_FILE` ime u `index.html`

## GitHub Pages deploy

1. Push sve fajlove u public repo (root level)
2. Settings → Pages → Branch: `main`, folder: `/ (root)`
3. Sajt je live na `https://<user>.github.io/<repo>/`

`.nojekyll` fajl je uključen (obavezno — sprečava Jekyll build koji ignoriše direktorijume koji počinju sa `_`).

## Struktura

```
├── index.html           # flipbook (PAGES i PDF_FILE su inline)
├── assets/
│   ├── app.js           # responsive logika
│   ├── style.css        # stilovi
│   └── stpageflip.min.js
├── pages/               # generisano; page_NN.jpg
├── *.pdf                # izvorni PDF (i download link)
├── convert.py           # PDF → JPG konverter
├── convert.bat          # Windows entry point
├── Komanda  za convert.txt  # alias za `python convert.py`
└── .nojekyll            # GitHub Pages
```

## Format

- Bilo koji PDF (portrait/landscape, B5/A4/A5)
- Auto-detekt aspect prve strane
- Mobile: uvek single-page; Desktop landscape: spread
