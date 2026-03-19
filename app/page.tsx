'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient, Session } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

interface Task {
  id: string
  title: string
  completed: boolean
  win_statement: string | null
  category: string | null
  priority: number | null
  completed_at: string | null
  created_at: string
  due_date: string | null
}

function getDateForDay(dayIndex: number): string {
  const today = new Date()
  const diff = dayIndex - today.getDay()
  const d = new Date(today)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

type RecapPeriod = 'today' | 'week' | 'month' | 'all'

const WINS_PER_PAGE = 25
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const LIGHT_GREETINGS = [
  "you're going to crush it today ✨",
  "look at you, showing up 🌟",
  "today's tasks don't stand a chance 💪",
  "good things incoming — let's go 🌈",
  "you showed up. that's already a win 🎉",
  "fresh page, fresh start. let's do this 📋",
  "your future self is rooting for you 🙌",
]
const DARK_GREETINGS = [
  "tasks: the eternal nemesis returns 🌚",
  "everything is fine. probably. 🌑",
  "another day, another list that will haunt you 💀",
  "the tasks were here before you. they'll outlast you too.",
  "surviving is also a win 🖤",
  "somewhere, a to-do list is laughing at us both 🕯️",
  "hope is the first step. the list is the second. 🌒",
]

const PRIORITY_CONFIG: Record<number, { color: string; darkColor: string; label: string }> = {
  1: { color: '#c94f38', darkColor: '#d4694e', label: 'High' },
  2: { color: '#c9a55a', darkColor: '#c9a55a', label: 'Med' },
  3: { color: '#c9b8a4', darkColor: '#5a4f40', label: 'Low' },
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string; darkBg: string }> = {
  Work:     { bg: '#dbeafe', color: '#1d4ed8', darkBg: 'rgba(29,78,216,0.15)' },
  Personal: { bg: '#ede9fe', color: '#6d28d9', darkBg: 'rgba(109,40,217,0.15)' },
  Home:     { bg: '#dcfce7', color: '#15803d', darkBg: 'rgba(21,128,61,0.15)' },
  Health:   { bg: '#fee2e2', color: '#b91c1c', darkBg: 'rgba(185,28,28,0.15)' },
  Learning: { bg: '#fef9c3', color: '#a16207', darkBg: 'rgba(161,98,7,0.15)' },
  Other:    { bg: '#f3f4f6', color: '#6b7280', darkBg: 'rgba(107,114,128,0.15)' },
}

const PERIOD_LABELS: Record<RecapPeriod, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
  all:   'All Time',
}

function periodFrom(period: RecapPeriod): string | null {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString() }
  if (period === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.toISOString() }
  return null
}

function CategoryBadge({ category, dark }: { category: string | null; dark: boolean }) {
  if (!category) return null
  const s = CATEGORY_STYLES[category] || CATEGORY_STYLES.Other
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '2px 7px', borderRadius: '99px', backgroundColor: dark ? s.darkBg : s.bg, color: s.color, flexShrink: 0 }}>
      {category}
    </span>
  )
}

function RecapText({ text, dark }: { text: string; dark: boolean }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const bold = line.match(/^\*\*(.+)\*\*$/)
        if (bold) return <p key={i} style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#c9a55a', marginTop: i === 0 ? 0 : '12px', marginBottom: '4px' }}>{bold[1]}</p>
        if (!line.trim()) return <div key={i} style={{ height: '4px' }} />
        return <p key={i} style={{ fontSize: '13px', color: dark ? '#ccc' : '#3d3226', lineHeight: 1.7, margin: 0 }}>{line}</p>
      })}
    </div>
  )
}


function TornEdge({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 960 22" preserveAspectRatio="none" aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '22px', transform: flip ? 'scaleY(-1)' : 'none', marginTop: flip ? 0 : '-1px', marginBottom: flip ? '-1px' : 0 }}>
      <path d="M0,0 L0,22 Q16,8 32,16 Q48,24 64,10 Q80,2 96,18 Q112,24 128,8 Q144,0 160,14 Q176,22 192,10 Q208,2 224,16 Q240,24 256,8 Q272,0 288,14 Q304,22 320,8 Q336,0 352,16 Q368,24 384,8 Q400,0 416,14 Q432,22 448,8 Q464,2 480,18 Q496,24 512,8 Q528,0 544,16 Q560,24 576,10 Q592,2 608,18 Q624,24 640,8 Q656,0 672,14 Q688,22 704,8 Q720,0 736,16 Q752,24 768,10 Q784,2 800,16 Q816,24 832,8 Q848,0 864,14 Q880,22 896,10 Q912,2 928,18 Q944,24 960,12 L960,0 Z"
        fill={fill} />
    </svg>
  )
}

