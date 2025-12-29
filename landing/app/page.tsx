"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Github, Copy, Check, Play, Pause, ArrowRight, Sun, Moon, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Tweet } from "react-tweet"

const presetDetails = {
  test: {
    command: "hooked test",
    addCommand: "/hooked test `pnpm test`",
    check: "pnpm test",
    prompt: "Tests failed. Read the errors, fix the code, and run tests again.",
  },
  build: {
    command: "hooked build",
    addCommand: "/hooked build `pnpm build`",
    check: "pnpm build",
    prompt: "Build failed. Fix the errors and rebuild.",
  },
  typecheck: {
    command: "hooked typecheck",
    addCommand: "/hooked typecheck `pnpm typecheck`",
    check: "pnpm typecheck",
    prompt: "Type errors found. Fix them and run typecheck again.",
  },
  manual: {
    command: "hooked manual",
    addCommand: "/hooked manual",
    check: null,
    prompt: "Keep going. Do not stop until I tell you to.",
  },
}

function AudioDemo({ isDark }: { isDark: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src="/audio/permission.mp3"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <button
        onClick={togglePlay}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
          isDark
            ? isPlaying
              ? "bg-white text-black"
              : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
            : isPlaying
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200"
        }`}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3 h-3" />
            <span>Playing...</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            <span>Hear it</span>
          </>
        )}
      </button>
    </div>
  )
}

function PresetButton({
  preset,
  isActive,
  onClick,
  theme
}: {
  preset: keyof typeof presetDetails
  isActive: boolean
  onClick: () => void
  theme: Record<string, string>
}) {
  const data = presetDetails[preset]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 border transition-all duration-200 ${theme.codeBg} ${
        isActive
          ? "border-sky-500/50 ring-1 ring-sky-500/30"
          : `${theme.codeBorder} hover:border-sky-500/30`
      }`}
    >
      <code className={`text-xs font-[family-name:var(--font-geist-mono)] ${isActive ? "text-sky-400" : "text-sky-500"}`}>
        {data.command}
      </code>
    </button>
  )
}

