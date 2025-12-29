import { chromium } from 'playwright-core'
import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read the logo and convert to base64
const logoPath = join(__dirname, '../public/hooked-logo.png')
const logoBase64 = readFileSync(logoPath).toString('base64')
const logoDataUrl = `data:image/png;base64,${logoBase64}`

const html = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 25% 25%, #18181b 0%, #000 50%);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .logo {
      width: 100px;
      height: 100px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      border-radius: 100px;
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid rgba(14, 165, 233, 0.2);
      font-size: 12px;
      font-weight: 700;
      color: #0ea5e9;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 24px;
    }
    .title {
      font-size: 56px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 20px;
      letter-spacing: -0.03em;
      text-align: center;
      line-height: 1.1;
    }
    .subtitle {
      font-size: 22px;
      color: #71717a;
      text-align: center;
      max-width: 700px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <img class="logo" src="${logoDataUrl}" alt="Hooked" />
  <div class="badge">Hooks Helper</div>
  <div class="title">Manage Claude Code hooks<br/>without the boilerplate.</div>
  <div class="subtitle">A tiny utility for Anthropic's Claude Code CLI. Add voice alerts, build-check loops, and custom continuation triggers.</div>
</body>
</html>
`

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(html)
  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready)
  await page.waitForTimeout(500) // Extra time for rendering
  const buffer = await page.screenshot({ type: 'png' })
  writeFileSync(join(__dirname, '../public/og.png'), buffer)
  await browser.close()
  console.log('Generated og.png')
}

main()
