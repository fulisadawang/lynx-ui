// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type { ImagePreviewItem } from '@lynx-js/lynx-ui'

// Tiny self-contained PNGs exercise aspect ratios without a network dependency.
export const previewImages: ImagePreviewItem[] = [
  { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAASCAIAAAC1qksFAAAAjklEQVR42rWVSw6AIAxEwcyRvB/xflzHxJ0uSBoilY5AWRFo58GUTzyvO3g2SG8/VurmVAGKdBmax9Q6OTU7mMGouXgFjWE68VATeIwZg06yYL7yO1MUQDDtMnkPwVhcO/b3TG/BuWHskKy0SK2kWX8KYC5TrT8F4B0wbwyGpUkMJqVNTJT/wOm5jt4fzgOOOEjJd5u1qwAAAABJRU5ErkJggg==', alt: '横向校准图', size: { width: 32, height: 18 } },
  { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAgCAIAAACQHr+mAAAAkklEQVR42sXVUQqAIAwG4CmeqNN0gU7VBTpNtwl6q4eBjLapbaN8EYTfb+hg6TgveL8Kbuu8DwaWbQKADKaVkcI7Riisy6ENgpVya12QUhFaA3xQQZoIckrWaFLM2Iss4mkFtRYPepI/YviAjXaL0+hfaWDutp+YjChSayUOujWNEkGf1qY4aNQSjo6PZkCyDaobteJbx1ugYFIAAAAASUVORK5CYII=', alt: '纵向校准图', size: { width: 18, height: 32 } },
  { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAnElEQVR42q3VwQ2AIAyF4fLiJG7nEJ4cwu3cwsSbHpqgYilthQvh8qUJfyDtx0k91sDbuM5hYpsWIgIrfIgpPATyRAErKzcUsJ7KC3JZhVJCRuurCFDTEhUZUqyaUoVES1E0qLB05S67aTXTB3VasNy0pQkYe2lasPeiW3BVp1hwVadYcCmKBa9SsxBQRAsx5Wsl/kX+P/6p13d0ATZWfywxp5iPAAAAAElFTkSuQmCC', alt: '方形校准图', size: { width: 24, height: 24 } },
]
