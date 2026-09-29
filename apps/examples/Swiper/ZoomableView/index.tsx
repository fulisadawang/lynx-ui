// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef, useState } from '@lynx-js/react'
import { Button, ZoomableView } from '@lynx-js/lynx-ui'
import type { ZoomableViewRef, ZoomTransform } from '@lynx-js/lynx-ui'
import { previewImages } from '../shared/image-preview-fixtures'
import '../shared/image-preview.css'

function App() {
  const zoomRef = useRef<ZoomableViewRef>(null)
  const [width, setWidth] = useState(0)
  const [transform, setTransform] = useState<ZoomTransform>({ scale: 1, x: 0, y: 0 })
  return (
    <view className='lynx-ui-preview-demo__root lunaris-dark'>
      <text className='lynx-ui-preview-demo__title'>独立缩放容器</text>
      <text className='lynx-ui-preview-demo__description'>
        主线程拖动与双指缩放；状态文字只在手势结束后更新。
      </text>
      <view
        className='lynx-ui-preview-demo__stage'
        bindlayoutchange={event => { if (event.detail.width > 0) setWidth(event.detail.width) }}
      >
        {width > 0 && (
          <ZoomableView
            ref={zoomRef}
            width={width}
            height={320}
            contentWidth={width}
            contentHeight={width * 180 / 320}
            onTransformChange={setTransform}
          >
            <image className='lynx-ui-preview-demo__image' src={previewImages[0].src} mode='aspectFit' />
          </ZoomableView>
        )}
      </view>
      <text className='lynx-ui-preview-demo__text'>
        {transform.scale.toFixed(2)}× · x {transform.x.toFixed(0)} · y {transform.y.toFixed(0)}
      </text>
      <view className='lynx-ui-preview-demo__row'>
        <Button className='lynx-ui-preview-demo__button' onClick={() => zoomRef.current?.zoomTo(2.5)}>
          <text className='lynx-ui-preview-demo__text'>放大</text>
        </Button>
        <Button className='lynx-ui-preview-demo__button' onClick={() => zoomRef.current?.reset()}>
          <text className='lynx-ui-preview-demo__text'>复位</text>
        </Button>
        <Button className='lynx-ui-preview-demo__button' onClick={() => zoomRef.current?.reset(false)}>
          <text className='lynx-ui-preview-demo__text'>立即复位</text>
        </Button>
      </view>
    </view>
  )
}

root.render(<App />)
export default App
