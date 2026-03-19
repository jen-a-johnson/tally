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
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(500, parseInt(url.searchParams.get('limit') || '25'))
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  // Pending tasks — filtered by date (today = tasks with that date OR no date)
  if (status !== 'completed') {
    const date = url.searchParams.get('date')
    const today = new Date().toISOString().split('T')[0]
    let q = sb
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .order('priority', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (date && date !== today) {
      q = q.eq('due_date', date)
    } else {
      q = q.or(`due_date.eq.${today},due_date.is.null`)
    }
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Completed wins — paginated, optionally date-filtered
  let query = sb
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('completed', true)
    .order('completed_at', { ascending: false })

  if (from) query = query.gte('completed_at', from)
  if (to)   query = query.lte('completed_at', to)

  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    hasMore: page * limit < (count ?? 0),
  })
}

export async function POST(req: Request) {
  const sb = getSupabase(getToken(req))
  const { title, due_date } = await req.json()
  const { data, error } = await sb
    .from('tasks')
    .insert([{ title, completed: false, ...(due_date ? { due_date } : {}) }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const sb = getSupabase(getToken(req))
  const { id, completed, win_statement, category, priority } = await req.json()
  const update: Record<string, unknown> = {}
  if (completed !== undefined) update.completed = completed
  if (win_statement) {
    update.win_statement = win_statement
    update.completed_at = new Date().toISOString()
  }
  if (category)  update.category = category
  if (priority !== undefined) update.priority = priority

  const { data, error } = await sb
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const sb = getSupabase(getToken(req))
  const { id } = await req.json()
  const { error } = await sb.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
