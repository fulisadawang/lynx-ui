// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type { ReactNode } from '@lynx-js/react'
import type { CSSProperties } from '@lynx-js/types'

export interface ZoomPoint { x: number; y: number }
export interface ZoomTransform { scale: number; x: number; y: number }
export interface ZoomableViewUIVariants {
  'ui-zoomed': boolean
  'ui-dragging': boolean
  'ui-pinching': boolean
  'ui-animating': boolean
}
export interface ZoomableViewRef {
  /** Reset to the fitted size. Interrupts the current gesture/animation. */
  reset: (animated?: boolean) => void
  /** Focal point uses viewport-local coordinates; omitted means center. */
  zoomTo: (scale: number, focal?: ZoomPoint, animated?: boolean) => void
}
export interface ZoomableViewProps {
  /** Viewport dimensions in logical pixels; no transformed measurement is used. */
  width: number
  height: number
  /** Rendered child size at scale 1. Defaults to the viewport. */
  contentWidth?: number
  contentHeight?: number
  children: ReactNode
  maxScale?: number
  doubleTapScale?: number
  /** Set to 0 when reduced motion is required by the host application. */
  animationDuration?: number
  disabled?: boolean
  className?: string
  style?: CSSProperties
  /** Fires when a gesture or programmatic animation settles, not every frame. */
  onTransformChange?: (transform: ZoomTransform) => void
}
export interface ImagePreviewItem {
  src: string
  alt?: string
  /** Optional intrinsic size, otherwise resolved from the native image load event. */
  size?: { width: number; height: number }
}
export interface ImagePreviewToolbarProps {
  index: number
  count: number
  canPrevious: boolean
  canNext: boolean
  close: () => void
  previous: () => void
  next: () => void
  zoomIn: () => void
  reset: () => void
}
export interface ImagePreviewProps {
  images: ImagePreviewItem[]
  show?: boolean
  defaultShow?: boolean
  onShowChange?: (show: boolean) => void
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Dialog lifecycle callback, not a close-request callback. */
  onClose?: () => void
  /** Native overlay container name. Omit to remain inside the Lynx viewport. */
  container?: string
  overlayLevel?: 1 | 2 | 3 | 4
  maxScale?: number
  doubleTapScale?: number
  animationDuration?: number
  swipeToClose?: boolean
  className?: string
  style?: CSSProperties
  renderToolbar?: (props: ImagePreviewToolbarProps) => ReactNode
  renderLoading?: (item: ImagePreviewItem, index: number) => ReactNode
  renderError?: (item: ImagePreviewItem, index: number, retry: () => void) => ReactNode
  onImageError?: (item: ImagePreviewItem, index: number) => void
}
