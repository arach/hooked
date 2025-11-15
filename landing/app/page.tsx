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
cd hooked
npx tsx deploy.ts`

  const hookExample = `// notification.ts - The hook handler
import { SpeakEasy } from '@arach/speakeasy';

// Read notification payload from stdin
process.stdin.on('data', async (chunk) => {
  const payload = JSON.parse(chunk.toString());

  // Extract message and project context
  const message = payload.message;
  const projectName = extractProject(payload.transcript_path);

  // Speak the notification out loud
  await speakEasy.speak(\`In \${projectName}, \${message}\`);
});`

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
          <h1 className="text-6xl font-light tracking-tight text-neutral-900 mb-4">
            Hooked
          </h1>
          <p className="text-xl font-light text-neutral-500">
            Know when Claude needs you. Know when Claude is done.
          </p>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-8 shadow-sm">
          <p className="text-base text-neutral-600 leading-relaxed mb-6 font-light">
            Speaks Claude Code notifications out loud using{" "}
            <a
              href="https://github.com/arach/speakeasy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 hover:text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-500 transition-colors"
            >
              SpeakEasy
            </a>. Get audio alerts when Claude needs your attention.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* What it does */}
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-3">Automatic Setup</h3>
              <div className="space-y-2 text-[13px] text-neutral-600 font-light">
                <div>→ Finds <span className="font-mono text-neutral-700">~/.claude/hooks/</span></div>
                <div>→ Installs dependencies</div>
                <div>→ Updates settings.json safely</div>
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
                  <span className="text-yellow-600 text-xs">◐</span>
                  <span>Stop (partial)</span>
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
            <h2 className="text-lg font-light text-neutral-700">What a hook looks like</h2>
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
            <div>cd hooked</div>
            <div>npx tsx deploy.ts</div>
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
