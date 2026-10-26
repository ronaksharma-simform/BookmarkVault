# BookmarkVault

A tiny command-line tool to save, list and delete bookmarks. Bookmarks are stored in a local JSON file (no database).

## Requirements

Node.js 18 or later. There are no runtime dependencies.

## Install

```sh
git clone https://github.com/ronaksharma-simform/BookmarkVault.git
cd BookmarkVault
```

`npm install` is optional because there is nothing to install. To get a `bookmarkvault` command on your PATH, run `npm link`.

## Run

```sh
npm start -- add https://example.com "Example"   # prints the saved bookmark as JSON
npm start -- list                                # oldest first
npm start -- delete <id>
```

If you ran `npm link`, use `bookmarkvault add ...`, `bookmarkvault list` and `bookmarkvault delete <id>` instead.

Only `http` and `https` URLs are accepted. An empty or malformed URL, or an unknown id, prints `Error: <message>` to stderr and exits with code 1. A missing or unknown command prints usage and exits with code 2.

## Data file

Bookmarks are saved in `data/bookmarks.json` (relative to the directory you run the command from). Set `BOOKMARKVAULT_FILE` to use another path:

```sh
BOOKMARKVAULT_FILE=/tmp/my-bookmarks.json npm start -- list
```

## Test

```sh
npm test
```

## Bookmark model

| Field       | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| `id`        | string | Generated UUID                                   |
| `url`       | string | The bookmarked `http`/`https` URL                |
| `title`     | string | Given title, or the URL if no title was given    |
| `createdAt` | string | ISO 8601 timestamp of when it was added          |
