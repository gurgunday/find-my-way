'use strict'

// node --expose-gc benchmark/registration.js [route counts...]
// Set ROUTER_PATH to an absolute path to benchmark another checkout.
const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')
const Router = require(process.env.ROUTER_PATH || '..')

const counts = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [100, 1000, 10000]
const handler = () => {}

for (const count of counts) {
  assert(Number.isSafeInteger(count) && count > 0, 'Route counts must be positive integers')

  for (const type of ['static', 'parametric']) {
    const paths = Array.from({ length: count }, (_, i) => {
      const label = Math.imul(i + 1, 2654435761).toString(36).replace('-', 'z')
      return '/api/' + label + '/resources' + (type === 'parametric' ? '/:id/details' : '')
    })
    const samples = []

    for (let run = 0; run < 5; run++) {
      if (global.gc) global.gc()
      const start = performance.now()
      const router = Router()
      for (const route of paths) router.on('GET', route, handler)
      samples.push(performance.now() - start)

      assert.equal(router.routes.length, count)
      assert.equal(router.find('GET', paths[count - 1].replace(':id', 'value')).handler, handler)
    }

    const medianMs = samples.slice().sort((a, b) => a - b)[2]
    console.log(JSON.stringify({ type, count, medianMs, samples }))
  }
}
