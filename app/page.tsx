'use client'
import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  completed: boolean
  win_statement: string | null
  completed_at: string | null
  created_at: string
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState<string | null>(null)
  const [recap, setRecap] = useState('')
  const [recapLoading, setRecapLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'tasks' | 'wins'>('tasks')

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
    })
    setInput('')
    await fetchTasks()
    setLoading(false)
  }

  async function completeTask(task: Task) {
    setEnhancing(task.id)
    const res = await fetch('/api/enhance-win', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: task.title }),
    })
    const { statement } = await res.json()
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, completed: true, win_statement: statement }),
    })
    await fetchTasks()
    setEnhancing(null)
    setActiveTab('wins')
  }

  async function deleteTask(id: string) {
    await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchTasks()
  }

  async function generateRecap() {
    setRecapLoading(true)
    const wins = completedTasks.map(t => t.win_statement || t.title)
    const res = await fetch('/api/recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wins }),
    })
    const { recap } = await res.json()
    setRecap(recap)
    setRecapLoading(false)
  }

  const pendingTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  const groupByDate = (tasks: Task[]) => {
    const groups: Record<string, Task[]> = {}
    tasks.forEach(t => {
      const date = new Date(t.completed_at || t.created_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(t)
    })
    return groups
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Tally</h1>
            <p className="text-xs text-stone-400 mt-0.5">Track tasks. Own your wins.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600">{completedTasks.length}</div>
            <div className="text-xs text-stone-400">wins logged</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Add task */}
        <form onSubmit={addTask} className="flex gap-3 mb-8">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-lg w-fit">
          {(['tasks', 'wins'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab === 'tasks' ? `Tasks ${pendingTasks.length > 0 ? `(${pendingTasks.length})` : ''}` : `Wins (${completedTasks.length})`}
            </button>
          ))}
        </div>

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-sm">All clear. Add something to get started.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg px-4 py-3 group">
                  <button
                    onClick={() => completeTask(task)}
                    disabled={enhancing === task.id}
                    className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-amber-500 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
                  >
                    {enhancing === task.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                  <span className="flex-1 text-sm text-stone-700">
                    {enhancing === task.id ? (
                      <span className="text-stone-400 italic">Logging your win...</span>
                    ) : task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Wins tab */}
        {activeTab === 'wins' && (
          <div>
            {completedTasks.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-sm">Complete tasks to start logging wins.</p>
              </div>
            ) : (
              <>
                {/* Generate recap */}
                <div className="mb-6">
                  <button
                    onClick={generateRecap}
                    disabled={recapLoading}
                    className="w-full py-3 border-2 border-dashed border-amber-300 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-50 disabled:opacity-50 transition-colors"
                  >
                    {recapLoading ? 'Generating recap...' : '✦ Generate Win Recap'}
                  </button>
                  {recap && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Your Recap</p>
                      <p className="text-sm text-stone-700 leading-relaxed">{recap}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(recap)}
                        className="mt-3 text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>

                {/* Grouped wins */}
                {Object.entries(groupByDate(completedTasks)).map(([date, wins]) => (
                  <div key={date} className="mb-6">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{date}</p>
                    <div className="space-y-2">
                      {wins.map(task => (
                        <div key={task.id} className="bg-white border border-stone-200 rounded-lg px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">✦</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-stone-800 font-medium leading-snug">
                                {task.win_statement || task.title}
                              </p>
                              {task.win_statement && (
                                <p className="text-xs text-stone-400 mt-1 truncate">Original: {task.title}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
