export const LABELS = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'] as const

export type Label = (typeof LABELS)[number]

export const LABEL_NAME: Record<Label, string> = {
  toxic: 'Toxic',
  severe_toxic: 'Severe toxic',
  obscene: 'Obscene',
  threat: 'Threat',
  insult: 'Insult',
  identity_hate: 'Identity hate',
}

export const labelColor = (label: Label | 'none') => `var(--l-${label})`
