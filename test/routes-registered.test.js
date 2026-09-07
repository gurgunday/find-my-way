'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

function initializeRoutes (router, handler, quantity) {
  for (const x of Array(quantity).keys()) {
    router.on('GET', '/test-route-' + x, handler)
  }
  return router
}

test('verify routes registered', t => {
  const assertPerTest = 5
  const quantity = 5
  // 1 (check length) + quantity of routes * quantity of tests per route
  t.plan(1 + (quantity * assertPerTest))

  let findMyWay = FindMyWay()
  const defaultHandler = (req, res, params) => res.end(JSON.stringify({ hello: 'world' }))

  findMyWay = initializeRoutes(findMyWay, defaultHandler, quantity)
  t.assert.equal(findMyWay.routes.length, quantity)
  findMyWay.routes.forEach((route, idx) => {
    t.assert.equal(route.method, 'GET')
    t.assert.equal(route.path, '/test-route-' + idx)
    t.assert.deepStrictEqual(route.opts, {})
    t.assert.equal(route.handler, defaultHandler)
    t.assert.equal(route.store, undefined)
  })
})

test('verify routes registered and deregister', t => {
  // 1 (check length) + quantity of routes * quantity of tests per route
  t.plan(2)

  let findMyWay = FindMyWay()
  const quantity = 2
  const defaultHandler = (req, res, params) => res.end(JSON.stringify({ hello: 'world' }))

  findMyWay = initializeRoutes(findMyWay, defaultHandler, quantity)
  t.assert.equal(findMyWay.routes.length, quantity)
  findMyWay.off('GET', '/test-route-0')
  t.assert.equal(findMyWay.routes.length, quantity - 1)
})

test('re-register a constrained route after removing it', t => {
  t.plan(5)
  const router = FindMyWay()
  const original = () => {}
  const replacement = () => {}
  const constraints = { host: 'example.com', version: '1.0.0' }

  router.on('GET', '/users/:id', original)
  router.on(['GET', 'POST'], '/users/:id', { constraints }, original)
  router.off('GET', '/users/:id', constraints)
  router.on('GET', '/users/:name', { constraints }, replacement)

  const match = router.find('GET', '/users/alice', constraints)
  t.assert.equal(match.handler, replacement)
  t.assert.equal(match.params.name, 'alice')
  t.assert.equal(router.find('GET', '/users/alice').handler, original)
  t.assert.equal(router.find('POST', '/users/alice', constraints).handler, original)
  t.assert.throws(() => router.on('GET', '/users/:other', {
    constraints: { version: '1.0.0', host: 'example.com' }
  }, original), /already declared/)
})

test('duplicate detection survives adding a constraint strategy', t => {
  t.plan(3)
  const router = FindMyWay()
  const original = () => {}
  const constrained = () => {}

  router.on('GET', '/users/:id', original)
  router.addConstraintStrategy({
    name: 'region',
    storage: () => new Map(),
    deriveConstraint: req => req.headers.region
  })

  t.assert.throws(() => router.on('GET', '/users/:name', original), /already declared/)
  router.on('GET', '/users/:name', { constraints: { region: 'eu' } }, constrained)
  t.assert.equal(router.find('GET', '/users/alice').handler, original)
  t.assert.equal(router.find('GET', '/users/alice', { region: 'eu' }).handler, constrained)
})
