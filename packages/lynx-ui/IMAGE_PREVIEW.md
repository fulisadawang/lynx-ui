# ImagePreview 与 ZoomableView

本分支为 `fulisadawang/lynx-ui` 增加图片缩放及预览的初版源码实现。
源码暂时集成于 `packages/lynx-ui/src/image-preview/`，通过现有
`@lynx-js/lynx-ui` 聚合入口导出；**没有创建独立 npm 包，也没有发布 npm 版本**。
没有新增运行时依赖、修改锁文件、同步上游或改动现有组件源码。

## 验证状态（2026-09-29）

已执行 34 个纯模型测试并全部通过，覆盖缩放中心、宽高比、边界、分页阈值、
双击、手指身份变化、第三指、双指转单指、取消、动画中断后的新会话和索引归一化。
离线测试环境为 Node 22.16.0，不是仓库规定的 Node 24 完整环境。
核心 `model.ts` 通过 TypeScript 严格检查。新增 TS/TSX 通过语法转译检查。

当前执行环境无法联网获取完整仓库和依赖，因此**未完成**完整工作区构建、
真实依赖下的组件类型检查、Vitest、lint、Lynx bundle 编译、iOS/Android 真机验证。
不要把模型测试通过理解为平台兼容性、交互性能或渲染正确性已经验收。

## 快速使用

```tsx
import { useState } from '@lynx-js/react'
import { Button, ImagePreview } from '@lynx-js/lynx-ui'

export function Gallery() {
  const [show, setShow] = useState(false)
  const [index, setIndex] = useState(0)
  const images = [
    { src: 'https://your-cdn.example/photo-1.jpg', alt: '第一张图片' },
    { src: 'https://your-cdn.example/photo-2.jpg', alt: '第二张图片' },
  ]

  return (
    <view>
      <Button onClick={() => setShow(true)}><text>查看图片</text></Button>
      <ImagePreview
        images={images}
        show={show}
        index={index}
        onShowChange={setShow}
        onIndexChange={setIndex}
      />
    </view>
  )
}
```

上面的图片地址是占位地址，请替换为自己的资源。仓库示例使用内嵌 PNG 校准图，
不需要网络图片服务。

## ZoomableView

`ZoomableView` 只提供内容缩放和平移，不创建全屏弹层，也不绑定图片业务。
`width` / `height` 是实际视口的逻辑像素尺寸，可以由外层 `bindlayoutchange` 测量。
`contentWidth` / `contentHeight` 是缩放倍数为 1 时的内容尺寸，默认等于视口。
图片应先按原始宽高比计算适配尺寸，而不是把留白也当成可拖动内容。

```tsx
import { useRef } from '@lynx-js/react'
import { Button, ZoomableView } from '@lynx-js/lynx-ui'
import type { ZoomableViewRef } from '@lynx-js/lynx-ui'

export function ZoomDemo() {
  const ref = useRef<ZoomableViewRef>(null)
  return (
    <view>
      <ZoomableView ref={ref} width={300} height={400} contentWidth={300} contentHeight={200}>
        <image src='https://your-cdn.example/photo.jpg' style={{ width: '100%', height: '100%' }} mode='aspectFit' />
      </ZoomableView>
      <Button onClick={() => ref.current?.reset()}><text>复位</text></Button>
    </view>
  )
}
```

| 参数 / 方法 | 默认值 | 说明 |
| --- | --- | --- |
| `width`, `height` | 必填 | 正数、有限值；宽高变化会复位当前手势和缩放 |
| `contentWidth`, `contentHeight` | 视口尺寸 | 倍数 1 的内容大小；变化后复位 |
| `maxScale` | `4` | 最大倍数，必须大于等于 1 |
| `doubleTapScale` | `2.5` | 双击放大倍数，最终受 `maxScale` 限制 |
| `animationDuration` | `180` | 毫秒；设为 0 可关闭补间动画 |
| `disabled` | `false` | 禁用触摸手势；改变时复位 |
| `className`, `style` | 无 | 根节点样式；传入的宽高由显式尺寸覆盖 |
| `onTransformChange` | 无 | 手势或程序动画结束时回调，不逐帧回传后台线程 |
| `ref.reset(animated?)` | `true` | 回到适配尺寸，停止正在执行的手势和动画 |
| `ref.zoomTo(scale, focal?, animated?)` | 视口中心、动画开启 | `focal` 是视口左上角为原点的坐标；倍数至少为 1 |

内容是展示区域：上面有一个独立、未变换的触摸接收层，以保证双指坐标稳定。
**不要把按钮、输入框或可滚动控件放进 `ZoomableView.children` 期待它们接收触摸。**
工具栏应作为它的兄弟节点。父布局改变尺寸时应同步传入新尺寸；不要给根节点添加
会改变坐标系的 `transform` 或内边距后仍使用旧的测量尺寸。

根节点状态类由主线程维护：`ui-zoomed`、`ui-dragging`、`ui-pinching`、`ui-animating`。
类型为 `ZoomableViewUIVariants`。`className` 会保留；不要覆盖内部内容节点的变换。

