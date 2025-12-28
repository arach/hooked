"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Github, Copy, Check } from "lucide-react"
import Link from "next/link"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function Home() {
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const installCommand = `git clone https://github.com/arach/hooked.git
cd hooked && pnpm install
pnpm run hooked:init`

  const hookExample = `// Stop hook with contextual continuation
import { createStopHook, maxIterations, continueUntil } from 'hooked/stop'

const hook = createStopHook([
  maxIterations(3),    // Safety limit
  continueUntil(),     // Toggle with /hooked command
])

hook()

// Toggle continuation in Claude Code:
// /hooked continuation "fix the login bug"
// /hooked continuation --check "pnpm build"
// /hooked continuation OFF`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(hookExample)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 py-16">
      <main className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-white rounded-2xl p-4 mb-4">
              <img
                src="/hooked-logo.png"
                alt="Hooked Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-6xl font-semibold tracking-tight text-neutral-900 font-[family-name:var(--font-kode-mono)]">
              hooked
            </h1>
          </div>
          <p className="text-xl font-light text-neutral-500">
            Know when Claude needs you. Keep Claude working until done.
          </p>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-8 shadow-sm">
          <p className="text-base text-neutral-600 leading-relaxed mb-6 font-light">
            A TypeScript toolkit for Claude Code hooks. Voice notifications via{" "}
            <a
              href="https://github.com/arach/speakeasy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 hover:text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-500 transition-colors"
            >
              SpeakEasy
            </a>{" "}and smart stop hooks that keep Claude working until your task is done.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Features */}
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-3">Features</h3>
              <div className="space-y-2 text-[13px] text-neutral-600 font-light">
                <div>→ Voice notifications when Claude needs you</div>
                <div>→ Contextual continuation with <span className="font-mono text-neutral-700">/hooked</span></div>
                <div>→ Composable evaluators for stop hooks</div>
              </div>
            </div>

            {/* Hook coverage */}
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-3">Hook Coverage</h3>
              <div className="space-y-2 text-[13px] text-neutral-600 font-light">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xs">✓</span>
                  <span>Notification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xs">✓</span>
                  <span>Stop</span>
                </div>
                <div className="text-neutral-500 text-xs mt-2">
                  7 more hooks available in{" "}
                  <a
                    href="https://code.claude.com/docs/en/hooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neutral-700 transition-colors underline"
                  >
                    Claude Code
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-light text-neutral-700">Stop hook with continuation</h2>
            <button
              onClick={copyCode}
              className="text-neutral-400 hover:text-neutral-600 transition-colors text-sm flex items-center gap-2"
              title={copiedCode ? "Copied!" : "Copy code"}
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="font-light">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="font-light">Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-neutral-300 shadow-sm">
            <SyntaxHighlighter
              language="typescript"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                fontSize: '13px',
                lineHeight: '1.6',
                background: '#1e1e1e',
              }}
              showLineNumbers={false}
            >
              {hookExample}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Installation */}
        <div className="bg-neutral-900 rounded-lg p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-neutral-500">INSTALLATION</span>
            <button
              onClick={copyToClipboard}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <code className="text-[15px] text-neutral-200 font-mono tracking-tight block space-y-2">
            <div>git clone https://github.com/arach/hooked.git</div>
            <div>cd hooked && pnpm install</div>
            <div>pnpm run hooked:init</div>
          </code>
        </div>


        {/* Actions */}
        <div className="flex justify-center mb-20">
          <Button
            variant="outline"
            className="border-neutral-300 hover:bg-neutral-100 font-light"
            asChild
          >
            <Link href="https://github.com/arach/hooked">
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-3">
          <div className="flex justify-center gap-4 text-sm text-neutral-500 font-light">
            <a
              href="https://github.com/arach/speakeasy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700 transition-colors"
            >
              SpeakEasy
            </a>
            <span className="text-neutral-300">•</span>
            <a
              href="https://code.claude.com/docs/en/hooks"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700 transition-colors"
            >
              Claude Code Hooks
            </a>
          </div>
          <div className="text-sm text-neutral-400 font-light">
            Part of the Claude Code ecosystem
          </div>
        </footer>
      </main>
    </div>
  )
}
