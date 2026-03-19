import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  const { wins } = await req.json()

  if (!wins || wins.length === 0) {
    return NextResponse.json({ recap: 'No wins yet — complete some tasks to generate your recap.' })
  }

  const winList = wins.map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are helping a professional summarize their recent accomplishments.

Here are their completed wins:
${winList}

Write a short, confident performance summary (3–5 sentences) that ties these wins together into a cohesive narrative. Suitable for a performance review, a standup, or a LinkedIn post. Warm but professional tone.`
    }]
  })

  const recap = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return NextResponse.json({ recap })
}
