-- Up
CREATE TABLE users (
  "id" INTEGER,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "admin" INTEGER DEFAULT 0,
  PRIMARY KEY("id")
);
CREATE TABLE files (
  "id" INTEGER,
  "uploaded_by" TEXT NOT NULL,
  "uploaded_at" NUMERIC NOT NULL,
  "uploaded_until" NUMERIC,
  "file_id" TEXT NOT NULL UNIQUE,
  "original_filename" TEXT NOT NULL,
  "mimetype" TEXT NOT NULL,
  "filesize" INTEGER NOT NULL,
  "in_album" TEXT,
  "public" INTEGER NOT NULL DEFAULT 1,
  "pinned" INTEGER NOT NULL DEFAULT 0,
  "pinned_at" NUMERIC,
  PRIMARY KEY("id"),
  FOREIGN KEY("uploaded_by") REFERENCES users("username") ON UPDATE CASCADE,
  FOREIGN KEY("in_album") REFERENCES albums("album_id") ON DELETE CASCADE
);
CREATE TABLE albums (
  "id" INTEGER,
  "album_id" TEXT NOT NULL UNIQUE,
  "title" TEXT,
  "uploaded_by" TEXT NOT NULL,
  "uploaded_at" NUMERIC NOT NULL,
  "uploaded_until" NUMERIC,
  "public" INTEGER NOT NULL DEFAULT 1,
  "order" TEXT NOT NULL DEFAULT "[]",
  "pinned" INTEGER NOT NULL DEFAULT 0,
  "pinned_at" NUMERIC,
  PRIMARY KEY("id"),
  FOREIGN KEY("uploaded_by") REFERENCES users("username") ON UPDATE CASCADE
);

-- Down
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS albums;