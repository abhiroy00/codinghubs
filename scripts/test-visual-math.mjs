import assert from 'node:assert/strict'
import { attention, cosine, descent, dot, softmax } from '../frontend/src/learning/visual-math.ts'

assert.equal(dot([1, 2], [3, 4]), 11)
assert.equal(cosine([1, 0], [0, 1]), 0)
assert.equal(cosine([1, 0], [-1, 0]), -1)
assert.equal(cosine([0, 0], [1, 0]), null)
assert.throws(() => dot([1], [1, 2]))
assert.throws(() => softmax([Infinity]))
assert.deepEqual(softmax([1000, 1000]), [.5, .5])
// Equal logits must reproduce the arithmetic mean of the value vectors.
const uniform = attention([0, 0], [[1, 0], [0, 1], [1, 1]], [[3, 0], [0, 6], [0, 0]])
assert.deepEqual(uniform.weights, [1 / 3, 1 / 3, 1 / 3])
assert.deepEqual(uniform.output, [1, 2])
const single = attention([1, 1], [[2, 3]], [[7, 9, 11]])
assert.deepEqual(single.output, [7, 9, 11])
assert.throws(() => attention([1], [[1]], [[1], [2]]))
assert.throws(() => attention([1], [[1], [1]], [[1], [1, 2]]))
// Independent closed form for a quadratic, including oscillation/divergence.
for (const rate of [0, .1, .5, .75, 1, 1.1]) {
  const values = descent(3, rate, 12)
  for (let i = 0; i < values.length; i++) assert.ok(Math.abs(values[i] - 3 * (1 - 2 * rate) ** i) < 1e-8)
}
assert.equal(descent(3, .5, 1)[1], 0)
assert.ok(Math.abs(descent(3, 1.1, 12)[12]) > 3)
console.log('Visual mathematics passed: dimensions, zero vectors, stable softmax, independent attention outputs and closed-form gradient paths.')
