import { Router } from 'express'
import createError from 'http-errors'
import database from 'better-sqlite3-helper'

/*
 *  File             /f/<id>
 *  File Settings    /f/<id>/settings
 *  Update File      /f/<id>/update
 *  Delete File      /f/<id>/delete
 *  Download File    /f/<id>/download
 */

export default Router()

  .use((req, res, next) => {
    req.viewJson = Object.keys(req.query).includes('json')
      ? true
      : false
    next()
  })

  // GET Method Routes
  .get('/:file_id', (req, res, next) => {
    let file_id = req.params.file_id
    let file = database().queryFirstRow(`SELECT id, file_id, mimetype, uploaded_by FROM files WHERE file_id=?`, file_id)
    if (file) {
      let locals = file

      return req.viewJson
        ? res.json(locals)
        : res.render('file', locals)
    }
    next()
  })

  // POST Method Routes
  .post('/:file_id/update', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/:file_id/update', (req, res, next) => {
  if (!req.method === 'POST') return next(createError(501))
    next()
  })
  .all('*', (req, res, next) => {
    if (!req.method === 'GET') return next(createError(501))
    next()
  })