## ImagePreview

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `images` | 必填 | `{ src, alt?, size?: { width, height } }[]`；可提供已知原始尺寸 |
| `show` / `defaultShow` | `false` | 受控 / 非受控可见性 |
| `onShowChange` | 无 | 关闭请求；受控模式由调用方更新 `show` |
| `index` / `defaultIndex` | `0` | 受控 / 非受控索引；越界归一到合法范围，空数组不展示 |
| `onIndexChange` | 无 | 用户切图请求；受控模式由调用方更新 `index` |
| `onClose` | 无 | 复用 Dialog 的关闭生命周期，不是关闭请求回调 |
| `swipeToClose` | `true` | 允许在适配比例下向下拖动关闭 |
| `maxScale`, `doubleTapScale`, `animationDuration` | 同上 | 缩放与补间配置 |
| `container`, `overlayLevel` | 无 | 透传现有 DialogView 的原生 Overlay 配置 |
| `className`, `style` | 无 | 预览视口样式 |
| `renderToolbar` | 内置工具栏 | 接收索引、数量、前后页能力、关闭、前后切图、放大、复位方法 |
| `renderLoading` | 省略号 | 自定义图片加载提示 |
| `renderError` | 重试按钮 | 接收图片、索引、`retry` 方法；与手势层分离，能接收触摸 |
| `onImageError` | 无 | 图片加载失败通知 |

默认工具栏包含关闭、页码、上一张、下一张、放大和适配复位。内置控件带有可访问性
标签，但屏幕阅读器体验仍需真机测试。需要本地化或业务样式时使用 `renderToolbar`。
默认上下间距只是保守布局值，不替代宿主的安全区数据；复杂安全区使用自定义工具栏。

### 手势规则

- 单指原始比例横向拖动：左右切图，首尾边界不循环；未达到阈值时回到当前页。
- 单指原始比例向下拖动：位移足够才关闭，可用 `swipeToClose={false}` 禁用。
- 放大后单指拖动：只移动当前图片，不切图、不关闭；先复位才能手势切图。
- 双指缩放：以双指中心为锚点，同时允许中心移动；缩放和偏移严格限制在边界内。
- 双指变单指：重新锚定，当前触摸会话不会突然切图或关闭。
- 双击：放大至目标倍数；已经放大时复位。手势取消和长按不会被当作双击。
- 工具栏前后切图：即使当前已放大也能操作，新图片从适配比例开始。

索引、图片来源、显式原始尺寸或视口尺寸改变会重新建立当前页；关闭后重新打开也从
适配比例开始。加载请求有代次检查，重试前的迟到事件不会覆盖新状态。
受控父组件拒绝切图或关闭时，预览会复位，不停留在翻出屏幕的位置。

只渲染当前图片和相邻图片，不把整个图片数组全部挂载。几何计算、双指缩放、拖动和
补间在主线程执行，业务回调在后台线程执行；共享纯函数通过 `runtime: 'shared'`
导入，不能删掉导入属性或用普通跨线程函数调用替代。

### 宿主能力边界

未指定 `container` 时，全屏指**当前 Lynx 视口内全屏**，不是覆盖任意原生页面。
需要覆盖 LynxView 之外的内容时，宿主必须先注册有效原生 Overlay 容器。
Android 系统返回、系统手势、安全区、系统减弱动态效果应由宿主接入。

首版不包含图片保存/分享、跨页面共享元素转场、原图解码优化、缩放后边缘接力切图、
惯性甩动、桌面滚轮缩放或原生导航接管；这些没有被伪装成已支持功能。

## 示例与验证

仓库工具链要求 Node.js 24 与 pnpm 10.33.2。先安装完整仓库依赖：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm turbo build
pnpm --filter @lynx-example/lynx-ui-swiper dev
```

示例复用已有 Swiper 示例包，不是用 Swiper 内核实现缩放：

- `ImagePreviewDemo` → `apps/examples/Swiper/ImagePreview/index.tsx`。
- `ZoomableViewDemo` → `apps/examples/Swiper/ZoomableView/index.tsx`。

画廊示例包含横图、竖图、方图、加载失败、关闭动画，以及父组件拒绝一次操作的恢复测试。

```bash
# 实际 Vitest 项目
pnpm exec vitest run --project lynx-ui-image-preview
# 工作区完整测试及约定检查
pnpm test --run
pnpm check:exports
pnpm check:luna-vars
pnpm check:all
# 无 npm 依赖的同一套模型测试，仅替换测试运行器，不替换生产逻辑
node tools/scripts/test-image-preview-model.mjs
```

### 合并前真机清单（尚未执行）

- [ ] iOS / Android 首次加载、连续关闭重开、加载失败重试和空数组。
- [ ] 双击、快速捏合、三指介入、双指转单指、系统取消事件。
- [ ] 横图/竖图边界、首尾分页、放大时不误切图、不误关闭。
- [ ] 连续切图、父组件拒绝操作、图片替换与横竖屏切换。
- [ ] 原生 Overlay 容器、Android 返回、安全区与屏幕阅读器。
- [ ] 真实低端设备上的帧耗时、内存与高分辨率图片解码表现。
