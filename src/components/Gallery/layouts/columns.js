import { round } from '../utils/round'

// compute sizes for column directed layouts
export const computeColumnLayout = ({ photos, columns, containerWidth, margin }) => {
  // calculate each colWidth based on total width and column amount
  let colWidth = (containerWidth - margin * 2 * columns) / columns

  // map through each photo to assign adjusted height and width based on colWidth
  const photosWithSizes = photos.map(photo => {
    const newHeight = (photo.height / photo.width) * colWidth
    return {
      ...photo,
      width: round(colWidth, 1),
      height: round(newHeight, 1),
    }
  })

  // store all possible left positions
  // and current top positions for each column
  const colLeftPositions = []
  const colCurrTopPositions = []
  for (let i = 0; i < columns; i++) {
    colLeftPositions[i] = round(i * (colWidth + margin * 2), 1)
    colCurrTopPositions[i] = 0
  }

  // map through each photo, then reduce thru each "column"
  // find column with the smallest height and assign to photo's 'top'
  // update that column's height with this photo's height
  const photosPositioned = photosWithSizes.map(photo => {
    const smallestCol = colCurrTopPositions.reduce((acc, item, i) => {
      acc = item < colCurrTopPositions[acc] ? i : acc
      return acc
    }, 0)

    photo.top = colCurrTopPositions[smallestCol]
    photo.left = colLeftPositions[smallestCol]
    colCurrTopPositions[smallestCol] = colCurrTopPositions[smallestCol] + photo.height + margin * 2

    // store the tallest col to use for gallery height because of abs positioned elements
    const tallestCol = colCurrTopPositions.reduce((acc, item, i) => {
      acc = item > colCurrTopPositions[acc] ? i : acc
      return acc
    }, 0)
    photo.containerHeight = colCurrTopPositions[tallestCol]
    return photo
  })
  return photosPositioned
}

export const computeDynamicColumns = containerWidth => {
  let columns = 1
  if (containerWidth >= 500) columns = 2
  if (containerWidth >= 900) columns = 3
  if (containerWidth >= 1500) columns = 4
  if (containerWidth >= 2200) columns = 5
  if (containerWidth >= 3000) columns = 6
  if (containerWidth >= 3800) columns = 7
  if (containerWidth >= 4500) columns = 8
  if (containerWidth >= 5300) columns = 9
  return columns
}
