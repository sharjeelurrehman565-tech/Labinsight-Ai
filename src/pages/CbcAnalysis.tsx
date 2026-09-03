import { useState, FormEvent, useRef, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CBC_FIELDS } from '../data/cbcFields'
import { classifyResult, ClassificationResult } from '../engine/cbcClassifier'
import { detectCbcPatterns, DetectedPattern } from '../engine/cbcPatterns'
import { buildPatternEvidence, PatternEvidence } from '../engine/cbcEvidence'
import './CbcAnalysis.css'

interface FormValues {
  age: string
  sex: string
  [key: string]: string
}

interface FormErrors {
  age?: string
  sex?: string
  [key: string]: string | undefined
}

function buildInitialValues(): FormValues {
  const base: FormValues = { age: '', sex: '' }
  CBC_FIELDS.forEach((f) => {
    base[f.key] = ''
  })
  return base
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  const ageNum = Number(values.age)
  if (values.age.trim() === '') {
    errors.age = 'Age is required.'
  } else if (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 120) {
    errors.age = 'Enter a valid age between 1 and 120.'
  }

  if (!values.sex) {
    errors.sex = 'Sex is required.'
  }

  CBC_FIELDS.forEach((field) => {
    const raw = values[field.key].trim()
    if (raw === '') return
    const num = Number(raw)
    if (!Number.isFinite(num) || isNaN(num)) {
      errors[field.key] = 'Must be a number.'
    } else if (num < field.min) {
      errors[field.key] = 'Value cannot be negative.'
    }
  })

  return errors
}

function hasRequiredFields(values: FormValues, errors: FormErrors): boolean {
  if (values.age.trim() === '' || values.sex === '') return false
  if (Object.keys(errors).length > 0) return false
  const anyCbc = CBC_FIELDS.some((f) => values[f.key].trim() !== '')
  return anyCbc
}

function runAnalysis(values: FormValues): ClassificationResult[] {
  return CBC_FIELDS.flatMap((field) => {
    const raw = values[field.key].trim()
    if (raw === '') return []
    const value = Number(raw)
    return [
      {
        key: field.key,
        label: field.label,
        value,
        unit: field.unit,
        refDisplay: field.refDisplay,
        classification: classifyResult(value, field.refMin, field.refMax),
      },
    ]
  })
}

const STATUS_LABEL: Record<string, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
}

const AI_EXPLANATION_URL = 'http://localhost:3001/api/health-explanation'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let lastIndex = 0
  let key = 0
  let match = pattern.exec(text)
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>)
    } else {
      parts.push(<em key={key++}>{match[2]}</em>)
    }
    lastIndex = pattern.lastIndex
    match = pattern.exec(text)
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

/**
 * Minimal markdown renderer for AI explanations: headings (#–######),
 * unordered/ordered lists, paragraphs, and **bold** / *italic* inline marks.
 * Renders React elements only — never HTML strings.
 */