export default function Home() {
  const [copied, setCopied] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [activePreset, setActivePreset] = useState<keyof typeof presetDetails | null>(null)

  const installCommand = `git clone https://github.com/arach/hooked.git
cd hooked && pnpm install
pnpm run hooked:init`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Theme classes
  const theme = {
    bg: isDark ? "bg-black" : "bg-white",
    text: isDark ? "text-white" : "text-neutral-900",
    textMuted: isDark ? "text-white/60" : "text-neutral-600",
    textSubtle: isDark ? "text-white/40" : "text-neutral-400",
    textAccent: isDark ? "text-white/90" : "text-neutral-800",
    cardBg: isDark ? "bg-white/[0.03]" : "bg-neutral-50",
    cardBorder: isDark ? "border-white/10" : "border-neutral-200",
    cardBorderHover: isDark ? "hover:border-white/20" : "hover:border-neutral-300",
    codeBg: isDark ? "bg-white/[0.03]" : "bg-neutral-100",
    codeBorder: isDark ? "border-white/5" : "border-neutral-200",
    terminalBg: isDark ? "bg-neutral-900/80" : "bg-neutral-900",
    divider: isDark ? "bg-white/10" : "bg-neutral-200",
    footerBorder: isDark ? "border-white/5" : "border-neutral-200",
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300`}>
      {/* Gradient background */}
      {isDark && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%)]" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,119,87,0.06),transparent_50%)]" />
        </>
      )}
      {!isDark && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-white via-neutral-50 to-white" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.02),transparent_50%)]" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,119,87,0.05),transparent_50%)]" />
        </>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${isDark ? "bg-black/80" : "bg-white/80"} border-b ${theme.cardBorder}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg border ${theme.cardBorder} ${theme.cardBg} flex items-center justify-center`}>
              <img
                src="/hooked-logo.png"
                alt="Hooked Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            <span className={`text-base font-medium ${theme.text}`}>Hooked</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/arach/hooked"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme.textMuted} hover:${theme.text} transition-colors`}
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://docs.anthropic.com/en/docs/claude-code/hooks"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${theme.textMuted} hover:${theme.text} transition-colors`}
            >
              Docs
            </a>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDark
                  ? "hover:bg-white/10 text-white/60 hover:text-white"
                  : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-20">
          <p className={`text-sm font-medium mb-4 ${theme.textSubtle}`}>
            Hooks helper for Claude Code
          </p>

          <h1 className={`text-4xl md:text-5xl font-semibold tracking-tight mb-6 ${theme.text} leading-[1.1]`}>
            Voice alerts.<br />
            Auto-continue.
          </h1>

          <p className={`text-lg ${theme.textMuted} max-w-xl mb-8 leading-relaxed`}>
            Know when Claude needs you. Keep it working until tests pass, builds succeed, or you say stop.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-[family-name:var(--font-geist-mono)] text-sm ${
                isDark
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-neutral-900 text-white hover:bg-neutral-800"
              } transition-colors`}
            >
              <span>git clone https://github.com/arach/hooked</span>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 opacity-50" />}
            </button>
            <Link
              href="https://github.com/arach/hooked"
              className={`px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors ${
                isDark
                  ? "border-white/20 text-white/80 hover:bg-white/5 hover:text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              Documentation
            </Link>
          </div>

          <p className={`text-sm ${theme.textSubtle} mt-6`}>
            Built on <a href="https://docs.anthropic.com/en/docs/claude-code/hooks" target="_blank" rel="noopener noreferrer" className={`${theme.textMuted} hover:${theme.text} transition-colors underline underline-offset-2`}>Claude Code Hooks</a>
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Speak Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`relative backdrop-blur-sm rounded-2xl border p-6 transition-colors ${theme.cardBg} ${theme.cardBorder} ${theme.cardBorderHover}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium">Speak</h2>
              </div>

              <p className={`${theme.textMuted} text-sm mb-4 leading-relaxed`}>
                Miss a permission prompt while multitasking? <span className={theme.textAccent}>Speak fixes that.</span>
              </p>

              <div className={`rounded-xl p-3 mb-4 border ${theme.codeBg} ${theme.codeBorder}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-orange-500 flex-shrink-0">{">"}</span>
                    <code className={`${theme.textMuted} text-sm font-[family-name:var(--font-geist-mono)] truncate`}>
                      "In hooked, Claude needs your permission"
                    </code>
                  </div>
                  <AudioDemo isDark={isDark} />
                </div>
              </div>

              <div className={`space-y-2 text-sm ${theme.textSubtle}`}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <span>Voice alerts via <a href="https://github.com/arach/speakeasy" target="_blank" rel="noopener noreferrer" className={`${theme.textMuted} hover:${theme.textAccent} transition-colors`}>SpeakEasy</a></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <span>Context-aware with project name</span>
                </div>
              </div>
            </div>
          </div>

          {/* Continuations Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`relative backdrop-blur-sm rounded-2xl border p-6 transition-colors ${theme.cardBg} ${theme.cardBorder} ${theme.cardBorderHover}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium">Continuations</h2>
              </div>

              <p className={`${theme.textMuted} text-sm mb-4 leading-relaxed`}>
                "Done" doesn't mean "tests passing." <span className={theme.textAccent}>Fix that.</span>
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <PresetButton
                  preset="test"
                  isActive={activePreset === "test"}
                  onClick={() => setActivePreset(activePreset === "test" ? null : "test")}
                  theme={theme}
                />
                <PresetButton
                  preset="build"
                  isActive={activePreset === "build"}
                  onClick={() => setActivePreset(activePreset === "build" ? null : "build")}
                  theme={theme}
                />
                <PresetButton
                  preset="typecheck"
                  isActive={activePreset === "typecheck"}
                  onClick={() => setActivePreset(activePreset === "typecheck" ? null : "typecheck")}
                  theme={theme}
                />
                <PresetButton
                  preset="manual"
                  isActive={activePreset === "manual"}
                  onClick={() => setActivePreset(activePreset === "manual" ? null : "manual")}
                  theme={theme}
                />
              </div>

              {/* Shared detail zone - add command + resulting config */}
              <div className={`overflow-hidden transition-all duration-300 ${activePreset ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
                {activePreset && (
                  <div className={`rounded-lg border ${theme.codeBg} ${theme.codeBorder} mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] overflow-hidden`}>
                    {/* Add command */}
                    <div className={`px-3 py-2 border-b ${theme.codeBorder}`}>
                      <div className={`${theme.textSubtle} text-[10px] mb-1`}>Enable</div>
                      <code className="text-sky-400">{presetDetails[activePreset].addCommand}</code>
                    </div>
                    {/* Hook runs check, then outputs decision */}
                    <div className="px-3 py-2 leading-relaxed">
                      {presetDetails[activePreset].check && (
                        <div className={`${theme.textSubtle} text-[10px] mb-2`}>
                          runs <code className="text-green-400">{presetDetails[activePreset].check}</code>
                        </div>
                      )}
                      <div className="flex gap-4 text-[10px]">
                        <div>
                          <div className={`${theme.textSubtle} mb-1`}>fails →</div>
                          <div className="text-red-400">keep working</div>
                        </div>
                        <div>
                          <div className={`${theme.textSubtle} mb-1`}>passes →</div>
                          <div className="text-green-400">done, stop</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className={`text-xs ${theme.textSubtle} leading-relaxed`}>
                {activePreset ? "Click again to collapse." : "Click any preset to learn more."}
              </p>
            </div>
          </div>
        </div>


        {/* How it works */}
        <section className="mb-20">
          <h2 className={`text-center ${theme.textSubtle} text-sm font-medium uppercase tracking-wider mb-8`}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className={`rounded-xl p-4 border ${theme.cardBg} ${theme.cardBorder} text-center`}>
              <div className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-neutral-100"} flex items-center justify-center mx-auto mb-3`}>
                <span className={`text-sm font-medium ${theme.textMuted}`}>1</span>
              </div>
              <p className={`text-sm font-medium ${theme.text} mb-1`}>Install hooked</p>
              <p className={`text-xs ${theme.textSubtle}`}>Clone the repo and run the setup script</p>
            </div>
            <div className={`rounded-xl p-4 border ${theme.cardBg} ${theme.cardBorder} text-center`}>
              <div className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-neutral-100"} flex items-center justify-center mx-auto mb-3`}>
                <span className={`text-sm font-medium ${theme.textMuted}`}>2</span>
              </div>
              <p className={`text-sm font-medium ${theme.text} mb-1`}>Activate a preset</p>
              <p className={`text-xs ${theme.textSubtle}`}>Run <code className="text-sky-500">hooked test</code> or <code className="text-sky-500">hooked build</code></p>
            </div>
            <div className={`rounded-xl p-4 border ${theme.cardBg} ${theme.cardBorder} text-center`}>
              <div className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-neutral-100"} flex items-center justify-center mx-auto mb-3`}>
                <span className={`text-sm font-medium ${theme.textMuted}`}>3</span>
              </div>
              <p className={`text-sm font-medium ${theme.text} mb-1`}>Agents win</p>
              <p className={`text-xs ${theme.textSubtle}`}>Claude keeps working until it's actually done</p>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <div className={`max-w-2xl mx-auto mb-20 text-center`}>
          <p className={`text-xs ${theme.textSubtle}`}>
            <span className={theme.textMuted}>Requires:</span> Claude Code • Node.js 18+ • macOS/Linux
            <span className="mx-2">•</span>
            <span className={theme.textMuted}>Optional:</span> <a href="https://github.com/arach/speakeasy" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400">SpeakEasy</a> for voice alerts
          </p>
        </div>

        {/* Social Proof */}
        <section className="mb-20">
          <h2 className={`text-center ${theme.textSubtle} text-sm font-medium uppercase tracking-wider mb-8`}>
            What people are saying
          </h2>
          <div className="grid md:grid-cols-2 gap-4" data-theme={isDark ? "dark" : "light"}>
            <Tweet id="1986121725487251894" />
            <Tweet id="2004916410687050167" />
            <Tweet id="2004894753587068940" />
            <Tweet id="2004947522889162834" />
          </div>
        </section>

        {/* Examples */}
        <section className="mb-20">
          <h2 className={`text-center ${theme.textSubtle} text-sm font-medium uppercase tracking-wider mb-8`}>
            Examples
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Example 1: SpeakEasy hook */}
            <div className={`rounded-xl border ${theme.cardBg} ${theme.cardBorder} overflow-hidden`}>
              <div className={`px-4 py-2 border-b ${theme.cardBorder} ${isDark ? "bg-white/[0.02]" : "bg-neutral-50"}`}>
                <span className={`text-xs font-medium ${theme.textMuted}`}>SpeakEasy Hook</span>
              </div>
              <div className="p-4 font-[family-name:var(--font-geist-mono)] text-xs space-y-2">
                <div className={theme.textSubtle}>You're in another app, Claude needs permission...</div>
                <div className={`mt-3 pt-3 border-t ${theme.cardBorder}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">🔊</span>
                    <span className={theme.textMuted}>"In hooked, Claude needs your permission"</span>
                  </div>
                  <div className={`${theme.textSubtle} mt-3`}>You hear it, switch back, approve.</div>
                  <div className={`${theme.textSubtle} mt-1`}>No more missed prompts.</div>
                </div>
              </div>
            </div>

            {/* Example 2: Continuation hook */}
            <div className={`rounded-xl border ${theme.cardBg} ${theme.cardBorder} overflow-hidden`}>
              <div className={`px-4 py-2 border-b ${theme.cardBorder} ${isDark ? "bg-white/[0.02]" : "bg-neutral-50"}`}>
                <span className={`text-xs font-medium ${theme.textMuted}`}>Continuation Hook</span>
              </div>
              <div className="p-4 font-[family-name:var(--font-geist-mono)] text-xs space-y-2">
                <div><span className={theme.textSubtle}>$</span> <span className="text-sky-400">hooked test</span></div>
                <div className={theme.textSubtle}>✓ Test preset activated</div>
                <div className={`mt-3 pt-3 border-t ${theme.cardBorder} ${theme.textSubtle}`}>
                  <div>Claude: "I've fixed the bug, let me stop here."</div>
                  <div className="text-red-400 mt-1">→ pnpm test fails (2 errors)</div>
                  <div className="text-orange-400 mt-1">→ Hook: "Tests failed. Fix and retry."</div>
                  <div className={`${theme.textMuted} mt-1`}>Claude continues working...</div>
                  <div className="text-green-400 mt-1">→ pnpm test passes</div>
                  <div className={`${theme.textMuted} mt-1`}>→ Claude stops (actually done)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="flex justify-center mb-24">
          <Button
            className={`font-medium px-6 py-5 rounded-full transition-all duration-200 hover:scale-105 ${
              isDark
                ? "bg-white text-black hover:bg-white/90"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
            asChild
          >
            <Link href="https://github.com/arach/hooked">
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <footer className={`text-center border-t ${theme.footerBorder} pt-8`}>
          <div className={`flex justify-center gap-6 text-sm ${theme.textSubtle} mb-4`}>
            <a
              href="https://github.com/arach/speakeasy"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:${theme.textMuted} transition-colors`}
            >
              SpeakEasy
            </a>
            <a
              href="https://docs.anthropic.com/en/docs/claude-code/hooks"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:${theme.textMuted} transition-colors`}
            >
              Claude Code Hooks
            </a>
          </div>
          <p className={`text-sm ${isDark ? "text-white/20" : "text-neutral-300"} mb-2`}>
            Built by <a href="https://github.com/arach" target="_blank" rel="noopener noreferrer" className={`${isDark ? "text-white/40 hover:text-white/60" : "text-neutral-400 hover:text-neutral-600"} transition-colors`}>@arach</a>
          </p>
          <p className={`text-xs ${isDark ? "text-white/10" : "text-neutral-200"}`}>
            Part of the Claude Code ecosystem
          </p>
        </footer>
      </main>
    </div>
  )
}
