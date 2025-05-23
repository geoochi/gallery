const throttle = (fn, wait) => {
  let inThrottle, lastFn, lastTime
  return function () {
    const context = this
    const args = arguments
    if (!inThrottle) {
      inThrottle = true
      fn.apply(context, args)
      lastTime = Date.now()
      return
    }

    clearTimeout(lastFn)
    lastFn = setTimeout(function () {
      if (Date.now() - lastTime >= wait) {
        fn.apply(context, args)
        lastTime = Date.now()
      }
    }, Math.max(wait - (Date.now() - lastTime), 0))
  }
}

function isElementInViewport(el, index) {
  const rect = el.getBoundingClientRect()
  const windowHeight = window.innerHeight || document.documentElement.clientHeight
  const windowWidth = window.innerWidth || document.documentElement.clientWidth

  const eleTop = rect.top
  const eleBottom = rect.bottom
  const eleLeft = rect.left
  const eleRight = rect.right

  const visibleHeight = Math.min(eleBottom, windowHeight) - Math.max(eleTop, 0)
  const visibleWidth = Math.min(eleRight, windowWidth) - Math.max(eleLeft, 0)

  if (visibleHeight <= 0 || visibleWidth <= 0) {
    // console.log(`Element ${index} is not in viewport at all`, {
    //   rect: {
    //     top: rect.top,
    //     right: rect.right,
    //     bottom: rect.bottom,
    //     left: rect.left,
    //   },
    //   windowHeight,
    //   windowWidth,
    // })
    return false
  }

  const totalArea = rect.width * rect.height
  const visibleArea = visibleWidth * visibleHeight
  const visibleRatio = visibleArea / totalArea

  // console.log(`Element ${index} visibility metrics:`, {
  //   visibleRatio: visibleRatio.toFixed(2),
  //   visibleArea,
  //   totalArea,
  //   threshold: 0.7,
  // })

  return visibleRatio >= 0.1
}

function lazyLoad(images) {
  if (!images || !images.length || images.every(image => !image)) {
    // console.log('No valid images to lazy load')
    return
  }

  // console.log(`Setting up lazy loading for ${images.length} images`)

  const validImages = images.filter((img, i) => {
    if (!img || !img.getBoundingClientRect) {
      // console.log(`Invalid image at index ${i}:`, img)
      return false
    }
    return true
  })

  if (validImages.length === 0) {
    // console.log('No valid images found for lazy loading')
    return
  }

  // console.log(`Found ${validImages.length} valid images for lazy loading`)

  const hadLoadSymbol = Array.from({ length: validImages.length }).fill(false)

  function loadImage(el, index) {
    if (!el || !el.dataset || !el.dataset.original) {
      // console.log(`Cannot load image ${index}: Invalid element or missing data-original attribute`)
      hadLoadSymbol[index] = true
      return
    }

    const src = el.dataset.original
    // console.log(`Loading image ${index} from src: ${src}`)

    const img = new Image()
    img.src = src
    img.onload = function () {
      // console.log(`Image ${index} loaded successfully`)
      el.classList.add('loaded')
      el.src = src
      hadLoadSymbol[index] = true

      const photoDiv = el.closest('.photo')
      if (photoDiv) {
        const blurhash = photoDiv.querySelector('.blurhash-placeholder')
        if (blurhash) {
          blurhash.classList.add('fade-out')
        }
      }
    }
    img.onerror = function () {
      // console.log(`Error loading image ${index} from src: ${src}`)
      hadLoadSymbol[index] = true
    }
  }

  const lazyLoadEvent = throttle(processImages, 120)
  window.addEventListener('scroll', lazyLoadEvent, false)

  function processImages() {
    if (hadLoadSymbol.every(el => !!el)) {
      // console.log('All images loaded, removing scroll listener')
      window.removeEventListener('scroll', lazyLoadEvent)
      return
    }

    // console.log('Processing images on scroll...')

    for (let i = 0; i < validImages.length; ++i) {
      if (hadLoadSymbol[i]) {
        continue
      }

      const el = validImages[i]
      // console.log(`Checking image ${i} visibility...`)

      const isVisible = isElementInViewport(el, i)

      if (!hadLoadSymbol[i] && isVisible) {
        // console.log(`Image ${i} is visible, starting load`)
        loadImage(el, i)
      } else {
        // console.log(`Image ${i} is not visible yet, skipping`)
      }
    }
  }

  setTimeout(() => {
    // console.log('Initial image visibility check')
    processImages()
  }, 300)
}

export { lazyLoad }
