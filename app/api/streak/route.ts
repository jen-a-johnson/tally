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

  // Fetch all completion dates (just the date part, deduplicated)
  const { data, error } = await sb
    .from('tasks')
    .select('completed_at')
    .eq('completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build a set of unique dates (YYYY-MM-DD) that have completions
  const activeDates = new Set<string>()
  for (const row of data ?? []) {
    if (row.completed_at) {
      activeDates.add(row.completed_at.split('T')[0])
    }
  }

  // Calculate current streak: consecutive days ending today (or yesterday)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function dateKey(d: Date) {
    return d.toISOString().split('T')[0]
  }

  let currentStreak = 0
  const cursor = new Date(today)

  // Allow streak to start from today or yesterday
  if (!activeDates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (activeDates.has(dateKey(cursor))) {
    currentStreak++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Calculate longest streak
  const sortedDates = Array.from(activeDates).sort()
  let longestStreak = 0
  let run = 0
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00')
      const curr = new Date(sortedDates[i] + 'T00:00:00')
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      run = diffDays === 1 ? run + 1 : 1
    }
    longestStreak = Math.max(longestStreak, run)
  }

  // Yesterday's wins for morning briefing
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dateKey(yesterday)

  const { data: yesterdayWins } = await sb
    .from('tasks')
    .select('win_statement, title, category')
    .eq('completed', true)
    .gte('completed_at', yesterdayKey + 'T00:00:00')
    .lt('completed_at', dateKey(today) + 'T00:00:00')
    .order('completed_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    currentStreak,
    longestStreak,
    todayActive: activeDates.has(dateKey(today)),
    yesterdayWins: (yesterdayWins ?? []).map((w: { win_statement: string | null; title: string; category: string | null }) => ({
      text: w.win_statement || w.title,
      category: w.category || 'Other',
    })),
  })
}
