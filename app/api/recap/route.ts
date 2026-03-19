import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  const { wins } = await req.json()

  if (!wins || wins.length === 0) {
    return NextResponse.json({ recap: 'No wins yet — complete some tasks to generate your recap.' })
  }

  // Group wins by category
  const grouped: Record<string, string[]> = {}
  for (const w of wins) {
    const cat = w.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(w.statement || w.title)
  }

  const sections = Object.entries(grouped)
    .map(([cat, items]) => `${cat}:\n${items.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are helping someone summarize their recent accomplishments for a performance review or status update.

Here are their wins, grouped by category:
${sections}

Write a confident, polished performance summary. Use the category names as section headers (bold with **Category**). For each category with wins, write 2–3 sentences tying those wins into a narrative. Professional and warm tone — suitable for a performance review or LinkedIn.`
    }]
  })

  const recap = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return NextResponse.json({ recap })
}
