// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react'
import { Button, ImagePreview } from '@lynx-js/lynx-ui'
import { previewImages } from '../shared/image-preview-fixtures'
import '../shared/image-preview.css'

function App() {
  const [show, setShow] = useState(false)
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [brokenImage, setBrokenImage] = useState(false)
  const [declineRequests, setDeclineRequests] = useState(false)
  const images = brokenImage
    ? [...previewImages, { src: 'data:image/png;base64,invalid', alt: '加载失败测试' }]
    : previewImages

  function open(at: number) {
    setIndex(at)
    setShow(true)
  }

  return (
    <view className='lynx-ui-preview-demo__screen lunaris-dark'>
      <scroll-view scroll-orientation='vertical' className='lynx-ui-preview-demo__scroll'>
        <view className='lynx-ui-preview-demo__content'>
          <text className='lynx-ui-preview-demo__title'>图片预览</text>
          <text className='lynx-ui-preview-demo__description'>
            点击校准图打开预览。双击或双指缩放；原始比例左右切图、下滑关闭。
          </text>
          <view className='lynx-ui-preview-demo__thumbnails'>
            {previewImages.map((item, at) => (
              <Button key={item.src} className='lynx-ui-preview-demo__thumbnail' onClick={() => open(at)}>
                <image className='lynx-ui-preview-demo__image' src={item.src} mode='aspectFit' />
                <text className='lynx-ui-preview-demo__text'>{item.alt}</text>
              </Button>
            ))}
          </view>
          <view className='lynx-ui-preview-demo__row'>
            <text className='lynx-ui-preview-demo__text'>关闭动画</text>
            <Button className='lynx-ui-preview-demo__button' onClick={() => setReducedMotion(value => !value)}>
              <text className='lynx-ui-preview-demo__text'>{reducedMotion ? '开启' : '关闭'}</text>
            </Button>
          </view>
          <view className='lynx-ui-preview-demo__row'>
            <text className='lynx-ui-preview-demo__text'>加入失败图片</text>
            <Button className='lynx-ui-preview-demo__button' onClick={() => setBrokenImage(value => !value)}>
              <text className='lynx-ui-preview-demo__text'>{brokenImage ? '开启' : '关闭'}</text>
            </Button>
          </view>
          <view className='lynx-ui-preview-demo__row'>
            <text className='lynx-ui-preview-demo__text'>测试拒绝一次操作</text>
            <Button className='lynx-ui-preview-demo__button' onClick={() => setDeclineRequests(value => !value)}>
              <text className='lynx-ui-preview-demo__text'>{declineRequests ? '开启' : '关闭'}</text>
            </Button>
          </view>
          <text className='lynx-ui-preview-demo__description'>
            开启后首次切图或关闭会被拒绝，画面应复位；再次操作即可正常响应。
          </text>
          <Button className='lynx-ui-preview-demo__button' onClick={() => open(brokenImage ? 3 : index)}>
            <text className='lynx-ui-preview-demo__text'>打开预览</text>
          </Button>
        </view>
      </scroll-view>
      <ImagePreview
        images={images}
        show={show}
        index={index}
        onShowChange={next => {
          if (declineRequests) setDeclineRequests(false)
          else setShow(next)
        }}
        onIndexChange={next => {
          if (declineRequests) setDeclineRequests(false)
          else setIndex(next)
        }}
        animationDuration={reducedMotion ? 0 : 180}
      />
    </view>
  )
}

root.render(<App />)
export default App
