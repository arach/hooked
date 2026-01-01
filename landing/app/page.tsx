"use client"

import { useState, useRef } from "react"
import { Github, Copy, Check, Play, Pause, Terminal, Volume2, Zap, ExternalLink, Layers, Fingerprint } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Tweet } from "react-tweet"

// Navbar
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <img src="/hooked-logo.png" alt="Hooked" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Hooked</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/docs" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            Docs
          </Link>
          <a href="https://code.claude.com/docs/en/hooks-guide" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            Claude Hooks
          </a>
          <div className="h-3 w-px bg-white/10" />
          <a href="https://github.com/arach/hooked" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
            <Github size={16} />
          </a>
        </div>
      </div>
    </nav>
  )
}

// Hero
function Hero() {
  const [copied, setCopied] = useState(false)
  const command = "git clone https://github.com/arach/hooked && cd hooked && pnpm install && pnpm run hooked:init"

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="pt-28 pb-20 px-6 relative flex flex-col items-center border-b border-white/5">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-400 mb-6 uppercase tracking-wider"
        >
          Hooks Helper
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-tight"
        >
          Smart hooks for Claude Code.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-base text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed"
        >
          A tiny utility for Anthropic's Claude Code CLI. Add voice alerts,
          build-check loops, and custom until triggers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 group hover:border-zinc-700 transition-colors">
            <code className="text-sm font-[family-name:var(--font-geist-mono)] text-zinc-300 mr-4">
              git clone https://github.com/arach/hooked
            </code>
            <button
              onClick={handleCopy}
              className="p-1 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800 pl-3"
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-sky-500" /> : <Copy size={14} />}
            </button>
          </div>
          <Link
            href="/docs"
            className="px-5 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Read Docs
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// Voice Alert Demo
function VoiceAlertDemo() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Listen, don't watch.</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Hooked uses <a href="https://github.com/arach/speakeasy" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">SpeakEasy</a> to announce when Claude needs your attention.
          Stop checking your terminal—you'll hear it.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <audio
            ref={audioRef}
            src="/audio/permission.mp3"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          <button
            onClick={handlePlay}
            className="px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
            {isPlaying ? "Playing..." : "Preview Voice"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 font-[family-name:var(--font-geist-mono)] text-xs">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">settings.json</span>
          <span className="text-sky-400">~/.claude/</span>
        </div>
        <div className="text-zinc-400 space-y-1 leading-relaxed">
          <p><span className="text-zinc-600">"hooks"</span>: {"{"}</p>
          <p className="pl-4"><span className="text-sky-400">"Notification"</span>: [{"{"}</p>
          <p className="pl-8"><span className="text-zinc-500">"matcher"</span>: <span className="text-green-400">"*"</span>,</p>
          <p className="pl-8"><span className="text-zinc-500">"hooks"</span>: [{"{"}</p>
          <p className="pl-12"><span className="text-zinc-500">"type"</span>: <span className="text-green-400">"command"</span>,</p>
          <p className="pl-12"><span className="text-zinc-500">"command"</span>: <span className="text-green-400">"~/.hooked/notify.ts"</span></p>
          <p className="pl-8">{"}]"}</p>
          <p className="pl-4">{"}]"}</p>
          <p>{"}"}</p>
        </div>
      </div>
    </div>
  )
}

// Until Demo
const untilExamples = {
  prompt: {
    command: '/hooked until "implement auth"',
    check: null,
    description: "Keep working toward objective",
    outcome: "Blocks until you run /hooked off",
  },
  test: {
    command: '/hooked until check "pnpm test"',
    check: "pnpm test",
    description: "Keep working until tests pass",
    outcome: "Auto-completes when check succeeds",
  },
  build: {
    command: '/hooked until check "pnpm build"',
    check: "pnpm build",
    description: "Keep working until build succeeds",
    outcome: "Auto-completes when check succeeds",
  },
  off: {
    command: "/hooked off",
    check: null,
    description: "Clear all until loops",
    outcome: "Mission complete announcement",
  },
}

function UntilDemo() {
  const [activeExample, setActiveExample] = useState<keyof typeof untilExamples>("prompt")
  const example = untilExamples[activeExample]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
      <div className="order-2 md:order-1 space-y-4">
        {/* Command */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Slash Command</span>
          </div>
          <div className="p-4 font-[family-name:var(--font-geist-mono)] text-sm">
            <span className="text-sky-400">{example.command}</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
            <span className="text-zinc-500 uppercase text-[10px] tracking-wider">What happens</span>
          </div>
          <div className="p-4 font-[family-name:var(--font-geist-mono)] text-xs space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeExample}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <p className="text-zinc-300">{example.description}</p>
                {example.check ? (
                  <div className="flex gap-6 pt-2">
                    <div>
                      <p className="text-zinc-600 text-[10px] mb-1">check fails →</p>
                      <p className="text-orange-400">keep working</p>
                    </div>
                    <div>
                      <p className="text-zinc-600 text-[10px] mb-1">check passes →</p>
                      <p className="text-green-400">mission complete</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-500 pt-1">{example.outcome}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Voice announcements */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
            <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Voice</span>
          </div>
          <div className="p-4 font-[family-name:var(--font-geist-mono)] text-xs text-zinc-400 space-y-2">
            <p><span className="text-green-400">→</span> "Loop started. {activeExample === 'prompt' ? 'implement auth' : example.check}"</p>
            <p><span className="text-sky-400">→</span> "Round 2. Objective: ..."</p>
            <p><span className="text-orange-400">→</span> "Mission complete."</p>
          </div>
        </div>
      </div>

      <div className="order-1 md:order-2 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Autonomous loops.</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Keep Claude working toward an objective. Set a goal or a check command—Claude
          continues until it's done, with voice at each round.
        </p>
        <div className="flex flex-wrap gap-2 pt-4">
          {(Object.keys(untilExamples) as Array<keyof typeof untilExamples>).map((key) => (
            <button
              key={key}
              onClick={() => setActiveExample(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeExample === key
                  ? "bg-sky-500 text-white"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Feature Cards
function Features() {
  return (
    <section className="py-16 px-6 max-w-5xl mx-auto border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/20 space-y-3">
          <div className="text-sky-500">
            <Volume2 size={18} />
          </div>
          <h4 className="text-sm font-bold">Voice</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Hear when Claude needs you, starts a loop, completes a round, or finishes a mission.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/20 space-y-3">
          <div className="text-sky-500">
            <Terminal size={18} />
          </div>
          <h4 className="text-sm font-bold">Slash Commands</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">
            <code className="text-sky-400">/hooked until</code> to start, <code className="text-sky-400">/hooked off</code> to stop.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/20 space-y-3">
          <div className="text-sky-500">
            <Zap size={18} />
          </div>
          <h4 className="text-sm font-bold">Zero Config</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Run <code className="text-sky-400">pnpm run hooked:init</code> once. Voice + until loops ready to go.
          </p>
        </div>
      </div>
    </section>
  )
}

// Session-Scoped Feature Highlight
function SessionScopedFeature() {
  return (
    <section className="py-20 px-6 max-w-5xl mx-auto border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
            <Fingerprint size={12} /> Session-Scoped
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Different objectives.<br />Different sessions.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Run multiple Claude Code sessions with unique until objectives.
            One documents your codebase. Another fixes bugs. A third writes tests.
            <span className="text-white font-medium"> They never interfere.</span>
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-sky-500/10 flex items-center justify-center mt-0.5">
                <span className="text-sky-400 text-xs">1</span>
              </div>
              <div>
                <span className="text-zinc-300">Set a pending objective:</span>
                <code className="ml-2 text-sky-400 text-xs">/hooked until "Document API"</code>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-sky-500/10 flex items-center justify-center mt-0.5">
                <span className="text-sky-400 text-xs">2</span>
              </div>
              <div>
                <span className="text-zinc-300">Claude claims it on first stop</span>
                <span className="text-zinc-500 text-xs ml-2">(lazy binding)</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-sky-500/10 flex items-center justify-center mt-0.5">
                <span className="text-sky-400 text-xs">3</span>
              </div>
              <div>
                <span className="text-zinc-300">Other sessions unaffected</span>
                <span className="text-zinc-500 text-xs ml-2">(bound to session_id)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 font-[family-name:var(--font-geist-mono)] text-xs">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
            <span className="text-zinc-500 uppercase text-[10px] tracking-wider">~/.hooked/state/</span>
            <Layers size={14} className="text-sky-400" />
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sky-400">bfe239db...json</span>
                <span className="text-green-400 text-[10px]">active</span>
              </div>
              <div className="text-zinc-500 text-[10px] space-y-1">
                <p>mode: <span className="text-zinc-300">manual</span></p>
                <p>objective: <span className="text-zinc-300">"Document API"</span></p>
                <p>iteration: <span className="text-zinc-300">3</span></p>
              </div>
            </div>
            <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sky-400">a1b2c3d4...json</span>
                <span className="text-green-400 text-[10px]">active</span>
              </div>
              <div className="text-zinc-500 text-[10px] space-y-1">
                <p>mode: <span className="text-zinc-300">check</span></p>
                <p>check: <span className="text-zinc-300">"pnpm test"</span></p>
                <p>iteration: <span className="text-zinc-300">1</span></p>
              </div>
            </div>
            <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500">98765432...json</span>
                <span className="text-zinc-600 text-[10px]">completed</span>
              </div>
              <div className="text-zinc-600 text-[10px]">
                <p>mode: check</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Social Proof
function SocialProof() {
  return (
    <section className="py-16 px-6 max-w-5xl mx-auto border-t border-white/5">
      <h2 className="text-center text-zinc-600 text-xs font-bold uppercase tracking-widest mb-8">
        What people are saying
      </h2>
      <div className="grid md:grid-cols-2 gap-4" data-theme="dark">
        <Tweet id="1986121725487251894" />
        <Tweet id="2004916410687050167" />
      </div>
    </section>
  )
}

// CTA
function CTA() {
  return (
    <section className="py-24 px-6 text-center">
      <div className="max-w-xl mx-auto border border-zinc-800 bg-zinc-900/10 p-10 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Get started in seconds.</h3>
        <p className="text-zinc-500 text-sm mb-8">
          Clone the repo, run the setup script, and you're ready to go.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/docs"
            className="px-6 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Quickstart Guide
          </Link>
          <a
            href="https://github.com/arach/hooked"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-900 transition-colors flex items-center gap-2"
          >
            <Github size={14} /> View Source
          </a>
        </div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-zinc-900 bg-zinc-950/20">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <img src="/hooked-logo.png" alt="Hooked" className="w-4 h-4 object-contain" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-300">Hooked</span>
          </div>
          <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
            Hooks helper for Claude Code
          </p>
        </div>

        <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <a href="https://code.claude.com/docs/en/hooks-guide" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Claude Hooks</a>
          <a href="https://github.com/arach/hooked" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Github size={12} />
            GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-12 pt-6 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-700 font-bold uppercase tracking-[0.15em]">
        <span>
          Built with <span className="text-red-500">&hearts;</span> by{" "}
          <a href="https://x.com/arach" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-400">@arach</a>
        </span>
        <a href="https://arach.dev" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-500">
          arach.dev
        </a>
      </div>
    </footer>
  )
}

// Main Page
export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main>
        <Hero />

        {/* Demo Sections */}
        <section className="py-20 px-6 max-w-5xl mx-auto space-y-24">
          <VoiceAlertDemo />
          <UntilDemo />
        </section>

        <SessionScopedFeature />
        <Features />
        <SocialProof />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
