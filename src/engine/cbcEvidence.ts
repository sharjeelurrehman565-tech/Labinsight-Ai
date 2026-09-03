import { ClassificationResult } from './cbcClassifier'
import { DetectedPattern } from './cbcPatterns'

/**
 * Evidence layer — provides structured, explainable evidence for each
 * detected pattern. Does NOT re-classify values; uses the classifications
 * already produced by Step 2.
 */

export interface EvidenceItem {
  label: string
  value: number
  unit: string
  refDisplay: string
  classification: 'LOW' | 'HIGH'
}

export interface PatternEvidence {
  patternName: string
  evidence: EvidenceItem[]
  explanation: string
}

const EXPLANATIONS: Record<string, string> = {
  'Microcytic / hypochromic CBC pattern':
    'This pattern is based on the combination of lower-than-reference hemoglobin, MCV, and MCH values.',
  'Macrocytic CBC pattern':
    'This pattern is based on a lower-than-reference hemoglobin value together with a higher-than-reference MCV value.',
  'Elevated white blood cell count pattern':
    'This pattern is based on a WBC value above the demonstration reference range.',
  'Low platelet count pattern':
    'This pattern is based on a platelet count below the demonstration reference range.',
  'Elevated platelet count pattern':
    'This pattern is based on a platelet count above the demonstration reference range.',
}

/**
 * Builds structured evidence for each detected pattern by looking up the
 * involved CBC fields' classification results.
 */
export function buildPatternEvidence(
  results: ClassificationResult[],
  patterns: DetectedPattern[],
): PatternEvidence[] {
  return patterns.map((pattern) => {
    const evidence: EvidenceItem[] = pattern.involvedKeys.flatMap((key) => {
      const result = results.find((r) => r.key === key)
      if (!result) return []
      if (result.classification !== 'LOW' && result.classification !== 'HIGH') return []
      return [
        {
          label: result.label,
          value: result.value,
          unit: result.unit,
          refDisplay: result.refDisplay,
          classification: result.classification,
        },
      ]
    })

    return {
      patternName: pattern.name,
      evidence,
      explanation: EXPLANATIONS[pattern.name] ?? '',
    }
  })
}
