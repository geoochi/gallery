import React, { useCallback, useState } from 'react'
import './App.css'
import Gallery from './components/Gallery/index'
import Lightbox from './components/Lightbox'
import photos from './photos.json'

import { lazyLoad } from './utils'

function App() {
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [viewerIsOpen, setViewerIsOpen] = useState(false)

  const openLightbox = useCallback((_, { __, index }) => {
    setCurrentPhoto(index)
    setViewerIsOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setCurrentPhoto(0)
    setViewerIsOpen(false)
  }, [])

  return (
    <>
      <Gallery photos={photos} onLoad={lazyLoad} onClick={openLightbox} />
      <Lightbox photos={photos} viewerIsOpen={viewerIsOpen} currentPhoto={currentPhoto} closeLightbox={closeLightbox} />
    </>
  )
}

export default App
