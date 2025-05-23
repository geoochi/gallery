const fs = require('fs')
const sizeOf = require('image-size')
const sharp = require('sharp')
const { encode } = require('blurhash')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const os = require('os')
const path = require('path')
const del = require('del')

const CACHE_FILE = './blurhash_cache.json'

let hashCache = {}
try {
  if (fs.existsSync(CACHE_FILE)) {
    hashCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
    console.log(`Loaded cache with ${Object.keys(hashCache).length} entries`)
  }
} catch (err) {
  console.error('Error loading cache:', err)
}

const saveCache = () => {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(hashCache, null, 2))
  console.log(`Cache saved with ${Object.keys(hashCache).length} entries`)
}

const encodeImageToBlurhash = path =>
  new Promise((resolve, reject) => {
    sharp(path)
      .raw()
      .ensureAlpha()
      .toBuffer((err, buffer, { width, height }) => {
        if (err) return reject(err)
        resolve(encode(new Uint8ClampedArray(buffer), width, height, 4, 4))
      })
  })

if (!isMainThread) {
  ;(async () => {
    const { photoPath, cacheKey } = workerData
    try {
      const hash = await encodeImageToBlurhash(photoPath)
      parentPort.postMessage({ hash, cacheKey, success: true })
    } catch (error) {
      parentPort.postMessage({
        error: error.message,
        cacheKey,
        success: false,
      })
    }
  })()
}

const { NODE_ENV: ENV } = process.env

const packageJson = require('../package.json')
const CDN = packageJson.config.cdn
const photosDir = './public/photos/'
const photosLocalDir = './photos/'
const photoJS = './src/photos.json'

const ignoreFileList = ['.DS_Store', 'hidden']

const RANGE = 120

const processPhotoWithWorker = photo => {
  return new Promise((resolve, reject) => {
    const photoPath = photosDir + photo
    const cacheKey = photo

    if (hashCache[cacheKey]) {
      const { name, width, height, widthScale, heightScale, hash } = hashCache[cacheKey]
      const src = ENV === 'DEV' ? photosLocalDir + photo : CDN + photo
      const photoData = {
        src,
        title: name,
        alt: name,
        width: widthScale,
        height: heightScale,
        size: { height, width },
        hash,
      }
      resolve(photoData)
      return
    }

    const worker = new Worker(__filename, {
      workerData: { photoPath, cacheKey },
    })

    worker.on('message', async data => {
      if (data.success) {
        try {
          const { hash } = data
          const name = photo.split('.').slice(0, -1).join('.')
          const { height, width } = sizeOf(photoPath)
          const sub = Math.abs(height - width)
          const heightScale = sub < RANGE ? 1 : Math.round(height / RANGE)
          const widthScale = sub < RANGE ? 1 : Math.round(width / RANGE)
          const src = ENV === 'DEV' ? photosLocalDir + photo : CDN + photo

          hashCache[cacheKey] = {
            name,
            width,
            height,
            widthScale,
            heightScale,
            hash,
          }

          const photoData = {
            src,
            title: name,
            alt: name,
            width: widthScale,
            height: heightScale,
            size: { height, width },
            hash,
          }
          resolve(photoData)
        } catch (error) {
          reject(error)
        }
      } else {
        reject(new Error(data.error))
      }
    })

    worker.on('error', reject)
  })
}

const formatProgressBar = (current, total, length = 30) => {
  const percentage = Math.floor((current / total) * 100)
  const filledLength = Math.floor((current / total) * length)
  const bar = '█'.repeat(filledLength) + '░'.repeat(length - filledLength)
  return `[${bar}] ${current}/${total} (${percentage}%)`
}

const minify = async (needCompressPhotos, destination) => {
  try {
    await Promise.all(
      needCompressPhotos.map(async photo => {
        const filename = path.basename(photo)
        const ext = path.extname(photo).toLowerCase()

        if (ext === '.jpg' || ext === '.jpeg') {
          await sharp(photo).jpeg({ quality: 80 }).toFile(path.join(destination, filename))
        } else if (ext === '.png') {
          await sharp(photo).png({ quality: 80 }).toFile(path.join(destination, filename))
        }
      })
    )
    console.log('compress images success!')
  } catch (error) {
    console.log('Occur error when minifying images:')
    console.log(error)
    throw err
  }
}

const minifyPhotos = async () => {
  const publicPhotos = fs.readdirSync(photosDir)
  const photos = fs.readdirSync(photosLocalDir).filter(photo => ignoreFileList.every(f => !photo.includes(f)))

  let needDeletedPhotos = publicPhotos.filter(photo => !photos.includes(photo))

  if (needDeletedPhotos && needDeletedPhotos.length) {
    needDeletedPhotos = needDeletedPhotos.map(photo => photosDir + photo)
    console.log({ needDeletedPhotos })
    await del(needDeletedPhotos)
    console.log('delete files success!')
  }

  let needCompressPhotos = photos.filter(photo => !publicPhotos.includes(photo))
  if (!needCompressPhotos || !needCompressPhotos.length) {
    return
  }
  needCompressPhotos = needCompressPhotos.map(photo => photosLocalDir + photo)
  console.log({ needCompressPhotos })
  await minify(needCompressPhotos, photosDir)
  console.log('Images optimized.')
}

const main = async () => {
  await minifyPhotos()

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

  const cachedCount = photos.filter(photo => hashCache[photo]).length
  console.log(`${cachedCount} photos found in cache (${Math.floor((cachedCount / totalPhotos) * 100)}%)`)

  const numCPUs = os.cpus().length
  const concurrency = Math.max(1, numCPUs - 1)
  console.log(`Processing with ${concurrency} worker threads`)

  try {
    const results = []
    let processedCount = 0

    for (let i = 0; i < photos.length; i += concurrency) {
      const batch = photos.slice(i, i + concurrency)
      const batchPromises = batch.map(photo => processPhotoWithWorker(photo))
      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result, idx) => {
        processedCount++

        if (result.status === 'fulfilled') {
          const photoData = result.value
          results.push(photoData)
          const fromCache = hashCache[batch[idx]] ? ' (from cache)' : ''
          console.log(`[${processedCount}/${totalPhotos}] Processed: ${batch[idx]}${fromCache}`)
        } else {
          console.error(`[${processedCount}/${totalPhotos}] Error processing ${batch[idx]}:`, result.reason)
        }
      })

      console.log(formatProgressBar(processedCount, totalPhotos))

      if (processedCount % 10 === 0 || processedCount === totalPhotos) {
        saveCache()
      }
    }

    fs.writeFileSync(photoJS, JSON.stringify(results))

    const newCount = totalPhotos - cachedCount
    console.log(`Processing complete: ${totalPhotos} total, ${cachedCount} from cache, ${newCount} newly processed`)
    console.log('update photos.js success!')
  } catch (error) {
    console.error('Failed to process photos:', error)
    process.exit(-1)
  }
}

if (isMainThread) {
  main().catch(err => {
    console.error('Main process error:', err)
    process.exit(-1)
  })
}
