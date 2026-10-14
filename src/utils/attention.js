export const attentionTone = (p) => (p >= 70 ? 'good' : p >= 40 ? 'fair' : 'low')
export const attentionWord = (p) => (p >= 70 ? 'Focused' : p >= 40 ? 'Drifting' : 'Low')
