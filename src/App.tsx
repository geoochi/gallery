import React, { useCallback, useState } from 'react'
import Gallery from './components/Gallery/index'
import Lightbox from './components/Lightbox'
import photos from './photos.json'
import './App.css'

import { lazyLoad } from './utils'

// 定义 Photo 类型
interface Photo {
  src: string;
  title: string;
  size: { height: number; width: number };
  hash?: string;
  alt?: string;
}

function App() {
  const [currentPhoto, setCurrentPhoto] = useState<number>(0)
  const [viewerIsOpen, setViewerIsOpen] = useState<boolean>(false)

  // onClick 事件类型适配
  const openLightbox = useCallback((_: React.MouseEvent, data: { index: number }) => {
    setCurrentPhoto(data.index)
    setViewerIsOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setCurrentPhoto(0)
    setViewerIsOpen(false)
  }, [])

  return (
    <>
      <Gallery photos={photos as Photo[]} onLoad={lazyLoad} onClick={openLightbox} />
      <Lightbox photos={photos as Photo[]} viewerIsOpen={viewerIsOpen} currentPhoto={currentPhoto} closeLightbox={closeLightbox} />
    </>
  )
}

export default App
