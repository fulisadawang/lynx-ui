// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export interface Point { x: number; y: number }
export interface Pointer extends Point { id: number }
export interface Transform { scale: number; x: number; y: number }
export interface GestureConfig {
  width: number
  height: number
  contentWidth: number
  contentHeight: number
  maxScale: number
  doubleTapScale: number
  previous: boolean
  next: boolean
  dismiss: boolean
}
export type GestureMode = 'idle' | 'pending' | 'pan' | 'pinch' | 'page' | 'dismiss'
export type GestureAction = 'previous' | 'next' | 'dismiss' | null
export interface GestureState {
  transform: Transform
  mode: GestureMode
  pageX: number
  dismissY: number
  start: Point
  anchor: Transform
  focal: Point
  distance: number
  ids: number[]
  startedAt: number
  moved: boolean
  multi: boolean
  lastTap: (Point & { time: number }) | null
}

export function validateDimensions(width: number, height: number, maxScale: number, doubleTapScale: number) {
  if (![width, height, maxScale, doubleTapScale].every(Number.isFinite)
    || width <= 0 || height <= 0 || maxScale < 1 || doubleTapScale < 1) {
    throw new RangeError('ZoomableView requires positive finite dimensions and scale limits >= 1')
  }
}

export function fitContent(width: number, height: number, naturalWidth: number, naturalHeight: number) {
  validateDimensions(width, height, 1, 1)
  validateDimensions(naturalWidth, naturalHeight, 1, 1)
  const ratio = Math.min(width / naturalWidth, height / naturalHeight)
  return { width: naturalWidth * ratio, height: naturalHeight * ratio }
}

export function clampTransform(value: Transform, config: GestureConfig): Transform {
  const scale = Math.max(1, Math.min(config.maxScale, value.scale))
  const x = Math.max(0, (config.contentWidth * scale - config.width) / 2)
  const y = Math.max(0, (config.contentHeight * scale - config.height) / 2)
  return {
    scale,
    x: x === 0 ? 0 : Math.max(-x, Math.min(x, value.x)),
    y: y === 0 ? 0 : Math.max(-y, Math.min(y, value.y)),
  }
}

// Focal points are relative to the viewport center, not the transformed child.
export function zoomAround(value: Transform, from: Point, to: Point, scale: number, config: GestureConfig): Transform {
  const nextScale = Math.max(1, Math.min(config.maxScale, scale))
  const ratio = nextScale / value.scale
  return clampTransform({
    scale: nextScale,
    x: to.x - (from.x - value.x) * ratio,
    y: to.y - (from.y - value.y) * ratio,
  }, config)
}

export function createGesture(): GestureState {
  return {
    transform: { scale: 1, x: 0, y: 0 }, mode: 'idle', pageX: 0, dismissY: 0,
    start: { x: 0, y: 0 }, anchor: { scale: 1, x: 0, y: 0 },
    focal: { x: 0, y: 0 }, distance: 0, ids: [], startedAt: 0,
    moved: false, multi: false, lastTap: null,
  }
}

function midpoint(a: Point, b: Point, c: GestureConfig): Point {
  return { x: (a.x + b.x - c.width) / 2, y: (a.y + b.y - c.height) / 2 }
}
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) }

export function startGesture(s: GestureState, points: Pointer[], time: number, c: GestureConfig) {
  if (points.length === 0) return
  if (s.mode === 'idle') {
    s.pageX = 0
    s.dismissY = 0
    s.startedAt = time
    s.moved = false
    s.multi = false
  }
  if (points.length >= 2) {
    // An extra finger must not replace the active pair or reset its anchor.
    if (s.mode === 'pinch' && s.ids.every(id => points.some(point => point.id === id))) return
    const [a, b] = points
    s.ids = [a.id, b.id]
    s.distance = distance(a, b)
    s.focal = midpoint(a, b, c)
    s.anchor = { ...s.transform }
    s.mode = 'pinch'
    s.multi = true
    s.moved = true
    s.lastTap = null
    s.pageX = 0
    s.dismissY = 0
    return
  }
  s.ids = [points[0].id]
  s.start = { x: points[0].x, y: points[0].y }
  s.anchor = { ...s.transform }
  s.mode = s.multi ? 'pan' : 'pending'
}