function SidebarScribbles() {
  return null
}

export default function Home() {
  const [pending, setPending] = useState<Task[]>([])
  const [wins, setWins] = useState<Task[]>([])
  const [winsTotal, setWinsTotal] = useState(0)
  const [winsPage, setWinsPage] = useState(1)
  const [winsHasMore, setWinsHasMore] = useState(false)
  const [winsLoading, setWinsLoading] = useState(false)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const [recap, setRecap] = useState('')
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapPeriod, setRecapPeriod] = useState<RecapPeriod>('today')

  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'tasks' | 'wins'>('tasks')
  const [weather, setWeather] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [selectedDay, setSelectedDay] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const todayDay    = mounted ? new Date().getDay() : 0
  const todayDate   = mounted ? getDateForDay(new Date().getDay()) : ''
  const selectedDate = mounted ? getDateForDay(selectedDay) : ''
  const isViewingToday = !mounted || selectedDate === todayDate
  const selectedDayName = mounted ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : ''

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    const token = session?.access_token
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers as Record<string, string> ?? {}),
      },
    })
  }, [session])

  const fetchPending = useCallback(async (date?: string) => {
    const d = date ?? getDateForDay(new Date().getDay())
    const res = await authFetch(`/api/tasks?status=pending&date=${d}`)
    setPending(await res.json())
  }, [authFetch])

  const fetchWins = useCallback(async (page = 1, append = false) => {
    setWinsLoading(true)
    const res = await authFetch(`/api/tasks?status=completed&page=${page}&limit=${WINS_PER_PAGE}`)
    const { data, total, hasMore } = await res.json()
    setWins(prev => append ? [...prev, ...data] : data)
    setWinsTotal(total)
    setWinsPage(page)
    setWinsHasMore(hasMore)
    setWinsLoading(false)
  }, [authFetch])

  // Initialize after mount to avoid SSR/client date mismatch
  useEffect(() => {
    const day = new Date().getDay()
    setSelectedDay(day)
    setMounted(true)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!mounted || !session) return
    fetchPending(selectedDate)
  }, [selectedDay, mounted, fetchPending, selectedDate, session])

  useEffect(() => {
    if (!session) return
    fetchWins(1)
    fetch('https://wttr.in/?format=%C,+%t&u', { signal: AbortSignal.timeout(4000) })
      .then(r => r.text()).then(t => setWeather(t.trim())).catch(() => {})
  }, [fetchWins, session])

  useEffect(() => {
    const list = dark ? DARK_GREETINGS : LIGHT_GREETINGS
    setGreeting(list[Math.floor(Math.random() * list.length)])
  }, [dark])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    const body: Record<string, string> = { title: input.trim() }
    if (!isViewingToday) body.due_date = selectedDate
    await authFetch('/api/tasks', { method: 'POST', body: JSON.stringify(body) })
    setInput('')
    await fetchPending(selectedDate)
    setLoading(false)
  }

  async function completeTask(task: Task) {
    setEnhancing(task.id)
    try {
      let statement = task.title
      let category = 'Other'
      try {
        const res = await authFetch('/api/enhance-win', { method: 'POST', body: JSON.stringify({ title: task.title }) })
        const data = await res.json()
        statement = data.statement || task.title
        category = data.category || 'Other'
      } catch { /* fall back to raw title */ }
      await authFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id: task.id, completed: true, win_statement: statement, category }) })
      setEnhancing(null)
      setCompleting(task.id)
      await new Promise(r => setTimeout(r, 600))
      await fetchPending(selectedDate)
      await fetchWins(1)
      setCompleting(null)
    } catch {
      setEnhancing(null)
      setCompleting(null)
    }
  }

  async function cyclePriority(task: Task) {
    const next = ((task.priority ?? 2) % 3) + 1
    setPending(prev => prev.map(t => t.id === task.id ? { ...t, priority: next } : t))
    await authFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id: task.id, priority: next }) })
  }

  async function deleteTask(id: string) {
    await authFetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })
    await fetchPending(selectedDate)
  }

  async function deleteWin(id: string) {
    setWins(prev => prev.filter(w => w.id !== id))
    setWinsTotal(t => t - 1)
    await authFetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })
  }

  async function generateRecap() {
    setRecapLoading(true)
    setRecap('')
    try {
      const from = periodFrom(recapPeriod)
      let url = `/api/tasks?status=completed&limit=500`
      if (from) url += `&from=${encodeURIComponent(from)}`
      const { data } = await (await authFetch(url)).json()

      if (!data || data.length === 0) {
        setRecap(`No wins found for ${PERIOD_LABELS[recapPeriod].toLowerCase()}.`)
        setRecapLoading(false)
        return
      }

      const winsPayload = data.map((t: Task) => ({ statement: t.win_statement || t.title, category: t.category || 'Other' }))
      const res = await authFetch('/api/recap', { method: 'POST', body: JSON.stringify({ wins: winsPayload }) })
      setRecap((await res.json()).recap)
    } catch {
      setRecap("Couldn't generate your recap right now — try again later.")
    }
    setRecapLoading(false)
  }

  const groupByDate = (tasks: Task[]) => {
    const groups: Record<string, Task[]> = {}
    tasks.forEach(t => {
      const date = new Date(t.completed_at || t.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(t)
    })
    return groups
  }

  const categoryCounts = wins.reduce<Record<string, number>>((acc, t) => {
    const c = t.category || 'Other'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  const sortedPending = [...pending].sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2))

  // Theme
  const bg         = dark ? '#1a1714' : '#f7f1e3'
  const paper      = dark ? '#23201b' : '#faf6ed'
  const line       = dark ? '#2e2a23' : '#e2d5be'
  const gold       = dark ? '#7a6f5c' : '#c9a55a'
  const textPrimary  = dark ? '#e8dfc8' : '#3d3226'
  const textMuted    = dark ? '#6b6050' : '#b09878'
  const coral      = dark ? '#d4694e' : '#c94f38'
  const sidebarBg  = dark ? '#1f1c17' : '#f2ead8'

  if (authLoading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f1e3', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
  )

  if (!session) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f1e3', backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #e2d5be 39px, #e2d5be 40px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#faf6ed', boxShadow: '0 0 40px rgba(0,0,0,0.15)', borderRadius: '4px', padding: 'clamp(28px, 7vw, 48px) clamp(20px, 8vw, 56px)', textAlign: 'center', maxWidth: '380px', width: '100%', margin: '0 16px' }}>
        <h1 style={{ fontSize: '48px', color: '#c94f38', fontFamily: 'Georgia, serif', fontWeight: 900, margin: '0 0 8px' }}>TALLY</h1>
        <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '19px', color: '#b09878', marginBottom: '36px' }}>track tasks. own your wins.</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '12px 24px', backgroundColor: '#fff', border: '1.5px solid #e2d5be', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#3d3226', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'box-shadow 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)')}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: bg, backgroundImage: `repeating-linear-gradient(transparent, transparent 39px, ${line} 39px, ${line} 40px)`, transition: 'background-color 0.4s' }}>
      <div className="mx-auto min-h-screen" style={{ maxWidth: '960px', backgroundColor: paper, boxShadow: '0 0 40px rgba(0,0,0,0.15)', transition: 'background-color 0.4s', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ backgroundColor: dark ? '#1f1c17' : '#f7f1e3', borderBottom: `3px solid ${gold}`, padding: isMobile ? '12px 16px 10px' : '20px 32px 16px', transition: 'background-color 0.4s', position: 'relative', zIndex: 1 }}>
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h1 style={{ fontSize: '36px', color: coral, fontFamily: 'Georgia, serif', fontWeight: 900, lineHeight: 1, margin: 0 }}>TALLY</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setDark(d => !d)} style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
                    {dark ? '☀️' : '🌙'}
                  </button>
                  <button onClick={() => supabase.auth.signOut()} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, background: 'none', border: `1.5px solid ${line}`, borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = coral)} onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
                    Sign out
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {DAYS.map((d, i) => {
                  const isToday = mounted && i === todayDay
                  const isSelected = mounted && i === selectedDay
                  return (
                    <button key={i} onClick={() => setSelectedDay(i)}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: isToday ? coral : 'transparent', color: isToday ? '#fff' : isSelected ? coral : gold, border: isToday ? 'none' : isSelected ? `2px solid ${coral}` : `1.5px solid ${line}`, outline: 'none' }}
                      onMouseEnter={e => { if (!isToday) { e.currentTarget.style.borderColor = coral; e.currentTarget.style.color = coral; e.currentTarget.style.transform = 'scale(1.15)' } }}
                      onMouseLeave={e => { if (!isToday) { e.currentTarget.style.borderColor = isSelected ? coral : line; e.currentTarget.style.color = isSelected ? coral : gold; e.currentTarget.style.transform = 'scale(1)' } }}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ fontSize: '48px', color: coral, fontFamily: 'Georgia, serif', fontWeight: 900, lineHeight: 1, margin: 0 }}>TALLY</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {DAYS.map((d, i) => {
                    const isToday = mounted && i === todayDay
                    const isSelected = mounted && i === selectedDay
                    return (
                      <button key={i} onClick={() => setSelectedDay(i)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: isToday ? coral : 'transparent', color: isToday ? '#fff' : isSelected ? coral : gold, border: isToday ? 'none' : isSelected ? `2px solid ${coral}` : `1.5px solid ${line}`, outline: 'none' }}
                        onMouseEnter={e => { if (!isToday) { e.currentTarget.style.borderColor = coral; e.currentTarget.style.color = coral; e.currentTarget.style.transform = 'scale(1.15)' } }}
                        onMouseLeave={e => { if (!isToday) { e.currentTarget.style.borderColor = isSelected ? coral : line; e.currentTarget.style.color = isSelected ? coral : gold; e.currentTarget.style.transform = 'scale(1)' } }}>
                        {d}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setDark(d => !d)} style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
                  {dark ? '☀️' : '🌙'}
                </button>
                <button onClick={() => supabase.auth.signOut()} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: textMuted, background: 'none', border: `1.5px solid ${line}`, borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = coral)} onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        <TornEdge fill={paper} />

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', position: 'relative', zIndex: 1, flex: 1 }}>

          {/* Main panel */}
          <div style={{ padding: isMobile ? '16px 16px 32px' : '24px 32px 48px', borderRight: isMobile ? 'none' : `1px solid ${line}` }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `2px solid ${line}`, marginBottom: '20px' }}>
              {(['tasks', 'wins'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 20px 10px', marginBottom: '-2px', border: 'none', borderBottom: activeTab === tab ? `2px solid ${coral}` : '2px solid transparent', color: activeTab === tab ? coral : textMuted, background: 'none', cursor: 'pointer' }}>
                  {tab === 'tasks' ? `Tasks${pending.length > 0 ? ` (${pending.length})` : ''}` : winsTotal > 0 ? `Wins (${winsTotal})` : 'Wins'}
                </button>
              ))}
            </div>

            {/* ── Tasks tab ── */}
            {activeTab === 'tasks' && (
              <div>
                <form onSubmit={addTask} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder={isViewingToday ? "what needs to get done today?" : `planning ahead for ${selectedDayName}...`} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `2px solid ${gold}`, padding: '6px 0', fontSize: isMobile ? '16px' : '19px', color: textPrimary, fontFamily: 'var(--font-caveat)', outline: 'none' }} />
                  <button type="submit" disabled={loading || !input.trim()} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 16px', backgroundColor: coral, color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', opacity: loading || !input.trim() ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                    {loading ? '...' : 'Add'}
                  </button>
                </form>

                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '8px' }}>{isViewingToday ? "Today's Tasks" : `${selectedDayName}'s Tasks`}</div>

                {sortedPending.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'var(--font-caveat)', fontSize: '22px', color: gold }}>{isViewingToday ? 'nothing left — nice work ✓' : `nothing planned for ${selectedDayName} yet`}</div>
                ) : sortedPending.map((task, i) => {
                  const p = task.priority ?? 2
                  const pc = dark ? PRIORITY_CONFIG[p].darkColor : PRIORITY_CONFIG[p].color
                  return (
                    <div key={task.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${line}`, padding: '12px 0', opacity: completing === task.id ? 0 : 1, transform: completing === task.id ? 'translateX(16px)' : 'none', transition: 'opacity 0.5s, transform 0.5s' }}>
                      <span style={{ fontSize: '11px', color: gold, width: '16px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                      <button onClick={() => cyclePriority(task)} title={`${PRIORITY_CONFIG[p].label} — click to change`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill={p === 3 ? 'none' : pc} stroke={pc} strokeWidth="1.5" /></svg>
                      </button>
                      <button onClick={() => completeTask(task)} disabled={!!enhancing} style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${completing === task.id ? '#6db08a' : gold}`, background: completing === task.id ? '#6db08a' : 'transparent', cursor: enhancing ? 'default' : 'pointer', opacity: enhancing && enhancing !== task.id ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {completing === task.id && <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>}
                        {enhancing === task.id && <div className="animate-pulse rounded-full" style={{ width: '8px', height: '8px', backgroundColor: gold }} />}
                      </button>
                      <span style={{ flex: 1, fontFamily: 'var(--font-caveat)', fontSize: '21px', color: completing === task.id ? '#6db08a' : enhancing === task.id ? textMuted : textPrimary, fontStyle: enhancing === task.id ? 'italic' : 'normal' }}>
                        {completing === task.id ? 'moving to wins ✦' : enhancing === task.id ? 'logging this one...' : task.title}
                      </span>
                      {p === 1 && <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: pc, textTransform: 'uppercase', flexShrink: 0 }}>High</span>}
                      <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100" style={{ color: dark ? '#5a4f40' : '#d4a8a0', fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Wins tab ── */}
            {activeTab === 'wins' && (
              <div>
                {winsTotal === 0 && !winsLoading ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'var(--font-caveat)', fontSize: '22px', color: gold }}>
                    complete tasks to start logging wins 🏆
                  </div>
                ) : (
                  <>
                    {/* Time period + recap */}
                    <div style={{ marginBottom: '20px' }}>
                      {/* Period selector */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {(['today', 'week', 'month', 'all'] as RecapPeriod[]).map(p => (
                          <button key={p} onClick={() => { setRecapPeriod(p); setRecap('') }} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', border: `1.5px solid ${recapPeriod === p ? gold : line}`, borderRadius: '99px', background: recapPeriod === p ? gold : 'transparent', color: recapPeriod === p ? (dark ? '#1a1714' : '#faf6ed') : textMuted, cursor: 'pointer', transition: 'all 0.2s' }}>
                            {PERIOD_LABELS[p]}
                          </button>
                        ))}
                      </div>

                      <button onClick={generateRecap} disabled={recapLoading} style={{ width: '100%', padding: '11px', border: `2px dashed ${gold}`, color: gold, background: 'transparent', borderRadius: '4px', cursor: recapLoading ? 'default' : 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: recapLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                        {recapLoading ? 'writing your recap...' : `✦ Recap — ${PERIOD_LABELS[recapPeriod]}`}
                      </button>

                      {recap && (
                        <div style={{ marginTop: '12px', background: dark ? '#1f1c17' : '#fdf6e3', border: `1.5px solid ${line}`, borderLeft: `4px solid ${gold}`, borderRadius: '4px', padding: '16px' }}>
                          <RecapText text={recap} dark={dark} />
                          <button onClick={() => navigator.clipboard.writeText(recap)} style={{ marginTop: '12px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: gold, background: 'none', border: 'none', cursor: 'pointer' }}>
                            Copy to clipboard
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Grouped wins list */}
                    {Object.entries(groupByDate(wins)).map(([date, dayWins]) => (
                      <div key={date} style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '8px' }}>{date}</p>
                        {dayWins.map(task => (
                          <div key={task.id} className="group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderBottom: `1px solid ${line}`, padding: '11px 0' }}>
                            <span style={{ color: coral, marginTop: '3px', flexShrink: 0 }}>✦</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '21px', color: textPrimary, lineHeight: 1.3, margin: 0 }}>
                                  {task.win_statement || task.title}
                                </p>
                                <CategoryBadge category={task.category} dark={dark} />
                              </div>
                              {task.win_statement && (
                                <p style={{ fontSize: '11px', color: textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '220px' : '100%' }}>from: {task.title}</p>
                              )}
                            </div>
                            {/* Trash */}
                            <button onClick={() => deleteWin(task.id)} className="opacity-0 group-hover:opacity-100" title="Delete win" style={{ color: dark ? '#5a4f40' : '#d4a8a0', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', transition: 'opacity 0.2s, color 0.2s', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#c94f38')} onMouseLeave={e => (e.currentTarget.style.color = dark ? '#5a4f40' : '#d4a8a0')}>
                              <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                                <path d="M1 3.5h11M4.5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M5.5 6.5v4M7.5 6.5v4M2 3.5l.8 8a1 1 0 001 .9h5.4a1 1 0 001-.9l.8-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Load more */}
                    {winsHasMore && (
                      <button onClick={() => fetchWins(winsPage + 1, true)} disabled={winsLoading} style={{ width: '100%', padding: '10px', border: `1.5px solid ${line}`, color: textMuted, background: 'transparent', borderRadius: '4px', cursor: winsLoading ? 'default' : 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: winsLoading ? 0.5 : 1, marginTop: '8px' }}>
                        {winsLoading ? 'loading...' : `Load more (${winsTotal - wins.length} remaining)`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ backgroundColor: sidebarBg, padding: isMobile ? '20px 16px 32px' : '28px 24px 48px', borderTop: isMobile ? `1px solid ${line}` : 'none', transition: 'background-color 0.4s' }}>
            {mounted && <>
              <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '22px', color: textPrimary, lineHeight: 1.3, marginBottom: '4px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '17px', color: textMuted, marginBottom: '4px' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </>}
            {weather && <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '16px', color: textMuted, marginBottom: '16px' }}>{weather}</p>}
            {greeting && <p style={{ fontFamily: 'var(--font-caveat)', fontSize: '17px', color: dark ? gold : '#8a7560', fontStyle: 'italic', lineHeight: 1.4, marginBottom: '24px' }}>{greeting}</p>}

            <div style={{ height: '1px', backgroundColor: line, marginBottom: '24px' }} />

            {/* Win count — hidden when zero to avoid calling out the user */}
            {winsTotal > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '8px' }}>Wins Logged</div>
                <div style={{ fontSize: '48px', fontFamily: 'Georgia, serif', fontWeight: 900, color: gold, lineHeight: 1 }}>{winsTotal}</div>
              </div>
            )}

            {/* Category breakdown */}
            {Object.keys(categoryCounts).length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '10px' }}>By Category</div>
                {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const s = CATEGORY_STYLES[cat] || CATEGORY_STYLES.Other
                  const pct = Math.round((count / wins.length) * 100)
                  return (
                    <div key={cat} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: s.color, fontWeight: 600, letterSpacing: '0.04em' }}>{cat}</span>
                        <span style={{ fontSize: '11px', color: textMuted }}>{count}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: line, borderRadius: '2px' }}>
                        <div style={{ height: '4px', width: `${pct}%`, backgroundColor: s.color, borderRadius: '2px', opacity: 0.6, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ height: '1px', backgroundColor: line, marginBottom: '24px' }} />

            {/* Priority legend */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginBottom: '10px' }}>Priority</div>
              {([1, 2, 3] as const).map(p => {
                const pc = dark ? PRIORITY_CONFIG[p].darkColor : PRIORITY_CONFIG[p].color
                const count = sortedPending.filter(t => (t.priority ?? 2) === p).length
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}><circle cx="5" cy="5" r="4" fill={p === 3 ? 'none' : pc} stroke={pc} strokeWidth="1.5" /></svg>
                    <span style={{ fontSize: '11px', color: textMuted, flex: 1 }}>{PRIORITY_CONFIG[p].label}</span>
                    <span style={{ fontSize: '11px', color: textMuted }}>{count}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '32px' }}>
              <SidebarScribbles />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: '1px', backgroundColor: line, marginBottom: '32px', opacity: 0.7 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
