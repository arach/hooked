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

// Serve the SPA
app.get('/', (c) => {
  return c.html(dashboardHtml)
})

const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hooked dashboard</title>
  <script type="module" src="https://esm.sh/htm/preact/standalone"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      background: #0a0a0a;
      color: #e5e5e5;
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 { font-size: 1.5rem; margin-bottom: 20px; color: #fff; }
    h2 { font-size: 1rem; margin: 20px 0 10px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }

    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat {
      background: #1a1a1a;
      padding: 15px 20px;
      border-radius: 8px;
      border: 1px solid #333;
    }
    .stat-value { font-size: 2rem; font-weight: bold; color: #fff; }
    .stat-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }
    input, select, button {
      font-family: inherit;
      font-size: 0.875rem;
      padding: 8px 12px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #e5e5e5;
    }
    input:focus, select:focus { outline: none; border-color: #555; }
    button { cursor: pointer; background: #2a2a2a; }
    button:hover { background: #333; }
    button.active { background: #3b82f6; border-color: #3b82f6; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      color: #888;
      font-weight: 500;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #1a1a1a;
    }
    tr:hover { background: #111; }

    .type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .type-notification { background: #1e3a5f; color: #60a5fa; }
    .type-spoken { background: #1e3a2f; color: #4ade80; }
    .type-alert_set { background: #5f3a1e; color: #fbbf24; }
    .type-alert_cleared { background: #3a3a1e; color: #a3a310; }
    .type-reminder { background: #5f1e3a; color: #f472b6; }
    .type-continuation { background: #3a1e5f; color: #a78bfa; }
    .type-stop { background: #333; color: #888; }

    .time { color: #666; white-space: nowrap; }
    .session { color: #666; font-family: monospace; }
    .message { color: #ccc; }
    .project { color: #60a5fa; }

    .refresh-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      margin-left: 10px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .empty { color: #666; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { html, render, useState, useEffect } from 'https://esm.sh/htm/preact/standalone'

    function App() {
      const [events, setEvents] = useState([])
      const [stats, setStats] = useState({ total: 0, byProject: [] })
      const [filter, setFilter] = useState('')
      const [typeFilter, setTypeFilter] = useState('')
      const [autoRefresh, setAutoRefresh] = useState(true)
      const [limit, setLimit] = useState(100)

      const fetchData = async () => {
        const [eventsRes, statsRes] = await Promise.all([
          fetch('/api/events?limit=' + limit).then(r => r.json()),
          fetch('/api/stats').then(r => r.json())
        ])
        setEvents(eventsRes)
        setStats(statsRes)
      }

      useEffect(() => {
        fetchData()
        if (autoRefresh) {
          const interval = setInterval(fetchData, 3000)
          return () => clearInterval(interval)
        }
      }, [autoRefresh, limit])

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
        <h1>hooked \${autoRefresh && html\`<span class="refresh-indicator"></span>\`}</h1>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">\${stats.total}</div>
            <div class="stat-label">Total Events</div>
          </div>
          \${stats.byProject?.slice(0, 4).map(p => html\`
            <div class="stat">
              <div class="stat-value">\${p.count}</div>
              <div class="stat-label">\${p.project}</div>
            </div>
          \`)}
        </div>

        <h2>Events</h2>

        <div class="controls">
          <input
            type="text"
            placeholder="Filter..."
            value=\${filter}
            onInput=\${e => setFilter(e.target.value)}
            style="flex: 1"
          />
          <select value=\${typeFilter} onChange=\${e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            \${types.map(t => html\`<option value=\${t}>\${t}</option>\`)}
          </select>
          <select value=\${limit} onChange=\${e => setLimit(Number(e.target.value))}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
          <button
            class=\${autoRefresh ? 'active' : ''}
            onClick=\${() => setAutoRefresh(!autoRefresh)}
          >
            \${autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick=\${fetchData}>Refresh</button>
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
                    <td><span class="type type-\${e.type}">\${e.type}</span></td>
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
    }

    render(html\`<\${App} />\`, document.getElementById('app'))
  </script>
</body>
</html>`

export async function startServer(port: number = 3456): Promise<void> {
  console.log(`Starting hooked dashboard on http://localhost:${port}`)

  serve({
    fetch: app.fetch,
    port,
  })

  // Open browser
  await open(`http://localhost:${port}`)

  console.log('Dashboard opened in browser. Press Ctrl+C to stop.')
}
