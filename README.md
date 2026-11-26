# Thread & Tone

A private, mobile-friendly shirt and trouser fabric previewer. Plain HTML, CSS, and JavaScript; no build, dependencies, API keys, or backend.

## Publish with GitHub Pages

1. Create a GitHub repository (public repositories can use GitHub Pages on GitHub Free).
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root, not inside an extra `outfit-studio` folder. This README is optional.
3. Open **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your branch (usually `main`), choose **/(root)**, and click **Save**.
6. Wait for the Pages deployment to finish. Open the URL GitHub displays, typically `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

All asset links are relative, so both project sites and user sites work. No GitHub Actions workflow is required. GitHub organization policies may restrict Pages publishing.

## Use

- Choose **Upload photo** or **Camera** for each garment. On supported mobile browsers, Camera requests the rear camera; desktop and other browsers may show a file picker instead.
- Full garment photos and small fabric close-ups both work. Select a square of fabric without background, seams, buttons, or heavy shadows.
- Drag or click to position the crop. Focus the crop canvas and use arrow keys for keyboard control; hold Shift for larger steps. Use Selection size to adjust the area.
- Apply the patch, then adjust pattern size and angle. The fabric repeats over the illustration.
- Alternatively choose a solid color, or pick a sample after selecting its destination garment in the swatch book.
- Choose an avatar skin tone above the preview to see how the outfit palette looks against different illustrated skin tones. The selected tone appears on the avatar's face, neck, and hands, and is included in saved looks.
- Choose **Add try-on photo** to view a personal outfit photo alongside the fabric preview. Use **Shirt close-up** or **Trouser close-up** to inspect details; this is a reference view and does not apply the selected fabric to the photo.
- **Save look** downloads an 1800 x 2376 PNG of the current combination. Keep it in Downloads or save/share it to your photo library using your device's controls.
- **Reset** restores the sample pairing. Reloading the page also resets it: uploaded photos and pairings are not persisted. Download any look you want to keep.

## Privacy and limitations

Photos are decoded and drawn locally in the browser. The app makes no network requests for photo processing or photo references, contains no analytics, and uses no third-party fonts, scripts, or services. GitHub still serves the website and may log ordinary site requests.

This is an illustrative fabric-combination tool, not photorealistic virtual try-on, automatic garment segmentation, background removal, or a size/fit predictor. The avatar is a simple illustration for visual color comparison, not a personalized likeness or skin-tone match recommendation. Uploaded patches repeat as tiles, so seams may be visible when the patch is not naturally seamless. Lighting, screen settings, and manual pattern scaling affect the preview.

JPEG, PNG, and WebP are recommended. Other image formats depend on browser support, including HEIC. Files over 20 MB and images smaller than 16 x 16 are rejected. Large decoded photos can consume significant memory on older phones; resized photos work best.

Requires a modern browser with Canvas 2D, CanvasPattern transforms, native dialog, and image decoding support. The camera capture hint depends on browser/device support. There are no runtime dependencies or installation steps.

## Local preview

Open `index.html` directly in a modern browser, or serve this folder using an existing static server. For example, with Python installed:

```shell
python -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080`. Stop the local server with Ctrl+C when finished.

The garment illustration and sample swatches are drawn in `app.js`; appearance and responsive layout are in `styles.css`.
