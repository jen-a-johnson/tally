import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  const { title } = await req.json()

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Given this completed task, do two things:
1. Rewrite it as a short, simple win. Keep it casual and human — like you're telling a friend what you got done. No corporate language, no buzzwords. Under 15 words.
2. Pick the best category from this exact list: Work, Personal, Home, Health, Learning, Other

Task: "${title}"

Respond with valid JSON only, no explanation:
{"statement": "...", "category": "..."}`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json({
      statement: parsed.statement || title,
      category: parsed.category || 'Other',
    })
  } catch {
    return NextResponse.json({ statement: title, category: 'Other' })
  }
}
