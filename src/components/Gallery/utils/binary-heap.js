/*
Copyright 2007-2013 Marijn Haverbeke frin "Eloquent Javascript, 1st Edition"

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

export function BinaryHeap(scoreFunction) {
  this.content = []
  this.scoreFunction = scoreFunction
}

BinaryHeap.prototype = {
  push: function (element) {
    // Add the new element to the end of the array.
    this.content.push(element)
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1)
  },

  pop: function () {
    // Store the first element so we can return it later.
    let result = this.content[0]
    // Get the element at the end of the array.
    let end = this.content.pop()
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      this.content[0] = end
      this.sinkDown(0)
    }
    return result
  },

  remove: function (node) {
    let length = this.content.length
    // To remove a value, we must search through the array to find
    // it.
    for (let i = 0; i < length; i++) {
      if (this.content[i] !== node) continue
      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      let end = this.content.pop()
      // If the element we popped was the one we needed to remove,
      // we're done.
      if (i === length - 1) break
      // Otherwise, we replace the removed element with the popped
      // one, and allow it to float up or sink down as appropriate.
      this.content[i] = end
      this.bubbleUp(i)
      this.sinkDown(i)
      break
    }
  },

  size: function () {
    return this.content.length
  },

  bubbleUp: function (n) {
    // Fetch the element that has to be moved.
    let element = this.content[n]
    let score = this.scoreFunction(element)
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      let parentN = Math.floor((n + 1) / 2) - 1
      let parent = this.content[parentN]
      // If the parent has a lesser score, things are in order and we
      // are done.
      if (score >= this.scoreFunction(parent)) break

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[parentN] = element
      this.content[n] = parent
      n = parentN
    }
  },

  sinkDown: function (n) {
    // Look up the target element and its score.
    let length = this.content.length
    let element = this.content[n]
    let elemScore = this.scoreFunction(element)

    while (true) {
      // Compute the indices of the child elements.
      let child2N = (n + 1) * 2
      let child1N = child2N - 1
      // This is used to store the new position of the element,
      // if any.
      let swap = null
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        let child1 = this.content[child1N]
        var child1Score = this.scoreFunction(child1)
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) swap = child1N
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        let child2 = this.content[child2N]
        let child2Score = this.scoreFunction(child2)
        if (child2Score < (swap == null ? elemScore : child1Score)) {
          swap = child2N
        }
      }

      // No need to swap further, we are done.
      if (swap == null) break

      // Otherwise, swap and continue.
      this.content[n] = this.content[swap]
      this.content[swap] = element
      n = swap
    }
  },
}

export default BinaryHeap
