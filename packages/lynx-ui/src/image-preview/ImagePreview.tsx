// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useEffect, useRef, useState } from '@lynx-js/react'
import { Button } from '@lynx-js/lynx-ui-button'
import { DialogContent, DialogRoot, DialogView } from '@lynx-js/lynx-ui-dialog'
import { fitContent, normalizeIndex } from './model'
import { ZoomSurface } from './ZoomSurface'
import type { ImagePreviewItem, ImagePreviewProps, ImagePreviewToolbarProps, ZoomableViewRef } from './types'
import './style.css'

function DefaultToolbar(props: ImagePreviewToolbarProps) {
  return (
    <>
      <view className='lynx-ui-image-preview__topbar'>
        <text className='lynx-ui-image-preview__label'>{props.index + 1} / {props.count}</text>
        <Button className='lynx-ui-image-preview__button' onClick={props.close} buttonProps={{ 'accessibility-label': 'Close preview' }}>
          <text className='lynx-ui-image-preview__label'>×</text>
        </Button>
      </view>
      <view className='lynx-ui-image-preview__toolbar'>
        <Button className='lynx-ui-image-preview__button' disabled={!props.canPrevious} onClick={props.previous} buttonProps={{ 'accessibility-label': 'Previous image' }}>
          <text className='lynx-ui-image-preview__label'>‹</text>
        </Button>
        <Button className='lynx-ui-image-preview__button' onClick={props.zoomIn} buttonProps={{ 'accessibility-label': 'Zoom in' }}>
          <text className='lynx-ui-image-preview__label'>+</text>
        </Button>
        <Button className='lynx-ui-image-preview__button' onClick={props.reset} buttonProps={{ 'accessibility-label': 'Reset zoom' }}>
          <text className='lynx-ui-image-preview__label'>1×</text>
        </Button>
        <Button className='lynx-ui-image-preview__button' disabled={!props.canNext} onClick={props.next} buttonProps={{ 'accessibility-label': 'Next image' }}>
          <text className='lynx-ui-image-preview__label'>›</text>
        </Button>
      </view>
    </>
  )
}

interface PreviewPageProps {
  item: ImagePreviewItem
  index: number
  width: number
  height: number
  previous?: ImagePreviewItem
  next?: ImagePreviewItem
  options: ImagePreviewProps
  acknowledgement: number
  navigate: (index: number) => void
  close: () => void
}

