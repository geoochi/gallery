import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Blurhash } from 'react-blurhash'
import ResizeObserver from 'resize-observer-polyfill'
import Tilt from '../Tilt'
import { computeColumnLayout, computeDynamicColumns } from './layouts/columns'

function Gallery({ photos, onClick, margin, onLoad }) {
  const [containerWidth, setContainerWidth] = useState(0)
  const galleryEl = useRef(null)

  useLayoutEffect(() => {
    let animationFrameID = null
    const observer = new ResizeObserver(entries => {
      const newWidth = entries[0].contentRect.width
      if (containerWidth !== newWidth) {
        animationFrameID = window.requestAnimationFrame(() => {
          setContainerWidth(Math.floor(newWidth))
        })
      }
    })
    observer.observe(galleryEl.current)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(animationFrameID)
    }
  })

  const [computedPhotos, galleryStyle] = useMemo(() => {
    const columns = computeDynamicColumns(containerWidth)
    const computedPhotos = computeColumnLayout({
      containerWidth: containerWidth - 1,
      columns,
      margin,
      photos,
    })
    const galleryStyle = { position: 'relative' }
    if (computedPhotos.length > 0) {
      galleryStyle.height = computedPhotos[computedPhotos.length - 1].containerHeight
    }
    return [computedPhotos, galleryStyle]
  }, [containerWidth, margin, photos])

  const handleClick = useCallback(
    (event, { index }) => {
      onClick(event, {
        index,
        photo: photos[index],
        previous: photos[index - 1] || null,
        next: photos[index + 1] || null,
      })
    },
    [onClick, photos]
  )

  const refs = useMemo(() => Array.from({ length: photos.length }, () => React.createRef()), [photos.length])

  useEffect(() => {
    onLoad(refs.map(({ current }) => current))
  }, [onLoad, refs])

  return (
    <div id='gallery' ref={galleryEl} style={galleryStyle}>
      {computedPhotos.map((photo, index) => {
        const { src, top, left, width, height, title, alt, hash } = photo
        const style = {
          position: 'absolute',
          top,
          left,
          width,
          height,
          margin,
        }
        const onClick = event => {
          handleClick(event, { photo, index })
        }

        return (
          <Tilt key={src} style={style} rotationFactor={5} springOptions={{ stiffness: 300, damping: 20 }}>
            <div className='photo' onClick={onClick}>
              <Blurhash
                hash={hash}
                width={width}
                height={height}
                resolutionX={32}
                resolutionY={32}
                punch={1}
                className='blurhash-placeholder'
              />
              <img
                ref={refs[index]}
                data-original={src}
                width={width}
                height={height}
                alt={alt}
                className='photo-image'
              />
              <span className='photo-title'>{title}</span>
            </div>
          </Tilt>
        )
      })}
    </div>
  )
}

Gallery.propTypes = {
  photos: PropTypes.array,
  margin: PropTypes.number,
  onClick: PropTypes.func,
  onLoad: PropTypes.func,
}

Gallery.defaultProps = {
  margin: 8,
}

export default React.memo(Gallery)
