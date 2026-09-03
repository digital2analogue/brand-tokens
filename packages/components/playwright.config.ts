import { defineConfig, devices } from '@playwright/test';

// Visual regression over the built Storybook. Screenshots are compared
// against committed baselines in tests/visual/__screenshots__/ (linux
// baselines — generated ON the CI runner, never locally; font
// rasterization differs across machines). After an intentional visual
// change, run the "Update visual baselines" workflow from the Actions tab.
//
// If you do regenerate locally, `--update-snapshots` alone is not enough:
// it only rewrites a baseline whose comparison FAILED. Delete the PNGs you
// intend to replace first — `npm run baselines:drop -- <substring>` from the
// repo root does exactly that, and refuses to run without a filter.
//
// Requires storybook-static/ to exist: `npm run build-storybook` first
// (the root `npm run test:visual` chains it; CI builds it earlier in the
// verify job).
export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      // ABSOLUTE, not a ratio (#235). maxDiffPixelRatio is a fraction of the
      // whole 800x480 canvas, so 0.02 allowed ~7,700 differing pixels — more
      // than a small component contains. A segmented control is roughly
      // 210x26 = 5,500 pixels TOTAL: every one of them could change and the
      // ratio still passed. It did, twice, on a genuinely broken layout.
      //
      // The second-order effect is worse than the missed failure: a change
      // that passes on tolerance is one `--update-snapshots` will not rewrite,
      // so the committed PNG quietly stops describing the code and the next
      // real regression is measured against a stale reference.
      //
      // 200 is chosen against MEASURED run-to-run drift on the runner, with
      // every baseline regenerated there (see the note below). It is far below
      // any layout change: moving or resizing one component shifts thousands of
      // pixels. `threshold` is Playwright's default, stated here so the
      // per-pixel and per-image allowances are read together.
      //
      // A number this tight only holds while the baselines are runner-native.
      // The first run at 200 failed five stories — button--sizes by 4,890px,
      // on a baseline nobody had touched — which is what a *stale* baseline
      // looks like once the gate is honest enough to report it. The old ratio
      // had been passing that quietly for as long as it had been drifting.
      maxDiffPixels: 200,
      threshold: 0.2,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
    baseURL: 'http://localhost:6100',
    // Small viewport: shots capture #storybook-root, which spans the
    // viewport — keep the canvas (and the committed PNGs) compact.
    viewport: { width: 800, height: 480 },
    // The components honor prefers-reduced-motion (spinner/skeleton/progress
    // freeze), which combined with animations: 'disabled' keeps shots stable.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npx http-server storybook-static -p 6100 -s',
    url: 'http://localhost:6100/iframe.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
