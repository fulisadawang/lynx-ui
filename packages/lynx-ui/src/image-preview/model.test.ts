// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  fitContent, clampTransform, zoomAround, createGesture, startGesture,
  moveGesture, endGesture, cancelGesture, normalizeIndex, validateDimensions,
} from './model'

const config = { width: 300, height: 600, contentWidth: 300, contentHeight: 300, maxScale: 4, doubleTapScale: 2.5, previous: true, next: true, dismiss: true }
const p = (x: number, y: number, id = 1) => ({ x, y, id })
const almost = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.000001, `${a} != ${b}`)
const swipe = (dx: number, dy: number, c = config) => {
  const s = createGesture()
  startGesture(s, [p(150, 300)], 100, c)
  moveGesture(s, [p(150 + dx, 300 + dy)], c)
  return { state: s, result: endGesture(s, [], 200, c) }
}

test('landscape content fits without stretching', () => assert.deepEqual(fitContent(300, 600, 1200, 600), { width: 300, height: 150 }))
test('portrait content fits without stretching', () => assert.deepEqual(fitContent(300, 600, 600, 1800), { width: 200, height: 600 }))
test('rejects invalid dimensions instead of emitting NaN styles', () => {
  for (const n of [0, -1, NaN, Infinity]) assert.throws(() => validateDimensions(n, 600, 4, 2.5), RangeError)
  assert.throws(() => validateDimensions(300, 600, 0.5, 2), RangeError)
})
test('base scale has no pan range', () => assert.deepEqual(clampTransform({ scale: 1, x: 200, y: -90 }, config), { scale: 1, x: 0, y: 0 }))
test('letterbox remains centered until scaled content exceeds viewport', () => assert.deepEqual(clampTransform({ scale: 2, x: 999, y: 999 }, config), { scale: 2, x: 150, y: 0 }))
test('both pan axes clamp at max scale', () => assert.deepEqual(clampTransform({ scale: 9, x: -999, y: 999 }, config), { scale: 4, x: -450, y: 300 }))
test('zoom preserves an off-center focal point', () => {
  const t = zoomAround({ scale: 1, x: 0, y: 0 }, p(75, 0), p(75, 0), 2, config)
  assert.deepEqual(t, { scale: 2, x: -75, y: 0 })
})
test('pinch midpoint translation is applied', () => {
  const c = { ...config, contentHeight: 600 }
  const t = zoomAround({ scale: 2, x: 20, y: 10 }, p(50, 50), p(70, 80), 3, c)
  almost(t.x, 25); almost(t.y, 20)
})
test('left swipe requests next', () => assert.equal(swipe(-100, 1).result.action, 'next'))
test('right swipe requests previous', () => assert.equal(swipe(100, 1).result.action, 'previous'))
test('short swipe returns to center', () => assert.equal(swipe(-20, 0).result.action, null))
test('first page cannot navigate before the start', () => assert.equal(swipe(180, 0, { ...config, previous: false }).result.action, null))
test('last page cannot navigate past the end', () => assert.equal(swipe(-180, 0, { ...config, next: false }).result.action, null))
test('downward base-scale drag dismisses', () => assert.equal(swipe(4, 160).result.action, 'dismiss'))
test('upward drag never dismisses', () => assert.equal(swipe(0, -200).result.action, null))
test('dismiss can be disabled', () => assert.equal(swipe(0, 200, { ...config, dismiss: false }).result.action, null))
test('zoomed pan never navigates or dismisses', () => {
  const s = createGesture(); s.transform = { scale: 3, x: 0, y: 0 }
  startGesture(s, [p(150, 300)], 0, config)
  moveGesture(s, [p(-100, 500)], config)
  assert.equal(s.mode, 'pan')
  assert.equal(endGesture(s, [], 100, config).action, null)
})
test('pinch doubles scale', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  moveGesture(s, [p(50, 300, 1), p(250, 300, 2)], config)
  almost(s.transform.scale, 2)
})
test('pinch tracks identifiers when touches are reordered', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  moveGesture(s, [p(250, 300, 2), p(50, 300, 1)], config)
  almost(s.transform.scale, 2)
})
test('zero-distance pinch does not divide by zero', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300, 1), p(150, 300, 2)], 0, config)
  moveGesture(s, [p(130, 300, 1), p(170, 300, 2)], config)
  assert.ok(Number.isFinite(s.transform.scale))
})
test('two-to-one transition rebases without a pan jump', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  moveGesture(s, [p(50, 300, 1), p(250, 300, 2)], config)
  endGesture(s, [p(250, 300, 2)], 80, config)
  moveGesture(s, [p(260, 300, 2)], config)
  almost(s.transform.x, 10)
  assert.equal(endGesture(s, [], 100, config).action, null)
})
test('pinching back to base never turns the remaining finger into paging', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  endGesture(s, [p(200, 300, 2)], 80, config)
  moveGesture(s, [p(0, 300, 2)], config)
  assert.equal(endGesture(s, [], 100, config).action, null)
})
test('cancelled horizontal gesture cannot navigate', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300)], 0, config)
  moveGesture(s, [p(0, 300)], config)
  cancelGesture(s)
  assert.equal(endGesture(s, [], 100, config).action, null)
  assert.equal(s.pageX, 0)
})
test('double tap zooms around the tapped point and the next double tap resets', () => {
  const s = createGesture()
  for (const time of [100, 250]) { startGesture(s, [p(200, 300)], time, config); const r = endGesture(s, [], time + 30, config); s.transform = r.target }
  almost(s.transform.scale, 2.5)
  for (const time of [1000, 1150]) { startGesture(s, [p(200, 300)], time, config); const r = endGesture(s, [], time + 30, config); s.transform = r.target }
  assert.deepEqual(s.transform, { scale: 1, x: 0, y: 0 })
})
test('distant taps are not a double tap', () => {
  const s = createGesture()
  startGesture(s, [p(20, 300)], 100, config); endGesture(s, [], 130, config)
  startGesture(s, [p(240, 300)], 200, config)
  assert.equal(endGesture(s, [], 230, config).target.scale, 1)
})
test('a long press is not a tap', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300)], 0, config); endGesture(s, [], 900, config)
  startGesture(s, [p(150, 300)], 1000, config)
  assert.equal(endGesture(s, [], 1030, config).target.scale, 1)
})
test('empty data uses a sentinel instead of a negative array access', () => assert.equal(normalizeIndex(2, 0), -1))
test('indexes clamp and nonfinite indexes reset', () => {
  assert.equal(normalizeIndex(-5, 3), 0); assert.equal(normalizeIndex(8, 3), 2)
  assert.equal(normalizeIndex(NaN, 3), 0); assert.equal(normalizeIndex(Infinity, 3), 0)
})

