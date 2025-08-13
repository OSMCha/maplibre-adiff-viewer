# Changelog

All notable changes to this project will be documented in this file.

Versioning of this project adheres to the [Semantic Versioning](https://semver.org/spec/v2.0.0.html) spec.

## [1.3.1]

Released 2025-08-12

- Fixed a bug where `bounds()` would return an infinite bounding box if the diff contained only geometry changes.

## [1.3.0]

Released 2025-04-10

- Make colors a bit brighter and more vibrant to improve visual contrast with the background
- Only show untagged nodes at zooms >= 15 (to reduce visual noise)
- Make ways easier to see when selected/highlighted, by increasing their line width slightly

## [1.2.1]

Released 2025-03-25

- Fixed a bug where `bounds()` was not ignoring `noop` actions, causing bounding boxes to be too big on some changeset adiffs.

## [1.2.0]

Released 2025-03-25

### Added
- Added `showElements` and `showActions` options to allow hiding features by their OSM element type or the type of action affecting them in the diff
- Added `refresh()` method to allow changing basemap or options after the plugin is initialized (consumers should manually call `refresh()` after modifying plugin options or the basemap style).
- Added rendering of unchanged members of modified relations (in purple)
- Added public methods to select/deselect and highlight/unhighlight features. Selecting is intended to be an on-click behavior, while highlighting is intended for hover effects.

### Fixed
- Fixed rendering of degenerate bounding boxes (bounding boxes whose width or height was zero, which can happen when creating a bounding box of a single node). Such bounding boxes will now be grown slightly (to about 10m x 10m) so that they can be rendered.

### Migration notes
- Previously, clicking on a map element would automatically highlight it. To provide more control, this behavior has been removed. If you wish to highlight elements on click, you can explicitly call `select(type, id)` in the `onClick` handler.

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

[1.3.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.3.0
[1.2.1]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.2.1
[1.2.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.2.0
[1.1.1]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.1.1
[1.1.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.1.0
[1.0.2]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.2
[1.0.1]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.1
[1.0.0]: https://github.com/OSMCha/maplibre-adiff-viewer/releases/tag/v1.0.0
