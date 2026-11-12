export function dot(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || [...a, ...b].some(x => !Number.isFinite(x))) throw new Error('Finite vectors of equal positive dimension required')
  return a.reduce((n, x, i) => n + x * b[i], 0)
}
export function cosine(a: number[], b: number[]): number | null {
  const norm = Math.sqrt(dot(a, a) * dot(b, b))
  return norm ? Math.max(-1, Math.min(1, dot(a, b) / norm)) : null
}
export function softmax(values: number[]): number[] {
  if (!values.length || values.some(x => !Number.isFinite(x))) throw new Error('Finite scores required')
  const max = Math.max(...values)
  const exp = values.map(x => Math.exp(x - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  return exp.map(x => x / sum)
}
export function attention(query: number[], keys: number[][], values: number[][]) {
  if (!keys.length || keys.length !== values.length || !values[0]?.length || values.some(v => v.length !== values[0].length || v.some(x => !Number.isFinite(x)))) throw new Error('Key/value row counts and value dimensions must match')
  const scores = keys.map(key => dot(query, key) / Math.sqrt(query.length))
  const weights = softmax(scores)
  return { scores, weights, output: values[0].map((_, j) => values.reduce((n, row, i) => n + weights[i] * row[j], 0)) }
}
export function descent(start: number, rate: number, steps: number): number[] {
  if (![start, rate, steps].every(Number.isFinite) || rate < 0 || !Number.isInteger(steps) || steps < 0 || steps > 1000) throw new Error('Invalid optimization parameters')
  const path = [start]
  for (let i = 0; i < steps; i++) path.push(path[i] - rate * 2 * path[i])
  return path
}
