import { unlink } from 'fs'
import { join, extname, basename } from 'path'
import express, { Router } from 'express'
import upload from '../utils/uploader'
import { error } from '../utils/logger'
import createError from 'http-errors'
import database from 'better-sqlite3-helper'

/**
 *  Album            /a/<id>
 *  Add File         /a/<id>/upload
 *  Album Settings   /a/<id>/settings
 *  Update Album     /a/<id>/update
 *  Delete Album     /a/<id>/delete
 *  Download Album   /a/<id>/download
 */

export default Router()

  .use((req, res, next) => {
    req.viewJson = Object.keys(req.query).includes('json')
      ? true
      : false
    next()
  })

  // GET Method Routes
  .get('/:album_id', (req, res, next) => {
    let album_id = req.params.album_id
    let album_data = database().queryFirstRow(`SELECT album_id, title, uploaded_by, uploaded_until FROM albums WHERE album_id=?`, album_id)
    if (album_data) {
      let files = database().query(`SELECT file_id, mimetype, uploaded_by, uploaded_at, original_filename FROM files WHERE in_album=? ORDER BY uploaded_by ASC`, album_id)

      res.locals.album = {
        album_id: album_data.album_id,
        album_title: album_data.title || 'Untitled Album',
        uploaded_by: album_data.uploaded_by,
        uploaded_until: album_data.uploaded_until || 'infinity',
        files: files.map(file => {
          file.original_filename = basename(file.original_filename)
          return file
        })
      }

      Object.assign(res.locals.og, {
        title: `${album_data.title !== null ? album_data.title : album_id}`,
        description: `An Album Hosted at ${res.locals.title}`,
        album: true
      })

      return req.viewJson
        ? res.json(res.locals.album)
        : res.render('album')
    }
    next()
  })
  .use('/:album_id/thumbnail', (req, res, next) => {
    let thumbnail_id = database().queryFirstCell(`SELECT file_id FROM files WHERE in_album=? ORDER BY id DESC`, req.params.album_id)
    express.static(join(__dirname, '..', 'storage', 'thumbnail', `${thumbnail_id}.webp`))(req, res, next)
  })
  .get('/:album_id/download', (req, res, next) => {
    let album_id = req.params.album_id
    let files = []
    let zipname = ''

    try {
      zipname = `${database().queryFirstCell(`SELECT title FROM albums WHERE album_id=?`, album_id) || 'Album'} - `
      database().query('SELECT file_id, mimetype, original_filename FROM files WHERE in_album=?', album_id).forEach(file => {
        let filename = `${file.file_id}${extname(file.original_filename)}`
        files.push({
          path: join(__dirname, '..', 'storage', file.mimetype.split('/').shift(), filename),
          name: filename
        })
      })
    } catch (err) {
      error(err.message)
      return next(createError(404))
    }

    res.zip({
      files: files,
      filename: `${zipname}${album_id}.zip`
    })
  })

  // POST Method Routes
  .post('/:album_id/upload', upload)

  // PATCH Method Routes
  .patch('/:album_id/update', (req, res, next) => {
    let user = req.isAuthenticated()
    if (!user) return next(createError(401))
    if (!req.body.title && !req.body.public) return next(createError(400))
    let update = {}
    if (req.body.title) {
      let title = req.body.title.trim()
      if (!title.replace(/\s/g, '').length) title = 'Untitled Album'
      update.title = title
    }
    if (req.body.public) {
      update.public = +req.body.public
    }

    try {
      database().update('albums', update, {
        album_id: req.params.album_id,
        uploaded_by: user.username
      })
    } catch (err) {
      error(err.message)
      return res.sendStatus(405)
    }

    res.sendStatus(204)
  })

  // DELETE Method Routes
  .delete('/:album_id/delete', (req, res, next) => {
    let user = req.isAuthenticated()
    if (!user) return res.sendStatus(401)
    let album_id = req.params.album_id

    try {
      let album = database().query('SELECT file_id, mimetype, original_filename FROM files WHERE in_album=? AND uploaded_by=?', album_id, user.username)
      let uploader = user.username
      if (database().queryFirstCell(`SELECT admin FROM users WHERE username=?`, user.username)) {
        // admin user
        album = database().query('SELECT file_id, mimetype, original_filename, uploaded_by FROM files WHERE in_album=?', album_id)
        uploader = album[0].uploaded_by
      }

      album.forEach(file => {
        unlink(join(__dirname, '..', 'storage', 'thumbnail', `${file.file_id}.webp`), err => {
          if (err) {
            error(err.message)
            if (err.code !== 'ENOENT') return res.sendStatus(405)
          }
        })
        unlink(join(__dirname, '..', 'storage', file.mimetype.split('/').shift(), `${file.file_id}${extname(file.original_filename)}`), err => {
          if (err) {
            error(err.message)
            if (err.code !== 'ENOENT') return res.sendStatus(405)
          }
        })
      })
      database().run('DELETE FROM albums WHERE album_id=? AND uploaded_by=?', album_id, uploader)
    } catch (err) {
      error(err.message)
      return res.sendStatus(405)
    }

    res.sendStatus(204)
  })

  // Method Not Allowed
  .all('/:album_id', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:album_id/thumbnail', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:album_id/update', (req, res, next) => {
    if (req.method !== 'PATCH') return next(createError(405, {headers: { Allow: 'PATCH' }}))
    next()
  })
  .all('/:album_id/upload', (req, res, next) => {
    if (req.method !== 'POST') return next(createError(405, {headers: { Allow: 'POST' }}))
    next()
  })
  .all('/:album_id/delete', (req, res, next) => {
    if (req.method !== 'DELETE') return next(createError(405, {headers: { Allow: 'DELETE' }}))
    next()
  })
