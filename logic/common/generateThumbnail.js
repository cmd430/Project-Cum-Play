const path = require('path')
const ffmpeg = require('ffmpeg-static')
const simpleThumbnail = require('simple-thumbnail')
const jsmediatags = require('jsmediatags')
const sharp = require('sharp')

module.exports = (config, app, common) => {

  return async function generateThumbnail (file, type) {
    app.console.debug(`Generating thumbnail for file: ${path.basename(file)}`)
    return new Promise((resolve, reject) => {
      switch (type) {
        case 'image':
        case 'video':
          let options = {
            path: ffmpeg.path
          }
          if (type === 'video') {
            options.seek = '00:00:03.00'
          }
          return simpleThumbnail(file, null, '100%', options)
          .then(stream => {
            let buffer = []
            stream.on('data', data => {
              buffer.push(data)
            })
            stream.on('end', () => {
              return resolve(Buffer.concat(buffer))
            })
            stream.on('error', err => {
              return reject(err)
            })
          })
        case 'audio':
          return new jsmediatags.Reader(file)
          .setTagsToRead([
            'picture'
          ])
          .read({
            onSuccess: data => {
              let picture = data.tags.picture
              if (picture === undefined){
                return reject({
                  message: 'no picute data'
                })
              }
              return resolve(Buffer.from(picture.data))
            },
            onError: err => {
              return reject(err)
            }
          })
      }
    })
    .then(buffer => {
      app.console.debug(`Scaling thumbnail for file: ${path.basename(file)}`)
      return sharp(buffer)
      .resize({
        width: config.upload.thumbnail.width,
        height: config.upload.thumbnail.height,
        fit: config.upload.thumbnail.fit,
        position: config.upload.thumbnail.position
      })
      .png()
      .toBuffer()
    })
    .then(thumbnail => {
      app.console.debug(`Generated thumbnail for file: ${path.basename(file)}`)
      return `data:image/png;base64,${thumbnail.toString('base64')}`
    })
    .catch(err => {
      app.console.debug(`Unable to generate thumbnail for file: ${path.basename(file)}`, 'red')
      app.console.debug(err, 'red')
      return null
    })
  }

}