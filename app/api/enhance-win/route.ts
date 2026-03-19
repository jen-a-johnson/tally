import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  const { title } = await req.json()

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `You are helping a professional reframe a completed task as a polished achievement statement.

Task: "${title}"

Rewrite it as a single, confident, professional achievement statement — the kind you'd put in a performance review or LinkedIn update. Be specific and outcome-oriented. Keep it under 20 words. No bullet points, no quotes, just the statement.`
    }]
  })

  const statement = message.content[0].type === 'text' ? message.content[0].text.trim() : title
  return NextResponse.json({ statement })
}
