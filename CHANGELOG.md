# Changelog

All notable changes to this project will be documented in this file.

Versioning of this project adheres to the [Semantic Versioning](https://semver.org/spec/v2.0.0.html) spec.

## [1.1.1]

Released 2025-02-26

- Fixed a bug where relations whose members included other relations would have infinite bounding boxes
  (i.e. `[Infinity, Infinity, -Infinity, -Infinity]`)

## [1.1.0]

Released 2025-02-25

- `onClick(null)` is now called when the user clicks on the map background (deselecting any selected elements), allowing consumers of this package to hide UI elements that may have been shown when a feature was selected.- remove some `console.log()` statements that were added for debugging and accidentally committed

## [1.0.2]

Released 2025-02-03

- Fixed a bug where one of the source files (`adiff-to-geojson.js`) was missing from the `files` array in package.json.

Today is going great.

## [1.0.1]

Released 2025-02-03

- Fixed a bug where one of the dependencies (`@turf/bbox-polygon`) was missing in package.json

## [1.0.0]

Released 2025-02-03

Initial release.

[1.1.1]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.1.1
[1.1.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.1.0
[1.0.2]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.2
[1.0.1]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.1
[1.0.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.0
