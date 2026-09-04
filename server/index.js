import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 3001
const systemMessage =
  'You are a laboratory-results explanation assistant for a hackathon demonstration. Explain only the laboratory findings supplied to you. Do not diagnose diseases. Do not claim that a laboratory pattern proves a disease. Do not invent laboratory values, reference ranges, symptoms, or medical history. Do not provide treatment recommendations. Use simple patient-friendly language. Clearly state that the demonstration reference ranges are not a medical diagnosis. Treat the supplied classifications, patterns, and evidence as authoritative. Do not recalculate classifications or detect new patterns.'
const invalidRequestResponse = {
  success: false,
  error: 'Invalid request data.',
}
const explanationFailureResponse = {
  success: false,
  error: 'Unable to generate AI explanation.',
}

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))

function isValidRequestData(body) {
  return (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    Array.isArray(body.results) &&
    Array.isArray(body.patterns) &&
    Array.isArray(body.evidence)
  )
}

function buildUserMessage({ results, patterns, evidence }) {
  return [
    'The following CBC data was already calculated by the deterministic LabInsight AI engine and is authoritative.',
    'Explain only this supplied data in patient-friendly language. Do not recalculate statuses, identify new patterns, diagnose a disease, recommend treatment, or infer missing information.',
    '',
    'Classified results:',
    JSON.stringify(results),
    '',
    'Detected patterns:',
    JSON.stringify(patterns),
    '',
    'Pattern evidence:',
    JSON.stringify(evidence),
  ].join('\n')
}

app.get('/api/status', (req, res) => {
  res.json({ configured: Boolean(process.env.DASHSCOPE_API_KEY) })
})

app.post('/api/health-explanation', async (req, res) => {
  if (!isValidRequestData(req.body)) {
    res.status(400).json(invalidRequestResponse)
    return
  }

  const apiKey = process.env.DASHSCOPE_API_KEY
  const baseUrl = process.env.DASHSCOPE_BASE_URL?.replace(/\/+$/, '')
  const model = process.env.DASHSCOPE_MODEL || 'qwen3.7-plus'

  if (!apiKey || !baseUrl) {
    res.status(503).json(explanationFailureResponse)
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: buildUserMessage(req.body) },
        ],
        temperature: 0.2,
        enable_thinking: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      res.status(502).json(explanationFailureResponse)
      return
    }

    const responseBody = await response.json()
    const explanation = responseBody?.choices?.[0]?.message?.content

    if (typeof explanation !== 'string' || explanation.trim() === '') {
      res.status(502).json(explanationFailureResponse)
      return
    }

    res.json({ success: true, explanation: explanation.trim() })
  } catch {
    res.status(502).json(explanationFailureResponse)
  } finally {
    clearTimeout(timeout)
  }
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return
  }

  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    res.status(400).json(invalidRequestResponse)
    return
  }

  res.status(500).json(explanationFailureResponse)
})
app.use(express.static('dist'))

app.get('/', (req, res) => {
  res.sendFile('dist/index.html', { root: process.cwd() })
})
app.listen(port, () => {
  console.log(`LabInsight AI backend running on http://localhost:${port}`)
})
