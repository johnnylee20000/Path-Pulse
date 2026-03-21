# PowerPoint marketing deck

Use **Microsoft PowerPoint** to present the same content as the HTML decks, or generate `.pptx` files with Python.

## Adaptations & Features (full deck + acknowledgements)

- **PowerPoint:** from `path-pulse-web` run:
  ```powershell
  pip install -r requirements-pptx.txt
  python generate-adaptations-features-pptx.py
  ```
- Opens **`Path-Pulse-Adaptations-and-Features.pptx`** — **slide 1** is a symmetrical **introduction** with the **animated Path-Pulse logo** (GIF with rotating cyan ring, built from `icon-512.png` like the web intro deck). Remaining slides use **centered** text for a balanced layout. Each feature includes **design logic**, plus a thank-you slide (Ludwitt Academy, Rose Foundation, Hearts and Minds Program, Cursor).
- **Regenerate:** close the `.pptx` in PowerPoint first (otherwise Windows locks the file). If the script can’t overwrite, it saves **`Path-Pulse-Adaptations-and-Features-generated.pptx`** instead.
- **Assets:** place **`icon-512.png`** in `path-pulse-web` (required for the animated GIF). The script also writes **`path-pulse-logo-animated.gif`** next to it.

## Introduction deck (logo + summary + features)

- **Animated HTML (symmetrical 16:9, digital animations):** open **`path-pulse-intro-deck.html`** in a browser (same folder as `icon-512.png`). Use **← / →** or **Space** to advance; **F11** for full screen.
- **PowerPoint file:** from `path-pulse-web` run:
  ```powershell
  pip install -r requirements-pptx.txt
  python generate-intro-pptx.py
  ```
  Opens **`Path-Pulse-Intro-Deck.pptx`** — includes the logo on slides 1 & 5, two-column summary, feature bullets. Add slide transitions/animations in PowerPoint (**Transitions** tab) for extra motion.

## Full marketing deck (10 slides)

1. Install Python 3 and pip (if needed).
2. In a terminal, from the `path-pulse-web` folder:

   ```powershell
   pip install -r requirements-pptx.txt
   python generate-marketing-pptx.py
   ```

3. Open **`Path-Pulse-Marketing-Deck.pptx`** in PowerPoint (double-click or **File → Open**).
4. Present with **F5** (from beginning) or **Shift+F5** (current slide).

You can edit fonts, colors, and add screenshots in PowerPoint like any deck.

## Option B — Manual copy

1. Open `marketing-slides.html` or `path-pulse-intro-deck.html` in a browser (via a local server).
2. Create a new blank presentation in PowerPoint.
3. Copy each slide’s text from the browser into new slides, or use **Insert → Screenshot** / **Snipping Tool** for full-slide images.

## Option C — Present the HTML full screen

- Open `marketing-slides.html` or **`path-pulse-intro-deck.html`** in a browser, press **F11** for full screen, use arrow keys to advance.  
  (This is not PowerPoint, but works without installing Python.)
