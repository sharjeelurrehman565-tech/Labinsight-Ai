export type Classification = 'LOW' | 'NORMAL' | 'HIGH'

export interface ClassificationResult {
  key: string
  label: string
  value: number
  unit: string
  refDisplay: string
  classification: Classification
}

/**
 * Classifies a single numeric result against a reference range.
 * Boundary values (equal to refMin or refMax) are NORMAL.
 */
export function classifyResult(
  value: number,
  refMin: number,
  refMax: number,
): Classification {
  if (value < refMin) return 'LOW'
  if (value > refMax) return 'HIGH'
  return 'NORMAL'
}
