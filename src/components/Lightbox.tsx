import React from 'react'
import { Carousel } from 'react-responsive-carousel'
import 'react-responsive-carousel/lib/styles/carousel.min.css'

interface Photo {
  src: string
  title: string
  size: { height: number; width: number }
  hash?: string
  alt?: string
}

interface LightboxProps {
  viewerIsOpen: boolean
  photos: Photo[]
  currentPhoto: number
  closeLightbox: () => void
}

function Lightbox({ viewerIsOpen, photos, currentPhoto, closeLightbox }: LightboxProps) {
  const carouselRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (viewerIsOpen && carouselRef.current) {
      // 让Carousel获得焦点
      const focusable = carouselRef.current.querySelector('[tabindex]') as HTMLElement | null
      if (focusable) {
        focusable.focus()
      } else {
        // 兜底让整个div可聚焦
        carouselRef.current.focus()
      }
    }
    if (!viewerIsOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewerIsOpen, closeLightbox])

  if (!viewerIsOpen) return null

  // 简单模态样式
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={closeLightbox}
    >
      <div
        ref={carouselRef}
        tabIndex={-1}
        style={{ maxWidth: '90vw', maxHeight: '90vh', outline: 'none', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <Carousel
          selectedItem={currentPhoto}
          showThumbs={false}
          showStatus={false}
          showIndicators={false}
          useKeyboardArrows
          emulateTouch
          dynamicHeight={false}
          swipeable={false}
          animationHandler={'fade'}
          transitionTime={300}
        >
          {photos.map((photo, idx) => (
            <div key={photo.src} style={{ maxHeight: '80vh' }}>
              <img
                src={photo.src}
                alt={photo.alt || photo.title}
                style={{
                  maxHeight: '80vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
              {/* <p className='legend'>{photo.title}</p> */}
            </div>
          ))}
        </Carousel>
        <button
          onClick={closeLightbox}
          style={{
            position: 'absolute',
            top: 24,
            right: 32,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: 'none',
            fontSize: 32,
            cursor: 'pointer',
            borderRadius: 8,
            padding: '0 12px',
          }}
          aria-label='关闭'
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default React.memo(Lightbox)
