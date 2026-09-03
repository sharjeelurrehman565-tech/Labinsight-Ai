import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-badge">AI-Powered Lab Interpretation</div>
        <h1 className="home-title">LabInsight AI</h1>
        <p className="home-tagline">Understand Your Laboratory Results</p>
        <p className="home-description">
          LabInsight AI helps users understand laboratory results through
          structured analysis and AI-assisted explanations.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/cbc')}
        >
          Analyze CBC Results
        </button>
      </header>

      <section className="home-features">
        <div className="feature-card">
          <div className="feature-icon">🔬</div>
          <h3>CBC Analysis</h3>
          <p>Enter your Complete Blood Count values and receive a structured breakdown.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Reference Ranges</h3>
          <p>Compare your results against standard demonstration reference ranges.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI Explanations</h3>
          <p>Request a plain-language explanation of your analysis results.</p>
        </div>
      </section>

      <section className="home-how">
        <h2 className="how-title">How It Works</h2>
        <ol className="how-steps">
          <li className="how-step">
            <span className="how-number" aria-hidden="true">1</span>
            <div className="how-body">
              <h3>Enter your CBC results</h3>
              <p>
                Fill in the values from your Complete Blood Count laboratory
                report. Fields you leave blank are simply skipped.
              </p>
            </div>
          </li>
          <li className="how-step">
            <span className="how-number" aria-hidden="true">2</span>
            <div className="how-body">
              <h3>Review the structured analysis</h3>
              <p>
                Each value is classified against demonstration reference
                ranges, and predefined CBC patterns are reported together with
                the exact evidence behind them.
              </p>
            </div>
          </li>
          <li className="how-step">
            <span className="how-number" aria-hidden="true">3</span>
            <div className="how-body">
              <h3>Request an AI explanation</h3>
              <p>
                Optionally generate a patient-friendly summary of your
                deterministic analysis. It explains the findings — it never
                diagnoses.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="home-footer">
        <p>
          LabInsight AI is an educational demonstration tool and does not
          provide medical advice, diagnosis, or treatment.
        </p>
      </footer>
    </div>
  )
}