export function moveGesture(s: GestureState, points: Pointer[], c: GestureConfig) {
  if (s.mode === 'idle' || points.length === 0) return
  const a = points.find(point => point.id === s.ids[0])
  if (!a) { startGesture(s, points, s.startedAt, c); return }
  if (s.mode === 'pinch') {
    const b = points.find(point => point.id === s.ids[1])
    if (!b) { startGesture(s, points, s.startedAt, c); return }
    const focal = midpoint(a, b, c)
    if (s.distance < 1) {
      s.distance = distance(a, b); s.focal = focal; s.anchor = { ...s.transform }
      return
    }
    s.transform = zoomAround(s.anchor, s.focal, focal, s.anchor.scale * distance(a, b) / s.distance, c)
    return
  }
  const dx = a.x - s.start.x
  const dy = a.y - s.start.y
  if (Math.hypot(dx, dy) >= 8) s.moved = true
  if (s.mode === 'pending') {
    if (!s.moved) return
    s.mode = s.transform.scale > 1.001 || s.multi ? 'pan'
      : Math.abs(dx) > Math.abs(dy) && (c.previous || c.next) ? 'page'
      : dy > Math.abs(dx) && c.dismiss ? 'dismiss' : 'pan'
  }
  if (s.mode === 'page') {
    const canMove = dx > 0 ? c.previous : c.next
    s.pageX = Math.max(-c.width, Math.min(c.width, dx * (canMove ? 1 : 0.2)))
  } else if (s.mode === 'dismiss') {
    s.dismissY = Math.max(0, Math.min(c.height, dy))
  } else {
    s.transform = clampTransform({ ...s.anchor, x: s.anchor.x + dx, y: s.anchor.y + dy }, c)
  }
}

export function endGesture(s: GestureState, remaining: Pointer[], time: number, c: GestureConfig): { action: GestureAction; target: Transform; ended: boolean } {
  if (s.mode === 'idle') return { action: null, target: { ...s.transform }, ended: false }
  if (remaining.length > 0) {
    startGesture(s, remaining, time, c)
    return { action: null, target: { ...s.transform }, ended: false }
  }
  let action: GestureAction = null
  let target = clampTransform(s.transform, c)
  if (!s.multi && s.mode === 'page' && Math.abs(s.pageX) >= Math.min(80, c.width * 0.2)) {
    if (s.pageX < 0 && c.next) action = 'next'
    if (s.pageX > 0 && c.previous) action = 'previous'
  } else if (!s.multi && s.mode === 'dismiss' && s.dismissY >= Math.min(120, c.height * 0.18)) {
    action = 'dismiss'
  } else if (!s.multi && !s.moved && time - s.startedAt <= 250) {
    if (s.lastTap && time - s.lastTap.time <= 280 && distance(s.start, s.lastTap) <= 24) {
      const focal = { x: s.start.x - c.width / 2, y: s.start.y - c.height / 2 }
      target = s.transform.scale > 1.001
        ? { scale: 1, x: 0, y: 0 }
        : zoomAround(s.transform, focal, focal, c.doubleTapScale, c)
      s.lastTap = null
    } else {
      s.lastTap = { ...s.start, time }
    }
  } else { s.lastTap = null }
  s.mode = 'idle'
  s.ids = []
  return { action, target, ended: true }
}

export function cancelGesture(s: GestureState) {
  s.mode = 'idle'; s.ids = []; s.pageX = 0; s.dismissY = 0; s.lastTap = null
  s.moved = true
}

export function normalizeIndex(index: number, count: number) {
  if (count === 0) return -1
  return Math.max(0, Math.min(count - 1, Number.isFinite(index) ? Math.trunc(index) : 0))
}
