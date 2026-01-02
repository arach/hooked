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
import open from 'open'

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

// Settings API
app.get('/api/config', (c) => {
  const cfg = config.get()
  return c.json({
    voice: cfg.voice,
    alerts: config.getAlertConfig(),
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
      const [config, setConfig] = useState({ voice: { enabled: true, volume: 1 }, alerts: {} })
      const [status, setStatus] = useState({ alerts: { pending: [] }, continuation: {} })
      const [filter, setFilter] = useState('')
      const [typeFilter, setTypeFilter] = useState('')
      const [autoRefresh, setAutoRefresh] = useState(true)
      const [limit, setLimit] = useState(100)
      const [tab, setTab] = useState('status')

      const fetchData = async () => {
        const [eventsRes, statsRes, configRes, statusRes] = await Promise.all([
          fetch('/api/events?limit=' + limit).then(r => r.json()),
          fetch('/api/stats').then(r => r.json()),
          fetch('/api/config').then(r => r.json()),
          fetch('/api/status').then(r => r.json())
        ])
        setEvents(eventsRes)
        setStats(statsRes)
        setConfig(configRes)
        setStatus(statusRes)
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
        if (res.success) setConfig(res.config)
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

      return html\`
        <h1>HOOKED <span>//</span> DASHBOARD \${autoRefresh && html\`<span class="status-dot on pulse"></span>\`}</h1>

        <div class="grid">
          <div>
            <div class="stats">
              <div class="stat">
                <div class="stat-value">\${stats.total}</div>
                <div class="stat-label">Events</div>
              </div>
              \${stats.byProject?.slice(0, 3).map(p => html\`
                <div class="stat">
                  <div class="stat-value">\${p.count}</div>
                  <div class="stat-label">\${p.project}</div>
                </div>
              \`)}
            </div>

            <h2>Event Log</h2>

            <div class="controls">
              <input
                type="text"
                placeholder="filter..."
                value=\${filter}
                onInput=\${e => setFilter(e.target.value)}
                style="flex: 1"
              />
              <select value=\${typeFilter} onChange=\${e => setTypeFilter(e.target.value)}>
                <option value="">all</option>
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
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Project</th>
                      <th>Session</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${filteredEvents.map(e => html\`
                      <tr>
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
          </div>

          <div>
            <div class="tabs">
              <div class="tab \${tab === 'status' ? 'active' : ''}" onClick=\${() => setTab('status')}>Status</div>
              <div class="tab \${tab === 'config' ? 'active' : ''}" onClick=\${() => setTab('config')}>Config</div>
            </div>

            \${tab === 'status' && html\`
              <div class="panel" style="margin-bottom: 16px">
                <div class="setting-row">
                  <div class="setting-label">Until Loop</div>
                  <div style="text-align: right">
                    \${status.continuation?.pending || status.continuation?.active?.length > 0
                      ? html\`<span style="color: #22c55e">\${status.continuation?.pending ? '⏳ Pending' : '⟳ Active'}</span>\`
                      : html\`<span style="color: #52525b">Off</span>\`
                    }
                  </div>
                </div>
                \${(status.continuation?.pending || status.continuation?.active?.length > 0) && html\`
                  <div style="padding: 4px 0 0; font-size: 11px; color: #52525b">
                    \${status.continuation?.pending?.mode || status.continuation?.active?.[0]?.state?.mode}
                    \${status.continuation?.pending?.check ? ': ' + status.continuation.pending.check : ''}
                  </div>
                \`}
              </div>

              <h2 style="margin-top: 0">Waiting</h2>
              <div class="panel">
                \${(status.alerts?.pending || []).length === 0
                  ? html\`<div style="color: #52525b; font-size: 11px; padding: 8px 0">All clear</div>\`
                  : (status.alerts?.pending || [])
                      .slice()
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .map(a => html\`
                        <div class="setting-row" style="padding: 8px 0">
                          <div style="flex: 1; min-width: 0">
                            <div class="setting-label" style="color: #60a5fa">\${a.project}</div>
                            <div class="setting-hint">\${a.type} · \${a.sessionId?.slice(0,6)}</div>
                          </div>
                          <div style="text-align: right; flex-shrink: 0">
                            <div style="color: #fbbf24; font-size: 12px">\${Math.round((Date.now() - new Date(a.timestamp).getTime()) / 60000)}m</div>
                          </div>
                        </div>
                      \`)
                }
              </div>
            \`}

            \${tab === 'config' && html\`
              <h2 style="margin-top: 0">Voice</h2>
              <div class="panel" style="margin-bottom: 16px">
                <div class="setting-row">
                  <div class="setting-label">Enabled</div>
                  <div class="toggle \${config.voice?.enabled ? 'on' : ''}" onClick=\${() => updateConfig({ voice: { enabled: !config.voice?.enabled } })}></div>
                </div>
                <div class="setting-row">
                  <div>
                    <div class="setting-label">Volume</div>
                    <div class="setting-hint">\${Math.round((config.voice?.volume || 1) * 100)}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value=\${config.voice?.volume || 1} onInput=\${e => updateConfig({ voice: { volume: parseFloat(e.target.value) } })} />
                </div>
              </div>

              <h2>Alerts</h2>
              <div class="panel" style="margin-bottom: 16px">
                <div class="setting-row">
                  <div class="setting-label">Enabled</div>
                  <div class="toggle \${config.alerts?.enabled ? 'on' : ''}" onClick=\${() => updateConfig({ alerts: { enabled: !config.alerts?.enabled } })}></div>
                </div>
                <div class="setting-row">
                  <div>
                    <div class="setting-label">Remind every</div>
                    <div class="setting-hint">minutes</div>
                  </div>
                  <input type="number" min="1" max="60" value=\${config.alerts?.reminderMinutes || 5} onChange=\${e => updateConfig({ alerts: { reminderMinutes: parseInt(e.target.value) } })} />
                </div>
                <div class="setting-row">
                  <div>
                    <div class="setting-label">Max reminders</div>
                    <div class="setting-hint">0 = unlimited</div>
                  </div>
                  <input type="number" min="0" max="20" value=\${config.alerts?.maxReminders || 0} onChange=\${e => updateConfig({ alerts: { maxReminders: parseInt(e.target.value) } })} />
                </div>
                <div class="setting-row">
                  <div>
                    <div class="setting-label">Urgent after</div>
                    <div class="setting-hint">minutes (0 = never)</div>
                  </div>
                  <input type="number" min="0" max="60" value=\${config.alerts?.urgentAfterMinutes || 0} onChange=\${e => updateConfig({ alerts: { urgentAfterMinutes: parseInt(e.target.value) } })} />
                </div>
              </div>

              <button class="danger" style="width: 100%" onClick=\${clearAlerts}>Clear All Alerts</button>
            \`}
          </div>
        </div>
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
