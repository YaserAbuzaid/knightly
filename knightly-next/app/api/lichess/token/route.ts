// app/api/lichess/token/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { code, codeVerifier } = await req.json()
  const clientId = process.env.LICHESS_CLIENT_ID!
  const redirectUri = process.env.LICHESS_REDIRECT_URI!

  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('code', code)
  params.append('code_verifier', codeVerifier)
  params.append('redirect_uri', redirectUri)
  params.append('client_id', clientId)

  try {
    const tokenRes = await fetch('https://lichess.org/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return NextResponse.json({ error: errText }, { status: tokenRes.status })
    }

    const data = await tokenRes.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 })
  }
}