function MarkdownExplanation({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.split('\n')
  let listType: 'ul' | 'ol' | null = null
  let listItems: ReactNode[] = []
  let paragraphLines: string[] = []
  let key = 0

  function flushParagraph() {
    if (paragraphLines.length === 0) return
    blocks.push(<p key={key++}>{renderInline(paragraphLines.join(' '))}</p>)
    paragraphLines = []
  }

  function flushList() {
    if (listType === null || listItems.length === 0) return
    if (listType === 'ul') {
      blocks.push(<ul key={key++}>{listItems}</ul>)
    } else {
      blocks.push(<ol key={key++}>{listItems}</ol>)
    }
    listItems = []
    listType = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') {
      flushParagraph()
      flushList()
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push(<h3 key={key++}>{renderInline(heading[2])}</h3>)
      continue
    }

    const ulItem = /^[-*]\s+(.*)$/.exec(line)
    if (ulItem) {
      flushParagraph()
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(<li key={key++}>{renderInline(ulItem[1])}</li>)
      continue
    }

    const olItem = /^\d+[.)]\s+(.*)$/.exec(line)
    if (olItem) {
      flushParagraph()
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(<li key={key++}>{renderInline(olItem[1])}</li>)
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return <div className="ai-md">{blocks}</div>
}

export default function CbcAnalysis() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(buildInitialValues)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<ClassificationResult[] | null>(null)
  const [patterns, setPatterns] = useState<DetectedPattern[] | null>(null)
  const [patternEvidence, setPatternEvidence] = useState<PatternEvidence[] | null>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const errors = validate(values)
  const canSubmit = hasRequiredFields(values, errors)

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setTouched((prev) => ({ ...prev, [key]: true }))
    // Clear previous results when the form changes
    setResults(null)
    setPatterns(null)
    setPatternEvidence(null)
    setAiExplanation(null)
    setAiError(null)
  }

  function handleBlur(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  function showError(key: string): string | undefined {
    return touched[key] || submitted ? errors[key] : undefined
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!canSubmit) return
    const analysisResults = runAnalysis(values)
    setResults(analysisResults)
    const detectedPatterns = detectCbcPatterns(analysisResults)
    setPatterns(detectedPatterns)
    setPatternEvidence(buildPatternEvidence(analysisResults, detectedPatterns))
    // Scroll to results after render
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  async function handleGenerateExplanation() {
    if (!results || !patterns || !patternEvidence || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setAiExplanation(null)
    try {
      const response = await fetch(AI_EXPLANATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: results,
          patterns: patterns,
          evidence: patternEvidence,
        }),
      })
      const data = await response.json()
      if (!response.ok || data.success !== true || typeof data.explanation !== 'string') {
        throw new Error('Explanation request failed.')
      }
      setAiExplanation(data.explanation)
    } catch {
      setAiError(
        'Sorry, the AI explanation could not be generated right now. ' +
          'Please check that the backend is running, then try again.',
      )
    } finally {
      setAiLoading(false)
    }
  }

  const outsideCount = results
    ? results.filter((r) => r.classification !== 'NORMAL').length
    : 0

  return (
    <div className="cbc-page">
      <nav className="cbc-nav">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <span className="cbc-nav-title">LabInsight AI</span>
      </nav>

      <main className="cbc-main">
        <div className="cbc-header">
          <h1>CBC Analysis</h1>
          <p className="cbc-subtitle">
            Enter your Complete Blood Count results below.
          </p>
        </div>

        <form className="cbc-form" onSubmit={handleSubmit} noValidate>
          {/* Patient Information */}
          <section className="form-section">
            <h2 className="section-title">Patient Information</h2>
            <div className="patient-grid">
              <div className={`form-group ${showError('age') ? 'has-error' : ''}`}>
                <label htmlFor="age">Patient Age</label>
                <input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  placeholder="e.g. 35"
                  value={values.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  onBlur={() => handleBlur('age')}
                />
                {showError('age') && (
                  <span className="error-msg">{showError('age')}</span>
                )}
              </div>

              <div className={`form-group ${showError('sex') ? 'has-error' : ''}`}>
                <label htmlFor="sex">Patient Sex</label>
                <select
                  id="sex"
                  value={values.sex}
                  onChange={(e) => handleChange('sex', e.target.value)}
                  onBlur={() => handleBlur('sex')}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
                {showError('sex') && (
                  <span className="error-msg">{showError('sex')}</span>
                )}
              </div>
            </div>
          </section>

          {/* CBC Results */}
          <section className="form-section">
            <h2 className="section-title">CBC Laboratory Results</h2>
            <p className="section-note">
              Enter available values. Leave fields blank if the result was not
              measured. At least one value is required to analyze.
            </p>

            <div className="ref-range-notice">
              <strong>Demonstration Reference Ranges</strong> — These ranges are
              provided for demonstration purposes only and do not represent
              universal reference ranges for every laboratory or every patient.
            </div>

            <div className="cbc-table-header">
              <span>Test</span>
              <span>Result</span>
              <span>Unit</span>
              <span>Demo Reference Range</span>
            </div>

            {CBC_FIELDS.map((field) => (
              <div
                key={field.key}
                className={`cbc-row ${showError(field.key) ? 'has-error' : ''}`}
              >
                <span className="cbc-label">{field.label}</span>
                <div className="cbc-input-wrap">
                  <input
                    id={field.key}
                    type="number"
                    min={field.min}
                    step={field.step}
                    placeholder="—"
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onBlur={() => handleBlur(field.key)}
                    aria-label={`${field.label} result`}
                  />
                  {showError(field.key) && (
                    <span className="error-msg">{showError(field.key)}</span>
                  )}
                </div>
                <span className="cbc-unit">{field.unit}</span>
                <span className="cbc-ref">{field.refDisplay}</span>
              </div>
            ))}
          </section>

          {/* Submit */}
          <div className="form-actions">
            {submitted && !canSubmit && (
              <p className="submit-error">
                Please fill in patient age, sex, and at least one CBC result
                before analyzing.
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitted && !canSubmit}
            >
              Analyze Results
            </button>
          </div>
        </form>

        {/* ---- Analysis Results ---- */}
        {results && (
          <section className="results-section" ref={resultsRef} aria-live="polite">
            <h2 className="results-title">Analysis Results</h2>

            <div className="results-disclaimer">
              Results are compared against <strong>demonstration reference ranges</strong> only.
              This is not a medical diagnosis. Consult a qualified healthcare professional
              for interpretation of your laboratory results.
            </div>

            {/* Summary */}
            <div className={`results-summary ${outsideCount > 0 ? 'summary-flag' : 'summary-ok'}`}>
              {outsideCount === 0
                ? `All ${results.length} entered CBC result${results.length === 1 ? '' : 's'} are within the demonstration reference ranges.`
                : `${outsideCount} of ${results.length} entered CBC result${results.length === 1 ? '' : 's'} ${outsideCount === 1 ? 'is' : 'are'} outside the demonstration reference ranges.`}
            </div>

            {/* Results table */}
            <div className="results-table" role="table" aria-label="CBC classification results">
              <div className="results-table-header" role="row">
                <span role="columnheader">Test</span>
                <span role="columnheader">Result</span>
                <span role="columnheader">Unit</span>
                <span role="columnheader">Reference Range</span>
                <span role="columnheader">Status</span>
              </div>
              {results.map((r) => (
                <div
                  key={r.key}
                  className={`results-row status-${r.classification.toLowerCase()}`}
                  role="row"
                >
                  <span className="res-label" role="cell">{r.label}</span>
                  <span className="res-value" role="cell">{r.value}</span>
                  <span className="res-unit" role="cell">{r.unit}</span>
                  <span className="res-ref" role="cell">{r.refDisplay}</span>
                  <span className="res-status" role="cell">
                    <span className={`status-badge status-badge--${r.classification.toLowerCase()}`} aria-label={STATUS_LABEL[r.classification]}>
                      {STATUS_LABEL[r.classification]}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Pattern Analysis ---- */}
        {patterns && (
          <section className="pattern-section" aria-live="polite">
            <h2 className="pattern-title">CBC Pattern Analysis</h2>
            <p className="pattern-note">
              Patterns are detected using deterministic rules applied to the
              demonstration reference ranges. This is not a medical diagnosis.
            </p>

            {patterns.length === 0 ? (
              <div className="pattern-none">
                <p className="pattern-none-title">
                  No predefined CBC pattern detected from the entered results.
                </p>
                <p className="pattern-none-detail">
                  No predefined pattern rules were satisfied by the entered CBC results.
                </p>
              </div>
            ) : (
              <div className="pattern-list">
                {patternEvidence?.map((pe) => (
                  <div key={pe.patternName} className="pattern-card">
                    <div className="pattern-card-header">
                      <span className="pattern-icon" aria-hidden="true">◈</span>
                      <span className="pattern-name">{pe.patternName}</span>
                    </div>

                    <div className="pattern-why-label">Why was this pattern detected?</div>
                    <ul className="pattern-evidence-list">
                      {pe.evidence.map((ev) => (
                        <li key={ev.label} className={`evidence-item evidence-item--${ev.classification.toLowerCase()}`}>
                          <strong>{ev.label}</strong>: {ev.value} {ev.unit}
                          {' — '}
                          <span className="evidence-status">{ev.classification}</span>
                          {' — Reference range: '}{ev.refDisplay} {ev.unit}
                        </li>
                      ))}
                    </ul>

                    <div className="pattern-explanation">
                      {pe.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- AI Health Explanation ---- */}
        {results && (
          <section className="ai-section" aria-live="polite">
            <h2 className="ai-title">AI Health Explanation</h2>
            <p className="ai-note">
              Request a plain-language summary of your analysis, generated by AI
              from the deterministic results above. This is for demonstration
              purposes only and is not a medical diagnosis.
            </p>

            <div className="ai-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleGenerateExplanation}
                disabled={aiLoading}
              >
                Generate AI Explanation
              </button>
            </div>

            {aiLoading && (
              <div className="ai-loading">
                <span className="ai-spinner" aria-hidden="true"></span>
                <span>Generating your explanation…</span>
              </div>
            )}

            {aiError && (
              <div className="ai-error" role="alert">
                {aiError}
              </div>
            )}

            {aiExplanation && (
              <div className="ai-card">
                <div className="ai-card-header">
                  <span className="ai-card-icon" aria-hidden="true">✦</span>
                  <span className="ai-card-title">Your AI Health Explanation</span>
                </div>
                <MarkdownExplanation text={aiExplanation} />
                <p className="ai-card-disclaimer">
                  This explanation was generated by AI from your deterministic
                  analysis and is not a medical diagnosis. Consult a qualified
                  healthcare professional for interpretation of your laboratory
                  results.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
