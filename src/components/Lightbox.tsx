import React from 'react'
import Carousel, { Modal, ModalGateway, ViewType } from 'react-images'

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
  // 适配 react-images 的 ViewType
  const views: ViewType[] = photos.map(({ src, title, size: { height, width } }) => ({
    source: src,
    caption: title,
    width,
    height,
  }))

  if (!viewerIsOpen) return null
  // ModalGateway 不能有 children，直接调用 ModalGateway 和 Modal
  return ModalGateway && Modal
    ? // @ts-ignore
      React.createElement(
        ModalGateway,
        null,
        React.createElement(Modal, { onClose: closeLightbox }, React.createElement(Carousel, { currentIndex: currentPhoto, views }))
      )
    : null
}

export default React.memo(Lightbox)
