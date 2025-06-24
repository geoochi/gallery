const throttle = (fn: (...args: any[]) => void, wait: number): (...args: any[]) => void => {
  let inThrottle: boolean = false, lastFn: ReturnType<typeof setTimeout>, lastTime: number = 0
  return function (this: any, ...args: any[]) {
    const context = this
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

function isElementInViewport(el: HTMLElement, index: number): boolean {
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

function lazyLoad(images: (HTMLImageElement | null | undefined)[]): void {
  if (!images || !images.length || images.every((image: HTMLImageElement | null | undefined) => !image)) {
    // console.log('No valid images to lazy load')
    return
  }

  // console.log(`Setting up lazy loading for ${images.length} images`)

  const validImages = images.filter((img: HTMLImageElement | null | undefined, i: number) => {
    if (!img || !img.getBoundingClientRect) {
      // console.log(`Invalid image at index ${i}:`, img)
      return false
    }
    return true
  }) as HTMLImageElement[]

  if (validImages.length === 0) {
    // console.log('No valid images found for lazy loading')
    return
  }

  // console.log(`Found ${validImages.length} valid images for lazy loading`)

  const hadLoadSymbol = Array.from({ length: validImages.length }).fill(false) as boolean[]

  function loadImage(el: HTMLImageElement, index: number): void {
    if (!el || !el.dataset || !el.dataset.original) {
      // console.log(`Cannot load image ${index}: Invalid element or missing data-original attribute`)
      hadLoadSymbol[index] = true
      return
    }

    const src = el.dataset.original
    // console.log(`Loading image ${index} from src: ${src}`)

    const img = new window.Image()
    img.src = src
    img.onload = function () {
      // console.log(`Image ${index} loaded successfully`)
      el.classList.add('loaded')
      el.src = src
      hadLoadSymbol[index] = true

      const photoDiv = el.closest('.photo')
      if (photoDiv) {
        const blurhash = photoDiv.querySelector('.blurhash-placeholder') as HTMLElement | null
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

  function processImages(): void {
    if (hadLoadSymbol.every((el: boolean) => !!el)) {
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
