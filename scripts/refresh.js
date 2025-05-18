import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import sizeOf from 'image-size'
import sharp from 'sharp'

const photosDir = './photos/'
const photoJSON = './src/photos.json'

const ignoreFileList = ['.DS_Store', 'hidden', '.gitkeep']

const RANGE = 120

const loadPhotoCache = () => {
  try {
    if (fs.existsSync(photoJSON)) {
      const existingPhotos = JSON.parse(fs.readFileSync(photoJSON, 'utf8'))
      const cache = {}

      existingPhotos.forEach(photo => {
        const filename = path.basename(photo.src)
        cache[filename] = photo
      })

      console.log(`Loaded cache with ${Object.keys(cache).length} entries`)
      return cache
    }
  } catch (err) {
    console.error('Error loading photo cache:', err)
  }

  return {}
}

const getImageDimensions = async imagePath => {
  try {
    const dimensions = sizeOf(fs.readFileSync(imagePath))
    if (dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height }
    }
    return { width: 800, height: 600 }
  } catch {
    return { width: 800, height: 600 }
  }
}

const convertToWebp = async (needConvertPhotos, destination) => {
  try {
    await Promise.all(
      needConvertPhotos.map(async photo => {
        const filename = path.basename(photo, path.extname(photo)) + '.webp'
        const outputPath = path.join(destination, filename)
        const ext = path.extname(photo).toLowerCase()

        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
            console.log(`Removed existing file: ${filename}`)
          }

          await sharp(photo)
            .webp({ quality: 90 })
            .toFile(outputPath)

          fs.unlinkSync(photo)
          console.log(`Converted ${path.basename(photo)} -> ${filename}`)
        }
      })
    )
    console.log('Convert images to webp success!')
  } catch (error) {
    console.log('Occur error when converting images to webp:')
    console.error(error)
    console.log('Continuing with existing files...')
  }
}

const processPhoto = async (photo, cache) => {
  const photoPath = photosDir + photo
  const cacheKey = photo

  if (cache[cacheKey]) {
    return cache[cacheKey]
  }

  try {
    console.log(`Processing new photo: ${photo}`)
    const { height, width } = await getImageDimensions(photoPath)
    const name = photo.split('.').slice(0, -1).join('.')
    const sub = Math.abs(height - width)
    const heightScale = sub < RANGE ? 1 : Math.round(height / RANGE)
    const widthScale = sub < RANGE ? 1 : Math.round(width / RANGE)
    const src = 'https://cdn.jsdelivr.net/gh/geoochi/gallery@main/photos/' + photo

    const photoData = {
      src,
      title: name,
      alt: name,
      width: widthScale,
      height: heightScale,
      size: { height, width },
    }

    cache[cacheKey] = photoData

    return photoData
  } catch (error) {
    console.error(`Error processing ${photo}:`, error)
    throw error
  }
}

const processPhotos = async () => {
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true })
  }

  const publicPhotos = fs.readdirSync(photosDir).filter(photo => ignoreFileList.every(f => !photo.includes(f)))
  const nonWebpPhotos = publicPhotos.filter(photo => !photo.toLowerCase().endsWith('.webp'))

  if (nonWebpPhotos.length > 0) {
    console.log(`Found ${nonWebpPhotos.length} non-webp images in public/photos, converting...`)
    const needConvertPhotos = nonWebpPhotos.map(photo => photosDir + photo)
    await convertToWebp(needConvertPhotos, photosDir)
    console.log('All images converted to webp format')
  }
}

const main = async () => {
  await processPhotos()

  const photoCache = loadPhotoCache()

  const photos = fs
    .readdirSync(photosDir)
    .filter(photo => ignoreFileList.every(f => !photo.includes(f)))
    .filter((f, i, arr) => arr.indexOf(f) === i)

  photos.sort((a, b) => {
    try {
      return fs.statSync(photosDir + b).birthtimeMs - fs.statSync(photosDir + a).birthtimeMs
    } catch {
      return -1
    }
  })

  const totalPhotos = photos.length
  console.log(`Found ${totalPhotos} photos to process`)

  const cachedCount = photos.filter(photo => photoCache[photo]).length
  console.log(`${cachedCount} photos found in cache (${Math.floor((cachedCount / totalPhotos) * 100)}%)`)

  try {
    const results = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      try {
        const photoData = await processPhoto(photo, photoCache)
        results.push(photoData)
      } catch (error) {
        console.error(`[${i + 1}/${totalPhotos}] Error processing ${photo}:`, error)
      }
    }

    fs.writeFileSync(photoJSON, JSON.stringify(results, null, 2))
    fs.writeFileSync(photosDir + '.gitkeep', '')

    const newCount = totalPhotos - cachedCount
    console.log(`Processing complete: ${totalPhotos} total, ${cachedCount} from cache, ${newCount} newly processed`)
    console.log('update photos.js success!')
  } catch (error) {
    console.error('Failed to process photos:', error)
    process.exit(-1)
  }
}

main().catch(err => {
  console.error('Main process error:', err)
  process.exit(-1)
})


