export interface CbcField {
  key: string
  label: string
  unit: string
  refMin: number
  refMax: number
  refDisplay: string
  step: string
  min: number
}

export const CBC_FIELDS: CbcField[] = [
  {
    key: 'hemoglobin',
    label: 'Hemoglobin',
    unit: 'g/dL',
    refMin: 12,
    refMax: 16,
    refDisplay: '12 – 16',
    step: '0.1',
    min: 0,
  },
  {
    key: 'wbc',
    label: 'WBC',
    unit: '×10⁹/L',
    refMin: 4,
    refMax: 11,
    refDisplay: '4 – 11',
    step: '0.1',
    min: 0,
  },
  {
    key: 'rbc',
    label: 'RBC',
    unit: '×10¹²/L',
    refMin: 4.0,
    refMax: 5.5,
    refDisplay: '4.0 – 5.5',
    step: '0.01',
    min: 0,
  },
  {
    key: 'platelets',
    label: 'Platelets',
    unit: '×10⁹/L',
    refMin: 150,
    refMax: 450,
    refDisplay: '150 – 450',
    step: '1',
    min: 0,
  },
  {
    key: 'mcv',
    label: 'MCV',
    unit: 'fL',
    refMin: 80,
    refMax: 100,
    refDisplay: '80 – 100',
    step: '0.1',
    min: 0,
  },
  {
    key: 'mch',
    label: 'MCH',
    unit: 'pg',
    refMin: 27,
    refMax: 33,
    refDisplay: '27 – 33',
    step: '0.1',
    min: 0,
  },
  {
    key: 'mchc',
    label: 'MCHC',
    unit: 'g/dL',
    refMin: 32,
    refMax: 36,
    refDisplay: '32 – 36',
    step: '0.1',
    min: 0,
  },
  {
    key: 'rdw',
    label: 'RDW',
    unit: '%',
    refMin: 11.5,
    refMax: 14.5,
    refDisplay: '11.5 – 14.5',
    step: '0.1',
    min: 0,
  },
]
