import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const repositoryRoot = resolve(import.meta.dir, "../..")
const source = pathToFileURL(resolve(repositoryRoot, "landing/og.html")).href
const output = resolve(repositoryRoot, "landing/public/og.png")
const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  Bun.which("google-chrome"),
  Bun.which("chromium"),
  Bun.which("chromium-browser"),
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)))

if (!chrome) {
  throw new Error("Chrome or Chromium was not found. Set CHROME_PATH and try again.")
}

const chromeProcess = Bun.spawn([
  chrome,
  "--headless=new",
  "--hide-scrollbars",
  "--disable-gpu",
  "--window-size=1200,630",
  `--screenshot=${output}`,
  source,
], { stdout: "inherit", stderr: "inherit" })

const exitCode = await chromeProcess.exited
if (exitCode !== 0) {
  throw new Error(`Chrome exited with status ${exitCode}`)
}

console.log(`Generated ${output}`)
