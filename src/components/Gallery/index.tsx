import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Blurhash } from 'react-blurhash'
import ResizeObserver from 'resize-observer-polyfill'
import Tilt from '../Tilt'
import { computeColumnLayout, computeDynamicColumns } from './layouts/columns'

// 定义 Photo 类型
export interface Photo {
  src: string
  title: string
  size: { height: number; width: number }
  hash?: string
  alt?: string
  // 下面这些是布局后才有的
  width?: number
  height?: number
  top?: number
  left?: number
  containerHeight?: number
  [key: string]: any
}

interface GalleryProps {
  photos: Photo[]
  margin?: number
  onClick: (
    event: React.MouseEvent,
    data: {
      index: number
      photo: Photo
      previous: Photo | null
      next: Photo | null
    }
  ) => void
  onLoad: (elements: (HTMLImageElement | null)[]) => void
}

function Gallery({ photos, onClick, margin = 8, onLoad }: GalleryProps) {
  const [containerWidth, setContainerWidth] = useState(0)
  const galleryEl = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    let animationFrameID: number | null = null
    const observer = new ResizeObserver(entries => {
      const newWidth = entries[0].contentRect.width
      if (containerWidth !== newWidth) {
        animationFrameID = window.requestAnimationFrame(() => {
          setContainerWidth(Math.floor(newWidth))
        })
      }
    })
    if (galleryEl.current) observer.observe(galleryEl.current)
    return () => {
      observer.disconnect()
      if (animationFrameID) window.cancelAnimationFrame(animationFrameID)
    }
  }, [containerWidth])

  const [computedPhotos, galleryStyle] = useMemo(() => {
    const columns = computeDynamicColumns(containerWidth)
    const computedPhotos = computeColumnLayout({
      containerWidth: containerWidth - 1,
      columns,
      margin,
      photos: photos as import('./index').Photo[],
    }) as (Photo & { top: number; left: number; containerHeight: number })[]
    const galleryStyle: React.CSSProperties = { position: 'relative' }
    if (computedPhotos.length > 0) {
      galleryStyle.height = computedPhotos[computedPhotos.length - 1].containerHeight
    }
    return [computedPhotos, galleryStyle] as [typeof computedPhotos, React.CSSProperties]
  }, [containerWidth, margin, photos])

  const handleClick = useCallback(
    (event: React.MouseEvent, { index }: { index: number }) => {
      onClick(event, {
        index,
        photo: photos[index],
        previous: photos[index - 1] || null,
        next: photos[index + 1] || null,
      })
    },
    [onClick, photos]
  )

  const refs = useMemo(() => Array.from({ length: photos.length }, () => React.createRef<HTMLImageElement>()), [photos.length])

  useEffect(() => {
    onLoad(refs.map(({ current }) => current))
  }, [onLoad, refs])

  return (
    <div id='gallery' ref={galleryEl} style={galleryStyle}>
      {computedPhotos.map((photo, index: number) => {
        const { src, top, left, width, height, title, alt, hash } = photo
        const style: React.CSSProperties = {
          position: 'absolute',
          top,
          left,
          width,
          height,
          margin,
        }
        const onClick = (event: React.MouseEvent) => {
          handleClick(event, { index })
        }

        return (
          <Tilt key={src} style={style} rotationFactor={5} springOptions={{ stiffness: 300, damping: 20 }}>
            <div className='photo' onClick={onClick}>
              {hash && (
                <Blurhash hash={hash} width={width} height={height} resolutionX={32} resolutionY={32} punch={1} className='blurhash-placeholder' />
              )}
              <img ref={refs[index]} data-original={src} width={width} height={height} alt={alt} className='photo-image' />
              <span className='photo-title'>{title}</span>
            </div>
          </Tilt>
        )
      })}
    </div>
  )
}

export default React.memo(Gallery)
