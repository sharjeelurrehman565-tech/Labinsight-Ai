import { ClassificationResult } from './cbcClassifier'

export interface DetectedPattern {
  name: string
  findings: string[]
  involvedKeys: string[]
}

/**
 * Looks up the classification for a specific CBC key from the results array.
 * Returns undefined if the field was not entered (blank).
 */
function getStatus(
  results: ClassificationResult[],
  key: string,
): ClassificationResult['classification'] | undefined {
  return results.find((r) => r.key === key)?.classification
}

/**
 * Examines the already-classified CBC results and returns all matching
 * predefined patterns. A missing (blank) field can never satisfy a
 * pattern requirement.
 */
export function detectCbcPatterns(
  results: ClassificationResult[],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  const hgb = getStatus(results, 'hemoglobin')
  const wbc = getStatus(results, 'wbc')
  const mcv = getStatus(results, 'mcv')
  const mch = getStatus(results, 'mch')
  const plt = getStatus(results, 'platelets')

  // Pattern 1 — Microcytic / hypochromic
  if (hgb === 'LOW' && mcv === 'LOW' && mch === 'LOW') {
    patterns.push({
      name: 'Microcytic / hypochromic CBC pattern',
      findings: [
        'Hemoglobin is below the demonstration reference range.',
        'MCV is below the demonstration reference range.',
        'MCH is below the demonstration reference range.',
      ],
      involvedKeys: ['hemoglobin', 'mcv', 'mch'],
    })
  }

  // Pattern 2 — Macrocytic
  if (hgb === 'LOW' && mcv === 'HIGH') {
    patterns.push({
      name: 'Macrocytic CBC pattern',
      findings: [
        'Hemoglobin is below the demonstration reference range.',
        'MCV is above the demonstration reference range.',
      ],
      involvedKeys: ['hemoglobin', 'mcv'],
    })
  }

  // Pattern 3 — Leukocytosis
  if (wbc === 'HIGH') {
    patterns.push({
      name: 'Elevated white blood cell count pattern',
      findings: ['WBC is above the demonstration reference range.'],
      involvedKeys: ['wbc'],
    })
  }

  // Pattern 4 — Thrombocytopenia
  if (plt === 'LOW') {
    patterns.push({
      name: 'Low platelet count pattern',
      findings: ['Platelets are below the demonstration reference range.'],
      involvedKeys: ['platelets'],
    })
  }

  // Pattern 5 — Thrombocytosis
  if (plt === 'HIGH') {
    patterns.push({
      name: 'Elevated platelet count pattern',
      findings: ['Platelets are above the demonstration reference range.'],
      involvedKeys: ['platelets'],
    })
  }

  return patterns
}
