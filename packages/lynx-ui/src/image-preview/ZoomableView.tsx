// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { forwardRef } from '@lynx-js/react'
import { ZoomSurface } from './ZoomSurface'
import type { ZoomableViewProps, ZoomableViewRef } from './types'

export const ZoomableView = forwardRef<ZoomableViewRef, ZoomableViewProps>(function ZoomableView(props, ref) {
  return <ZoomSurface {...props} ref={ref} />
})
