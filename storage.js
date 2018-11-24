const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function getDestination (req, file, config, callback) {
  let mimetype = file.mimetype
  let shorttype = mimetype.split('/')[0]
  let extention = path.extname(file.originalname) || `.${mimetype.split('/').pop()}`
  let id = crypto.randomBytes(config.identifiers.length).toString('hex')
  let filepath = `${id}${extention}`
  switch (shorttype) {
    case 'image':
    case 'audio':
    case 'video':
      return callback(null, `${config.storage[shorttype]}/${filepath}`)
    default:
      return callback({
        status: 415
      })
  }
}

function StreamedStorage (config, app) {
  this.app = app
  this.config = config
  this.getDestination = getDestination
}

StreamedStorage.prototype._handleFile = function _handleFile (req, file, callback) {
  this.getDestination(req, file, this.config, (err, savepath) => {
    if (err) {
      return callback(err)
    } else {
      let outStream = fs.createWriteStream(savepath)
      file.stream.pipe(outStream)
      outStream.on('error', callback)
      outStream.on('finish', () => {
        callback(null, {
          path: savepath,
          size: outStream.bytesWritten
        })
      })
      req.on('close', () => {
        outStream.close()
        this._removeFile(req, {
          path: savepath
        }, callback)
      })
    }
  })
}

StreamedStorage.prototype._removeFile = function _removeFile (req, file, callback) {
  fs.unlink(file.path, callback)
}

module.exports = function (config, app, opts) {
 return new StreamedStorage(config, app, opts)
}