function PreviewPage(props: PreviewPageProps) {
  const { item, index, width, height, previous, next, options } = props
  const zoomRef = useRef<ZoomableViewRef>(null)
  const [naturalSize, setNaturalSize] = useState(item.size)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const activeAttempt = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const fitted = naturalSize ? fitContent(width, height, naturalSize.width, naturalSize.height) : { width, height }
  function retry() {
    activeAttempt.current += 1
    setStatus('loading')
    setAttempt(activeAttempt.current)
  }
  const toolbar: ImagePreviewToolbarProps = {
    index, count: options.images.length, canPrevious: previous !== undefined, canNext: next !== undefined,
    close: props.close,
    previous: () => { if (previous) props.navigate(index - 1) },
    next: () => { if (next) props.navigate(index + 1) },
    zoomIn: () => { if (status === 'loaded') zoomRef.current?.zoomTo(options.doubleTapScale ?? 2.5) },
    reset: () => zoomRef.current?.reset(),
  }
  return (
    <>
      <ZoomSurface
        ref={zoomRef}
        width={width}
        height={height}
        contentWidth={fitted.width}
        contentHeight={fitted.height}
        maxScale={status === 'loaded' ? options.maxScale : 1}
        doubleTapScale={options.doubleTapScale}
        animationDuration={options.animationDuration}
        acknowledgement={props.acknowledgement}
        dismiss={options.swipeToClose ?? true}
        previousPage={previous ? <image className='lynx-ui-image-preview__image' src={previous.src} mode='aspectFit' accessibility-element={false} /> : undefined}
        nextPage={next ? <image className='lynx-ui-image-preview__image' src={next.src} mode='aspectFit' accessibility-element={false} /> : undefined}
        onAction={action => {
          if (action === 'dismiss') props.close()
          else props.navigate(index + (action === 'next' ? 1 : -1))
        }}
      >
        <image
          key={attempt}
          className='lynx-ui-image-preview__image'
          src={item.src}
          mode='aspectFit'
          accessibility-element={true}
          accessibility-label={item.alt ?? `Image ${index + 1}`}
          bindload={event => {
            if (!alive.current || attempt !== activeAttempt.current) return
            const { width: imageWidth, height: imageHeight } = event.detail
            if (imageWidth > 0 && imageHeight > 0) setNaturalSize({ width: imageWidth, height: imageHeight })
            setStatus('loaded')
          }}
          binderror={() => {
            if (!alive.current || attempt !== activeAttempt.current) return
            setStatus('error')
            options.onImageError?.(item, index)
          }}
        />
      </ZoomSurface>
      {/* Status controls stay outside the gesture surface so Retry remains tappable. */}
      {status === 'loading' && (
        <view className='lynx-ui-image-preview__status'>
          {options.renderLoading ? options.renderLoading(item, index) : <text className='lynx-ui-image-preview__label'>…</text>}
        </view>
      )}
      {status === 'error' && (
        <view className='lynx-ui-image-preview__status'>
          {options.renderError ? options.renderError(item, index, retry) : (
            <Button className='lynx-ui-image-preview__button' onClick={retry} buttonProps={{ 'accessibility-label': 'Retry loading image' }}>
              <text className='lynx-ui-image-preview__label'>↻</text>
            </Button>
          )}
        </view>
      )}
      {options.renderToolbar ? options.renderToolbar(toolbar) : <DefaultToolbar {...toolbar} />}
    </>
  )
}

export function ImagePreview(props: ImagePreviewProps) {
  const {
    images, show, defaultShow = false, index, defaultIndex = 0,
    onShowChange, onIndexChange, onClose, container, overlayLevel, className = '', style,
  } = props
  const [internalShow, setInternalShow] = useState(defaultShow)
  const [internalIndex, setInternalIndex] = useState(defaultIndex)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [acknowledgement, setAcknowledgement] = useState(0)
  const selected = normalizeIndex(index ?? internalIndex, images.length)
  const visible = show ?? internalShow
  const current = images[selected]

  function changeShow(value: boolean) {
    if (show === undefined) setInternalShow(value)
    // Forces a commit even when a controlled parent declines the close request.
    setAcknowledgement(value => value + 1)
    onShowChange?.(value)
  }
  function navigate(requested: number) {
    const next = normalizeIndex(requested, images.length)
    setAcknowledgement(value => value + 1)
    if (next < 0 || next === selected) return
    if (index === undefined) setInternalIndex(next)
    onIndexChange?.(next)
  }

  return (
    <DialogRoot show={visible && current !== undefined} onShowChange={changeShow} onClose={onClose}>
      <DialogView
        className={`lynx-ui-image-preview__viewport ${className}`}
        style={style}
        container={container}
        overlayLevel={overlayLevel}
      >
        <DialogContent className='lynx-ui-image-preview__dialog'>
          <view
            className='lynx-ui-image-preview__body'
            bindlayoutchange={event => {
              const { width, height } = event.detail
              if (width > 0 && height > 0) setSize(old => old.width === width && old.height === height ? old : { width, height })
            }}
          >
            {current && size.width > 0 && size.height > 0 && (
              <PreviewPage
                key={`${selected}:${current.src}:${current.size?.width}:${current.size?.height}:${size.width}:${size.height}`}
                item={current}
                index={selected}
                width={size.width}
                height={size.height}
                previous={images[selected - 1]}
                next={images[selected + 1]}
                options={props}
                acknowledgement={acknowledgement}
                navigate={navigate}
                close={() => changeShow(false)}
              />
            )}
          </view>
        </DialogContent>
      </DialogView>
    </DialogRoot>
  )
}