test('starting a new session clears interrupted page and dismiss offsets', () => {
  const s = createGesture()
  s.pageX = -35; s.dismissY = 20
  s.transform = { scale: 2, x: 30, y: 0 }
  startGesture(s, [p(150, 300)], 10, config)
  assert.equal(s.pageX, 0); assert.equal(s.dismissY, 0)
  assert.deepEqual(s.transform, { scale: 2, x: 30, y: 0 })
})
test('a third finger preserves the active pinch pair', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  startGesture(s, [p(290, 400, 3), p(100, 300, 1), p(200, 300, 2)], 20, config)
  moveGesture(s, [p(290, 400, 3), p(50, 300, 1), p(250, 300, 2)], config)
  almost(s.transform.scale, 2)
  assert.deepEqual(s.ids, [1, 2])
})
test('adding a pinch cancels an in-progress page drag', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300, 1)], 0, config)
  moveGesture(s, [p(20, 300, 1)], config)
  startGesture(s, [p(20, 300, 1), p(220, 300, 2)], 50, config)
  assert.equal(s.pageX, 0)
  assert.equal(endGesture(s, [], 100, config).action, null)
})
test('cancel clears double tap history', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300)], 100, config); endGesture(s, [], 130, config)
  cancelGesture(s)
  startGesture(s, [p(150, 300)], 200, config)
  assert.equal(endGesture(s, [], 230, config).target.scale, 1)
})
test('a horizontal session cannot change into dismiss on a diagonal move', () => {
  const s = createGesture()
  startGesture(s, [p(150, 300)], 0, config)
  moveGesture(s, [p(120, 301)], config)
  moveGesture(s, [p(110, 550)], config)
  assert.equal(s.mode, 'page')
  assert.equal(endGesture(s, [], 100, config).action, null)
})
test('scale is clamped at the configured lower and upper bounds', () => {
  const s = createGesture()
  startGesture(s, [p(100, 300, 1), p(200, 300, 2)], 0, config)
  moveGesture(s, [p(-500, 300, 1), p(800, 300, 2)], config)
  assert.equal(s.transform.scale, 4)
  moveGesture(s, [p(149, 300, 1), p(151, 300, 2)], config)
  assert.equal(s.transform.scale, 1)
})
