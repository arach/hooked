import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const repositoryRoot = resolve(import.meta.dir, "../..")
const source = pathToFileURL(resolve(repositoryRoot, "landing/og.html")).href
const output = resolve(repositoryRoot, "landing/public/og.png")
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const process = Bun.spawn([
  chrome,
  "--headless=new",
  "--hide-scrollbars",
  "--disable-gpu",
  "--window-size=1200,630",
  `--screenshot=${output}`,
  source,
], { stdout: "inherit", stderr: "inherit" })

const exitCode = await process.exited
if (exitCode !== 0) {
  throw new Error(`Chrome exited with status ${exitCode}`)
}

console.log(`Generated ${output}`)
