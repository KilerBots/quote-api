const path = require('path')
const fs = require('fs')
const axios = require('axios') // Digunakan untuk fetch data dari URL
const loadImageFromUrl = require('./image-load-url')
const EmojiDbLib = require('emoji-db')
const promiseAllStepN = require('./promise-concurrent')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

const emojiJsonByBrand = {
  apple: 'https://raw.githubusercontent.com/LyoSU/quote-api/refs/heads/master/assets/emoji/emoji-apple-image.json',
  google: 'https://raw.githubusercontent.com/LyoSU/quote-api/refs/heads/master/assets/emoji/emoji-google-image.json',
  twitter: 'https://raw.githubusercontent.com/LyoSU/quote-api/refs/heads/master/assets/emoji/emoji-twitter-image.json',
  joypixels: 'https://raw.githubusercontent.com/LyoSU/quote-api/refs/heads/master/assets/emoji/emoji-joypixels-image.json',
  blob: 'https://raw.githubusercontent.com/LyoSU/quote-api/refs/heads/master/assets/emoji/emoji-blob-image.json'
}

const brandFoledIds = {
  apple: 325,
  google: 313,
  twitter: 322,
  joypixels: 340,
  blob: 56
}

let emojiImageByBrand = {
  apple: [],
  google: [],
  twitter: [],
  joypixels: [],
  blob: []
}

async function fetchEmojiJsonFromUrl(url) {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    console.error(`Failed to fetch JSON from ${url}:`, error.message)
    return null
  }
}

async function downloadEmoji(brand) {
  console.log(`Downloading emoji images for brand: ${brand}`)

  const emojiJsonUrl = emojiJsonByBrand[brand]
  const emojiImage = emojiImageByBrand[brand]
  const dbData = emojiDb.dbData
  const dbArray = Object.keys(dbData)
  const emojiPromiseArray = []

  for (const key of dbArray) {
    const emoji = dbData[key]

    if (!emoji.qualified && !emojiImage[key]) {
      emojiPromiseArray.push(async () => {
        let brandFolderName = brand
        if (brand === 'blob') brandFolderName = 'google'

        const fileUrl = `${process.env.EMOJI_DOMAIN}/thumbs/60/${brandFolderName}/${brandFoledIds[brand]}/${emoji.image.file_name}`

        const img = await loadImageFromUrl(fileUrl, (headers) => {
          return !headers['content-type'].match(/image/)
        })

        const base64 = img.toString('base64')

        if (base64) {
          return {
            key,
            base64
          }
        }
      })
    }
  }

  const downloadResult = await promiseAllStepN(200)(emojiPromiseArray)

  for (const emojiData of downloadResult) {
    if (emojiData) emojiImage[emojiData.key] = emojiData.base64
  }

  console.log(`Finished downloading emojis for brand: ${brand}`)
}

(async function initializeEmojiData() {
  for (const brand in emojiJsonByBrand) {
    const emojiJsonUrl = emojiJsonByBrand[brand]
    console.log(`Fetching emoji JSON for brand: ${brand} from ${emojiJsonUrl}`)

    const emojiData = await fetchEmojiJsonFromUrl(emojiJsonUrl)
    if (emojiData) {
      emojiImageByBrand[brand] = emojiData
    } else {
      console.error(`Failed to load emoji data for brand: ${brand}`)
    }
  }
})()

module.exports = emojiImageByBrand
