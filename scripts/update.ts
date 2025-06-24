import fs from 'fs'
import sizeOf from 'image-size'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import os from 'os'
import path from 'path'
import del from 'del'

const CACHE_FILE = './blurhash_cache.json'

interface HashCacheEntry {
  name: string
  width: number
  height: number
  widthScale: number
  heightScale: number
  hash: string
}

interface PhotoData {
  src: string
  title: string
  alt: string
  width: number
  height: number
  size: { height: number; width: number }
  hash: string
}

let hashCache: Record<string, HashCacheEntry> = {}
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

const encodeImageToBlurhash = (imgPath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    sharp(imgPath)
      .metadata()
      .then(metadata => {
        const { width, height } = metadata
        return sharp(imgPath)
          .resize({
            width: width ? Math.round(width / 4) : undefined,
            height: height ? Math.round(height / 4) : undefined,
            fit: 'inside',
          })
          .raw()
          .ensureAlpha()
          .toBuffer({ resolveWithObject: true })
      })
      .then(({ data, info }) => {
        resolve(encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4))
      })
      .catch(reject)
  })

if (!isMainThread) {
  (async () => {
    const { photoPath, cacheKey } = workerData as { photoPath: string; cacheKey: string }
    try {
      const hash = await encodeImageToBlurhash(photoPath)
      parentPort?.postMessage({ hash, cacheKey, success: true })
    } catch (error: any) {
      parentPort?.postMessage({
        error: error.message,
        cacheKey,
        success: false,
      })
    }
  })()
}

const { NODE_ENV: ENV } = process.env

// eslint-disable-next-line @typescript-eslint/no-var-requires
import packageJson from '../package.json'
const CDN: string = packageJson.config.cdn
const photosDir = './public/photos/'
const photosLocalDir = './photos/'
const photoJSON = './src/photos.json'

const ignoreFileList = ['.DS_Store', 'hidden']

const RANGE = 120

const processPhotoWithWorker = (photo: string): Promise<PhotoData> => {
  return new Promise((resolve, reject) => {
    const photoPath = photosDir + photo
    const cacheKey = photo

    if (hashCache[cacheKey]) {
      const { name, width, height, widthScale, heightScale, hash } = hashCache[cacheKey]
      const src = ENV === 'DEV' ? photosLocalDir + photo : CDN + photo
      const photoData: PhotoData = {
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
    } as any) // TypeScript workaround for workerData

    worker.on('message', async (data: any) => {
      if (data.success) {
        try {
          const { hash } = data
          const { height, width } = sizeOf(photoPath) as { width: number; height: number }
          const name = photo.split('.').slice(0, -1).join('.')
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

          const photoData: PhotoData = {
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

const formatProgressBar = (current: number, total: number, length = 30): string => {
  const percentage = Math.floor((current / total) * 100)
  const filledLength = Math.floor((current / total) * length)
  const bar = '█'.repeat(filledLength) + '░'.repeat(length - filledLength)
  return `[${bar}] ${current}/${total} (${percentage}%)`
}

const minify = async (needCompressPhotos: string[], destination: string) => {
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
    console.error(error)
    throw error
  }
}

const minifyPhotos = async () => {
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir)
  }
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
    const results: PhotoData[] = []
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
          console.error(`[${processedCount}/${totalPhotos}] Error processing ${batch[idx]}:`, (result as PromiseRejectedResult).reason)
        }
      })

      console.log(formatProgressBar(processedCount, totalPhotos))

      if (processedCount % 10 === 0 || processedCount === totalPhotos) {
        saveCache()
      }
    }

    fs.writeFileSync(photoJSON, JSON.stringify(results))
    fs.writeFileSync(photosDir + '.gitkeep', '')

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
