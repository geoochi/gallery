import PropTypes from 'prop-types'
import React from 'react'

import Carousel, { Modal, ModalGateway } from 'react-images'

function Lightbox({ viewerIsOpen, photos, currentPhoto, closeLightbox }) {
  return (
    <ModalGateway>
      {viewerIsOpen ? (
        <Modal onClose={closeLightbox}>
          <Carousel
            currentIndex={currentPhoto}
            showNavigationOnTouchDevice
            views={photos.map(({ src, title, size: { height, width } }) => ({
              src,
              caption: title,
              width,
              height,
            }))}
          />
        </Modal>
      ) : null}
    </ModalGateway>
  )
}

Lightbox.propTypes = {
  viewerIsOpen: PropTypes.bool,
  photos: PropTypes.array,
  currentPhoto: PropTypes.number,
  closeLightbox: PropTypes.func,
}

export default React.memo(Lightbox)
