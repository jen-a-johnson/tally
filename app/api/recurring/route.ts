import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

function getToken(req: Request) {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
}

export async function GET(req: Request) {
  const sb = getSupabase(getToken(req))
  const { data, error } = await sb
    .from('recurring_tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const sb = getSupabase(getToken(req))
  const { title, frequency, days_of_week, priority } = await req.json()

  if (!title?.trim() || !frequency) {
    return NextResponse.json({ error: 'title and frequency required' }, { status: 400 })
  }

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('recurring_tasks')
    .insert([{
      user_id: user.id,
      title: title.trim(),
      frequency,
      days_of_week: frequency === 'weekly' ? (days_of_week || []) : [],
      priority: priority ?? 2,
    }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const sb = getSupabase(getToken(req))
  const { id } = await req.json()

  // Get the template title before deleting so we can clean up spawned tasks
  const { data: template } = await sb.from('recurring_tasks').select('title').eq('id', id).single()
  const { error } = await sb.from('recurring_tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove all pending (uncompleted) tasks with the same title
  let cleaned = 0
  if (template?.title) {
    const { data: spawned } = await sb
      .from('tasks')
      .select('id')
      .eq('title', template.title)
      .eq('completed', false)
    if (spawned && spawned.length > 0) {
      const ids = spawned.map(t => t.id)
      await sb.from('tasks').delete().in('id', ids)
      cleaned = ids.length
    }
  }

  return NextResponse.json({ success: true, cleaned })
}

// PATCH to spawn today's recurring tasks
export async function PATCH(req: Request) {
  const sb = getSupabase(getToken(req))
  const { date } = await req.json()
  const today = date || new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date(today + 'T12:00:00').getDay()

  // Get all recurring templates
  const { data: templates, error: tErr } = await sb
    .from('recurring_tasks')
    .select('*')
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
  if (!templates || templates.length === 0) return NextResponse.json({ spawned: 0 })

  // Get today's existing task titles to avoid duplicates
  const { data: existing } = await sb
    .from('tasks')
    .select('title')
    .eq('completed', false)
    .or(`due_date.eq.${today},due_date.is.null`)

  const existingTitles = new Set((existing ?? []).map(t => t.title))

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const toSpawn = templates.filter(t => {
    if (existingTitles.has(t.title)) return false
    if (t.frequency === 'daily') return isWeekday
    if (t.frequency === 'weekly') return (t.days_of_week ?? []).includes(dayOfWeek)
    return false
  })

  if (toSpawn.length === 0) return NextResponse.json({ spawned: 0 })

  const rows = toSpawn.map(t => ({
    title: t.title,
    completed: false,
    due_date: today,
    priority: t.priority ?? 2,
  }))

  const { error: iErr } = await sb.from('tasks').insert(rows)
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

  return NextResponse.json({ spawned: toSpawn.length })
}
