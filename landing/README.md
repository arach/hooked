# Hooked Site

The static site published at [hooked.arach.dev](https://hooked.arach.dev/). The public guide covers the released `@arach/hooked` package and labels the native macOS HUD as a separate developer preview until the two exchange events automatically.

## Development

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory landing/public
```

Open `http://localhost:4173/`.

## Source

- `public/index.html`, `public/styles.css`, and `public/script.js` own the landing page.
- `public/docs/` owns the curated public documentation.
- `public/assets/hooked-mark.svg` is the shared visual mark.
- The deploy workflow copies the repository `install.sh` to `/install` so the canonical one-line installer always matches the package source.

## Verification

Check both `/` and `/docs/` at desktop and mobile widths. Verify copy buttons, demo controls, keyboard navigation, reduced motion, and the `/install` response before deploying.

Regenerate the social preview after changing the positioning or logo:

```bash
bun landing/scripts/generate-og.ts
```

## Deployment

Pushes to `master` that change `landing/**` run `.github/workflows/deploy-pages.yml`. The workflow publishes `landing/public` directly through GitHub Pages.

## License

MIT License - See parent project for details.
