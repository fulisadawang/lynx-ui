// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  forwardRef, runOnBackground, runOnMainThread, useCallback, useEffect,
  useImperativeHandle, useMainThreadRef, useRef,
} from '@lynx-js/react'
import type { ReactNode } from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'

import {
  cancelGesture, clampTransform, createGesture, endGesture, moveGesture,
  startGesture, validateDimensions, zoomAround,
} from './model' with { runtime: 'shared' }
import type { GestureAction, GestureConfig, Transform } from './model'
import type { ZoomableViewProps, ZoomableViewRef, ZoomPoint } from './types'
import './style.css'

interface SurfaceEvent {
  touches: { identifier: number; x: number; y: number }[]
}
interface ZoomSurfaceProps extends ZoomableViewProps {
  previousPage?: ReactNode
  nextPage?: ReactNode
  dismiss?: boolean
  acknowledgement?: number
  onAction?: (action: Exclude<GestureAction, null>) => void
}

/** Shared internal touch surface; presentation children do not receive touches. */
export const ZoomSurface = forwardRef<ZoomableViewRef, ZoomSurfaceProps>(function ZoomSurface(props, ref) {
  const {
    width, height, contentWidth = width, contentHeight = height,
    maxScale = 4, doubleTapScale = 2.5, animationDuration = 180,
    disabled = false, className = '', style, children,
    previousPage, nextPage, dismiss = false, acknowledgement = 0,
  } = props
  validateDimensions(width, height, maxScale, doubleTapScale)
  validateDimensions(contentWidth, contentHeight, 1, 1)
  if (!Number.isFinite(animationDuration) || animationDuration < 0) {
    throw new RangeError('animationDuration must be a finite nonnegative number')
  }
  const config: GestureConfig = {
    width, height, contentWidth, contentHeight, maxScale, doubleTapScale,
    previous: previousPage != null, next: nextPage != null, dismiss,
  }
  const rootRef = useMainThreadRef<MainThread.Element | null>(null)
  const contentRef = useMainThreadRef<MainThread.Element | null>(null)
  const trackRef = useMainThreadRef<MainThread.Element | null>(null)
  const state = useMainThreadRef(createGesture())
  const motion = useMainThreadRef({ generation: 0, animating: false, disposed: false, pendingAction: false })
  const latest = useRef(props)
  latest.current = props
  const alive = useRef(true)
  const report = useCallback((transform: Transform, action: GestureAction) => {
    if (!alive.current) return
    latest.current.onTransformChange?.(transform)
    if (action) latest.current.onAction?.(action)
  }, [])

  function paint() {
    'main thread'
    if (motion.current.disposed) return
    const s = state.current
    contentRef.current?.setStyleProperty('transform', `translate(${s.transform.x}px, ${s.transform.y}px) scale(${s.transform.scale})`)
    const shrink = 1 - Math.min(0.25, s.dismissY / height * 0.25)
    trackRef.current?.setStyleProperty('transform', `translate(${s.pageX}px, ${s.dismissY}px) scale(${shrink})`)
    const classes = ['lynx-ui-image-preview__zoom', className]
    if (s.transform.scale > 1.001) classes.push('ui-zoomed')
    if (s.mode === 'pan' || s.mode === 'page' || s.mode === 'dismiss') classes.push('ui-dragging')
    if (s.mode === 'pinch') classes.push('ui-pinching')
    if (motion.current.animating) classes.push('ui-animating')
    rootRef.current?.setAttribute('class', classes.join(' '))
  }

  function stop() {
    'main thread'
    motion.current.generation += 1
    motion.current.animating = false
  }

  function settle(target: Transform, pageX = 0, dismissY = 0, action: GestureAction = null, animated = true) {
    'main thread'
    stop()
    const generation = motion.current.generation
    const from = { ...state.current.transform }
    const fromPage = state.current.pageX
    const fromDismiss = state.current.dismissY
    const startedAt = Date.now()
    const duration = animated ? animationDuration : 0
    motion.current.animating = duration > 0
    motion.current.pendingAction = action !== null
    const finish = () => {
      'main thread'
      motion.current.animating = false
      paint()
      runOnBackground(report)({ ...state.current.transform }, action)
    }
    const frame = () => {
      'main thread'
      if (motion.current.disposed || generation !== motion.current.generation) return
      const progress = duration === 0 ? 1 : Math.min(1, (Date.now() - startedAt) / duration)
      const eased = 1 - (1 - progress) ** 3
      state.current.transform = {
        scale: from.scale + (target.scale - from.scale) * eased,
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
      }
      state.current.pageX = fromPage + (pageX - fromPage) * eased
      state.current.dismissY = fromDismiss + (dismissY - fromDismiss) * eased
      paint()
      if (progress < 1) lynx.requestAnimationFrame(frame)
      else finish()
    }
    frame()
  }

  function reset(animated = true) {
    'main thread'
    stop()
    cancelGesture(state.current)
    motion.current.pendingAction = false
    settle({ scale: 1, x: 0, y: 0 }, 0, 0, null, animated)
  }

  useImperativeHandle(ref, () => ({
    reset: (animated = true) => { runOnMainThread(reset)(animated) },
    zoomTo: (scale: number, focal?: ZoomPoint, animated = true) => {
      if (!Number.isFinite(scale) || scale < 1 || (focal && (!Number.isFinite(focal.x) || !Number.isFinite(focal.y)))) {
        throw new RangeError('zoomTo requires a finite scale >= 1 and a finite focal point')
      }
      runOnMainThread((next: number, point: ZoomPoint | undefined, animate: boolean) => {
        'main thread'
        stop()
        cancelGesture(state.current)
        motion.current.pendingAction = false
        const anchor = { x: (point?.x ?? width / 2) - width / 2, y: (point?.y ?? height / 2) - height / 2 }
        settle(zoomAround(state.current.transform, anchor, anchor, next, config), 0, 0, null, animate)
      })(scale, focal, animated)
    },
  }), [width, height, maxScale, doubleTapScale, animationDuration, contentWidth, contentHeight, className])

  useEffect(() => {
    alive.current = true
    runOnMainThread(() => {
      'main thread'
      motion.current.disposed = false
    })()
    return () => {
      alive.current = false
      runOnMainThread(() => {
        'main thread'
        motion.current.disposed = true
        stop()
      })()
    }
  }, [])

  // A declined controlled navigation still receives an acknowledgement and recovers.
  useEffect(() => {
    runOnMainThread(() => {
      'main thread'
      if (motion.current.disposed) return
      reset(false)
    })()
  }, [width, height, contentWidth, contentHeight, maxScale, doubleTapScale, disabled, acknowledgement])

  useEffect(() => { runOnMainThread(paint)() }, [className])

  function onStart(event: SurfaceEvent) {
    'main thread'
    if (disabled || motion.current.pendingAction || motion.current.disposed) return
    stop()
    startGesture(state.current, event.touches.map(t => ({ x: t.x, y: t.y, id: t.identifier })), Date.now(), config)
    paint()
  }
  function onMove(event: SurfaceEvent) {
    'main thread'
    if (disabled || motion.current.pendingAction || motion.current.disposed) return
    moveGesture(state.current, event.touches.map(t => ({ x: t.x, y: t.y, id: t.identifier })), config)
    paint()
  }
  function onEnd(event: SurfaceEvent) {
    'main thread'
    if (disabled || motion.current.pendingAction || motion.current.disposed) return
    const result = endGesture(state.current, event.touches.map(t => ({ x: t.x, y: t.y, id: t.identifier })), Date.now(), config)
    if (!result.ended) { paint(); return }
    const pageX = result.action === 'next' ? -width : result.action === 'previous' ? width : 0
    settle(result.target, pageX, result.action === 'dismiss' ? height : 0, result.action)
  }
  function onCancel() {
    'main thread'
    stop()
    const pageX = state.current.pageX
    const dismissY = state.current.dismissY
    cancelGesture(state.current)
    state.current.pageX = pageX
    state.current.dismissY = dismissY
    motion.current.pendingAction = false
    settle(clampTransform(state.current.transform, config))
  }

  return (
    <view
      className={`lynx-ui-image-preview__zoom ${className}`}
      style={{ ...style, width: `${width}px`, height: `${height}px` }}
      main-thread:ref={rootRef}
    >
      <view
        className='lynx-ui-image-preview__track'
        style={{ left: `-${width}px`, width: `${width * 3}px`, height: `${height}px` }}
        main-thread:ref={trackRef}
      >
        <view className='lynx-ui-image-preview__page' style={{ width: `${width}px`, height: `${height}px` }}>{previousPage}</view>
        <view className='lynx-ui-image-preview__page' style={{ width: `${width}px`, height: `${height}px` }}>
          <view
            className='lynx-ui-image-preview__content'
            style={{ width: `${contentWidth}px`, height: `${contentHeight}px` }}
            main-thread:ref={contentRef}
          >{children}</view>
        </view>
        <view className='lynx-ui-image-preview__page' style={{ width: `${width}px`, height: `${height}px` }}>{nextPage}</view>
      </view>
      <view
        className='lynx-ui-image-preview__surface'
        flatten={false}
        accessibility-element={false}
        main-thread:catchtouchstart={onStart}
        main-thread:catchtouchmove={onMove}
        main-thread:catchtouchend={onEnd}
        main-thread:catchtouchcancel={onCancel}
      />
    </view>
  )
})
