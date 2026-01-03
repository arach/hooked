/**
 * Hooked Web Dashboard
 *
 * Local web UI for viewing event history.
 * Run with: hooked web
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { history } from '../core/history'
import { config } from '../core/config'
import { continuation } from '../continuation'
import { alerts } from '../core/alerts'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import open from 'open'

// SpeakEasy config path
const SPEAKEASY_CONFIG = join(homedir(), '.config', 'speakeasy', 'settings.json')

function getSpeakEasyConfig() {
  if (!existsSync(SPEAKEASY_CONFIG)) return null
  try {
    return JSON.parse(readFileSync(SPEAKEASY_CONFIG, 'utf-8'))
  } catch { return null }
}

function saveSpeakEasyConfig(cfg: any) {
  writeFileSync(SPEAKEASY_CONFIG, JSON.stringify(cfg, null, 2))
}

const app = new Hono()

// API Routes
app.get('/api/events', (c) => {
  const limit = Number(c.req.query('limit')) || 100
  return c.json(history.getRecent(limit))
})

app.get('/api/events/search', (c) => {
  const q = c.req.query('q') || ''
  return c.json(history.search(q, 50))
})

app.get('/api/stats', (c) => {
  return c.json({
    total: history.getCount(),
    byProject: history.getProjectStats(),
  })
})

app.get('/api/status', (c) => {
  return c.json({
    voice: config.get().voice,
    alerts: {
      config: config.getAlertConfig(),
      pending: alerts.getAll(),
    },
    continuation: {
      pending: continuation.getPending(),
      active: continuation.getActiveSessions(),
      paused: continuation.isPaused(),
    },
  })
})

// Full config API (for config tab)
app.get('/api/config', (c) => {
  return c.json(config.get())
})

// Sessions API
app.get('/api/sessions', (c) => {
  return c.json({
    active: continuation.getActiveSessions(),
    pending: continuation.getPending(),
    paused: continuation.isPaused(),
  })
})

app.post('/api/config', async (c) => {
  try {
    const body = await c.req.json()
    const cfg = config.get()

    // Update voice settings
    if (body.voice !== undefined) {
      if (typeof body.voice.enabled === 'boolean') {
        cfg.voice.enabled = body.voice.enabled
      }
      if (typeof body.voice.volume === 'number') {
        cfg.voice.volume = Math.max(0, Math.min(1, body.voice.volume))
      }
    }

    // Update alert settings
    if (body.alerts !== undefined) {
      const alertCfg = config.getAlertConfig()
      if (typeof body.alerts.enabled === 'boolean') {
        alertCfg.enabled = body.alerts.enabled
      }
      if (typeof body.alerts.reminderMinutes === 'number') {
        alertCfg.reminderMinutes = Math.max(1, body.alerts.reminderMinutes)
      }
      if (typeof body.alerts.maxReminders === 'number') {
        alertCfg.maxReminders = Math.max(0, body.alerts.maxReminders)
      }
      if (typeof body.alerts.urgentAfterMinutes === 'number') {
        alertCfg.urgentAfterMinutes = Math.max(0, body.alerts.urgentAfterMinutes)
      }
      cfg.alerts = alertCfg
    }

    config.save(cfg)
    return c.json({ success: true, config: { voice: cfg.voice, alerts: config.getAlertConfig() } })
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 400)
  }
})

// Clear all alerts
app.post('/api/alerts/clear', (c) => {
  const result = alerts.clearAll()
  return c.json({ success: true, ...result })
})

// SpeakEasy config
app.get('/api/speakeasy', (c) => {
  const cfg = getSpeakEasyConfig()
  return c.json(cfg || { providers: {} })
})

app.post('/api/speakeasy', async (c) => {
  try {
    const body = await c.req.json()
    const cfg = getSpeakEasyConfig() || { providers: {} }

    // Update provider settings
    if (body.provider && body.voice) {
      if (!cfg.providers) cfg.providers = {}
      if (body.provider === 'openai') {
        if (!cfg.providers.openai) cfg.providers.openai = {}
        cfg.providers.openai.voice = body.voice
      } else if (body.provider === 'system') {
        if (!cfg.providers.system) cfg.providers.system = {}
        cfg.providers.system.voice = body.voice
      } else if (body.provider === 'groq') {
        if (!cfg.providers.groq) cfg.providers.groq = {}
        cfg.providers.groq.voice = body.voice
      }
    }

    // Update default provider
    if (body.defaultProvider) {
      if (!cfg.defaults) cfg.defaults = {}
      cfg.defaults.provider = body.defaultProvider
    }

    saveSpeakEasyConfig(cfg)
    return c.json({ success: true, config: cfg })
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 400)
  }
})

// Serve the SPA
app.get('/', (c) => {
  return c.html(dashboardHtml)
})

const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hooked // dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script type="module" src="https://esm.sh/htm/preact/standalone"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
      background: #09090b;
      color: #a1a1aa;
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    h1 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
      color: #52525b;
      letter-spacing: 0.05em;
    }
    h1 span { color: #22c55e; }
    h2 {
      font-size: 11px;
      font-weight: 600;
      margin: 24px 0 12px;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    .grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

    .panel {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      padding: 16px;
    }

    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .stat {
      background: #18181b;
      padding: 12px 16px;
      border: 1px solid #27272a;
      border-radius: 4px;
      min-width: 100px;
    }
    .stat-value { font-size: 24px; font-weight: 600; color: #e4e4e7; }
    .stat-label { font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }

    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    input, select, button {
      font-family: inherit;
      font-size: 12px;
      padding: 8px 12px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 3px;
      color: #a1a1aa;
    }
    input::placeholder { color: #52525b; }
    input:focus, select:focus { outline: none; border-color: #3f3f46; }
    button { cursor: pointer; background: #27272a; color: #a1a1aa; transition: all 0.15s; }
    button:hover { background: #3f3f46; color: #e4e4e7; }
    button.active { background: #22c55e; border-color: #22c55e; color: #000; }
    button.danger { background: #7f1d1d; border-color: #991b1b; }
    button.danger:hover { background: #991b1b; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      background: #09090b;
      border-bottom: 1px solid #27272a;
      color: #52525b;
      font-weight: 500;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.1em;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #18181b;
    }
    tr:hover { background: #1c1c1f; }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-notification { background: #172554; color: #60a5fa; }
    .badge-spoken { background: #14532d; color: #4ade80; }
    .badge-alert_set { background: #422006; color: #fbbf24; }
    .badge-alert_cleared { background: #3f3f00; color: #a3a310; }
    .badge-reminder { background: #4a044e; color: #e879f9; }
    .badge-continuation { background: #2e1065; color: #a78bfa; }
    .badge-stop { background: #27272a; color: #71717a; }

    .time { color: #52525b; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .session { color: #52525b; }
    .message { color: #a1a1aa; }
    .project { color: #60a5fa; }

    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status-dot.on { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
    .status-dot.off { background: #52525b; }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #27272a;
    }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { color: #a1a1aa; }
    .setting-hint { font-size: 10px; color: #52525b; margin-top: 2px; }
    .setting-control { display: flex; align-items: center; gap: 8px; }

    input[type="range"] {
      -webkit-appearance: none;
      background: #27272a;
      height: 4px;
      border-radius: 2px;
      border: none;
      width: 100px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
      cursor: pointer;
    }

    input[type="number"] {
      width: 60px;
      text-align: center;
    }

    .toggle {
      position: relative;
      width: 36px;
      height: 20px;
      background: #27272a;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle.on { background: #22c55e; }
    .toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle.on::after { transform: translateX(16px); }

    .empty { color: #52525b; padding: 40px; text-align: center; }

    .clickable { cursor: pointer; }
    .clickable:hover { background: #1f1f23; }

    .session-detail {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .session-detail-content {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }
    .session-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #27272a;
    }
    .session-detail-close {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
    }
    .session-detail-close:hover { color: #e4e4e7; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #27272a;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #52525b; }
    .detail-value { color: #e4e4e7; text-align: right; word-break: break-all; max-width: 70%; }
    .path-display {
      font-size: 11px;
      color: #71717a;
      background: #09090b;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      word-break: break-all;
    }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid #27272a;
      padding-bottom: 8px;
    }
    .tab {
      padding: 6px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #52525b;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.15s;
    }
    .tab:hover { color: #a1a1aa; }
    .tab.active { color: #22c55e; background: #22c55e15; }

    .pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { html, render, useState, useEffect } from 'https://esm.sh/htm/preact/standalone'

    function App() {
      const [events, setEvents] = useState([])
      const [stats, setStats] = useState({ total: 0, byProject: [] })
      const [config, setConfig] = useState({ voice: {}, alerts: {}, templates: {} })
      const [status, setStatus] = useState({ alerts: { pending: [] }, continuation: {} })
      const [speakeasy, setSpeakeasy] = useState({ providers: {}, defaults: {} })
      const [filter, setFilter] = useState('')
      const [typeFilter, setTypeFilter] = useState('')
      const [autoRefresh, setAutoRefresh] = useState(true)
      const [limit, setLimit] = useState(100)
      const [tab, setTab] = useState('status')
      const [selectedSession, setSelectedSession] = useState(null)

      const fetchData = async () => {
        const [eventsRes, statsRes, configRes, statusRes, speakeasyRes] = await Promise.all([
          fetch('/api/events?limit=' + limit).then(r => r.json()),
          fetch('/api/stats').then(r => r.json()),
          fetch('/api/config').then(r => r.json()),
          fetch('/api/status').then(r => r.json()),
          fetch('/api/speakeasy').then(r => r.json())
        ])
        setEvents(eventsRes)
        setStats(statsRes)
        setConfig(configRes)
        setStatus(statusRes)
        setSpeakeasy(speakeasyRes)
      }

      const updateSpeakeasy = async (updates) => {
        const res = await fetch('/api/speakeasy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }).then(r => r.json())
        if (res.success) setSpeakeasy(res.config)
      }

      useEffect(() => {
        fetchData()
        if (autoRefresh) {
          const interval = setInterval(fetchData, 3000)
          return () => clearInterval(interval)
        }
      }, [autoRefresh, limit])

      const updateConfig = async (updates) => {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }).then(r => r.json())
        if (res.success) fetchData()
      }

      const clearAlerts = async () => {
        await fetch('/api/alerts/clear', { method: 'POST' })
        fetchData()
      }

      const filteredEvents = events.filter(e => {
        if (typeFilter && e.type !== typeFilter) return false
        if (filter) {
          const q = filter.toLowerCase()
          return (e.message?.toLowerCase().includes(q) ||
                  e.project?.toLowerCase().includes(q) ||
                  e.session_id?.includes(q))
        }
        return true
      })

      const formatTime = (ts) => {
        const d = new Date(ts)
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }

      const types = [...new Set(events.map(e => e.type))]

      // ============ STATUS TAB ============
      const StatusTab = () => html\`
        <div class="stats">
          <div class="stat">
            <div class="stat-value">\${stats.total}</div>
            <div class="stat-label">Events</div>
          </div>
          \${stats.byProject?.slice(0, 4).map(p => html\`
            <div class="stat clickable" onClick=\${() => setFilter(p.project)}>
              <div class="stat-value">\${p.count}</div>
              <div class="stat-label">\${p.project}</div>
            </div>
          \`)}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px">
          <div class="panel">
            <h2 style="margin: 0 0 12px">Until Loops</h2>
            \${!status.continuation?.pending && !status.continuation?.active?.length
              ? html\`<div style="color: #52525b; font-size: 11px">None active</div>\`
              : html\`
                \${status.continuation?.pending && html\`
                  <div class="setting-row" style="padding: 8px 0">
                    <div>
                      <span style="color: #fbbf24">⏳ Pending</span>
                      <div class="setting-hint">\${status.continuation.pending.mode}\${status.continuation.pending.check ? ': ' + status.continuation.pending.check : ''}</div>
                    </div>
                  </div>
                \`}
                \${(status.continuation?.active || []).map(s => html\`
                  <div class="setting-row clickable" style="padding: 8px 0" onClick=\${() => setFilter(s.sessionId?.slice(0,8))}>
                    <div>
                      <span style="color: #22c55e">⟳ \${s.state?.mode || 'active'}</span>
                      <div class="setting-hint">\${s.sessionId?.slice(0,8)} · round \${s.state?.iteration || 1}</div>
                    </div>
                  </div>
                \`)}
                \${status.continuation?.paused && html\`<div style="color: #f97316; font-size: 11px; margin-top: 8px">⏸ Paused</div>\`}
              \`
            }
          </div>

          <div class="panel">
            <h2 style="margin: 0 0 12px">Waiting for Input</h2>
            \${(status.alerts?.pending || []).length === 0
              ? html\`<div style="color: #52525b; font-size: 11px">All clear</div>\`
              : (status.alerts?.pending || [])
                  .slice()
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 5)
                  .map(a => html\`
                    <div class="setting-row clickable" style="padding: 6px 0" onClick=\${() => setSelectedSession(a)}>
                      <div style="flex: 1; min-width: 0">
                        <span style="color: #60a5fa">\${a.project}</span>
                        <span style="color: #52525b; margin-left: 8px">\${a.sessionId?.slice(0,6)}</span>
                      </div>
                      <span style="color: #fbbf24">\${Math.round((Date.now() - new Date(a.timestamp).getTime()) / 60000)}m</span>
                    </div>
                  \`)
            }
          </div>
        </div>

        <div class="panel">
          <h2 style="margin: 0 0 12px">Projects</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px">
            \${(stats.byProject || []).map(p => html\`
              <div class="clickable" style="padding: 6px 12px; background: #09090b; border: 1px solid #27272a; border-radius: 4px" onClick=\${() => setFilter(p.project)}>
                <span style="color: #60a5fa">\${p.project}</span>
                <span style="color: #52525b; margin-left: 8px">\${p.count}</span>
              </div>
            \`)}
          </div>
        </div>

        <h2>Event Log</h2>
        <div class="controls">
          <input type="text" placeholder="filter..." value=\${filter} onInput=\${e => setFilter(e.target.value)} style="flex: 1" />
          \${filter && html\`<button onClick=\${() => setFilter('')}>Clear</button>\`}
          <select value=\${typeFilter} onChange=\${e => setTypeFilter(e.target.value)}>
            <option value="">all types</option>
            \${types.map(t => html\`<option value=\${t}>\${t}</option>\`)}
          </select>
          <select value=\${limit} onChange=\${e => setLimit(Number(e.target.value))}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
          </select>
          <button class=\${autoRefresh ? 'active' : ''} onClick=\${() => setAutoRefresh(!autoRefresh)}>
            \${autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>
        </div>

        \${filteredEvents.length === 0
          ? html\`<div class="empty">No events</div>\`
          : html\`
            <table>
              <thead>
                <tr><th>Time</th><th>Type</th><th>Project</th><th>Session</th><th>Message</th></tr>
              </thead>
              <tbody>
                \${filteredEvents.map(e => html\`
                  <tr class="clickable" onClick=\${() => setFilter(e.session_id?.slice(0,8) || e.project)}>
                    <td class="time">\${formatTime(e.timestamp)}</td>
                    <td><span class="badge badge-\${e.type}">\${e.type}</span></td>
                    <td class="project">\${e.project}</td>
                    <td class="session">\${e.session_id?.slice(0, 8) || '-'}</td>
                    <td class="message">\${e.message || '-'}</td>
                  </tr>
                \`)}
              </tbody>
            </table>
          \`
        }
      \`

      // Voice options by provider
      const voiceOptions = {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        groq: ['Arista-PlayAI', 'Atlas-PlayAI', 'Basil-PlayAI', 'Briggs-PlayAI', 'Calum-PlayAI', 'Celeste-PlayAI', 'Cheyenne-PlayAI', 'Chip-PlayAI', 'Cillian-PlayAI', 'Deedee-PlayAI', 'Fritz-PlayAI', 'Gail-PlayAI', 'Indigo-PlayAI', 'Mamaw-PlayAI', 'Mason-PlayAI', 'Mikail-PlayAI', 'Mitch-PlayAI', 'Quinn-PlayAI', 'Thunder-PlayAI'],
        system: ['Samantha', 'Alex', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Veena', 'Victoria']
      }

      const currentProvider = speakeasy.defaults?.provider || 'openai'
      const currentVoice = speakeasy.providers?.[currentProvider]?.voice ||
                          (currentProvider === 'openai' ? 'nova' : currentProvider === 'groq' ? 'Celeste-PlayAI' : 'Samantha')

      // ============ CONFIG TAB ============
      const ConfigTab = () => html\`
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
          <div>
            <div class="panel" style="margin-bottom: 16px">
              <h2 style="margin: 0 0 16px">Voice</h2>
              <div class="setting-row">
                <span class="setting-label">Enabled</span>
                <div class="toggle \${config.voice?.enabled ? 'on' : ''}" onClick=\${() => updateConfig({ voice: { enabled: !config.voice?.enabled } })}></div>
              </div>
              <div class="setting-row">
                <span class="setting-label">Volume <span style="color: #52525b">\${Math.round((config.voice?.volume || 1) * 100)}%</span></span>
                <input type="range" min="0" max="1" step="0.1" value=\${config.voice?.volume || 1} onInput=\${e => updateConfig({ voice: { volume: parseFloat(e.target.value) } })} style="width: 120px" />
              </div>
              <div class="setting-row">
                <span class="setting-label">Provider</span>
                <select value=\${currentProvider} onChange=\${e => updateSpeakeasy({ defaultProvider: e.target.value })} style="width: 120px">
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                  <option value="system">System</option>
                  <option value="elevenlabs">ElevenLabs</option>
                </select>
              </div>
              \${voiceOptions[currentProvider] && html\`
                <div class="setting-row">
                  <span class="setting-label">Voice</span>
                  <select value=\${currentVoice} onChange=\${e => updateSpeakeasy({ provider: currentProvider, voice: e.target.value })} style="width: 120px">
                    \${voiceOptions[currentProvider].map(v => html\`<option value=\${v}>\${v}</option>\`)}
                  </select>
                </div>
              \`}
            </div>

            <div class="panel" style="margin-bottom: 16px">
              <h2 style="margin: 0 0 16px">Alerts</h2>
              <div class="setting-row">
                <span class="setting-label">Enabled</span>
                <div class="toggle \${config.alerts?.enabled ? 'on' : ''}" onClick=\${() => updateConfig({ alerts: { enabled: !config.alerts?.enabled } })}></div>
              </div>
              <div class="setting-row">
                <div>
                  <span class="setting-label">Remind every</span>
                  <div class="setting-hint">minutes</div>
                </div>
                <input type="number" min="1" max="60" value=\${config.alerts?.reminderMinutes || 5} onChange=\${e => updateConfig({ alerts: { reminderMinutes: parseInt(e.target.value) } })} />
              </div>
              <div class="setting-row">
                <div>
                  <span class="setting-label">Max reminders</span>
                  <div class="setting-hint">0 = unlimited</div>
                </div>
                <input type="number" min="0" max="20" value=\${config.alerts?.maxReminders || 0} onChange=\${e => updateConfig({ alerts: { maxReminders: parseInt(e.target.value) } })} />
              </div>
              <div class="setting-row">
                <div>
                  <span class="setting-label">Urgent after</span>
                  <div class="setting-hint">minutes (0 = never)</div>
                </div>
                <input type="number" min="0" max="60" value=\${config.alerts?.urgentAfterMinutes || 0} onChange=\${e => updateConfig({ alerts: { urgentAfterMinutes: parseInt(e.target.value) } })} />
              </div>
              <button class="danger" style="width: 100%; margin-top: 12px" onClick=\${clearAlerts}>Clear All Alerts</button>
            </div>
          </div>

          <div>
            <div class="panel" style="margin-bottom: 16px">
              <h2 style="margin: 0 0 16px">Templates</h2>
              \${Object.entries(config.templates || {}).map(([key, val]) => html\`
                <div class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 4px">
                  <span class="setting-label" style="font-size: 10px; color: #52525b">\${key}</span>
                  <span style="color: #a1a1aa; font-size: 11px; word-break: break-all">\${val}</span>
                </div>
              \`)}
              \${!config.templates || Object.keys(config.templates).length === 0
                ? html\`<div style="color: #52525b; font-size: 11px">No templates configured</div>\`
                : ''
              }
            </div>

            <div class="panel">
              <h2 style="margin: 0 0 16px">Raw Config</h2>
              <pre style="background: #09090b; padding: 12px; border-radius: 4px; font-size: 10px; color: #71717a; overflow-x: auto; max-height: 300px">\${JSON.stringify(config, null, 2)}</pre>
            </div>
          </div>
        </div>
      \`

      return html\`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px">
          <h1 style="margin: 0">HOOKED <span>//</span> DASHBOARD \${autoRefresh && html\`<span class="status-dot on pulse"></span>\`}</h1>
          <div class="tabs" style="margin: 0; border: none; padding: 0">
            <div class="tab \${tab === 'status' ? 'active' : ''}" onClick=\${() => setTab('status')}>Status</div>
            <div class="tab \${tab === 'config' ? 'active' : ''}" onClick=\${() => setTab('config')}>Config</div>
          </div>
        </div>

        \${tab === 'status' ? StatusTab() : ConfigTab()}

        \${selectedSession && html\`
          <div class="session-detail" onClick=\${(e) => e.target === e.currentTarget && setSelectedSession(null)}>
            <div class="session-detail-content">
              <div class="session-detail-header">
                <div>
                  <h2 style="margin: 0; color: #e4e4e7; font-size: 16px">\${selectedSession.project}</h2>
                  <div style="color: #52525b; font-size: 11px; margin-top: 4px">\${selectedSession.type}</div>
                </div>
                <button class="session-detail-close" onClick=\${() => setSelectedSession(null)}>×</button>
              </div>

              <div class="detail-row">
                <span class="detail-label">Session ID</span>
                <span class="detail-value">\${selectedSession.sessionId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Message</span>
                <span class="detail-value">\${selectedSession.message}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Waiting</span>
                <span class="detail-value">\${Math.round((Date.now() - new Date(selectedSession.timestamp).getTime()) / 60000)} minutes</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reminders sent</span>
                <span class="detail-value">\${selectedSession.reminders || 0}</span>
              </div>

              \${selectedSession.cwd && html\`
                <div style="margin-top: 16px">
                  <div class="detail-label" style="margin-bottom: 4px">Full Path</div>
                  <div class="path-display">\${selectedSession.cwd}</div>
                </div>
              \`}

              <div style="margin-top: 16px">
                <button style="width: 100%" onClick=\${() => { setFilter(selectedSession.sessionId?.slice(0,8) || ''); setSelectedSession(null); }}>
                  Filter events by this session
                </button>
              </div>
            </div>
          </div>
        \`}
      \`
    }

    render(html\`<\${App} />\`, document.getElementById('app'))
  </script>
</body>
</html>`

export async function startServer(port: number = 3456, timeoutMinutes: number = 10): Promise<void> {
  console.log(`Starting hooked dashboard on http://localhost:${port}`)
  console.log(`Auto-shutdown in ${timeoutMinutes} minutes`)

  const server = serve({
    fetch: app.fetch,
    port,
  })

  // Open browser
  await open(`http://localhost:${port}`)

  // Auto-shutdown after timeout
  setTimeout(() => {
    console.log('\nAuto-shutdown: timeout reached')
    server.close()
    process.exit(0)
  }, timeoutMinutes * 60 * 1000)
}
