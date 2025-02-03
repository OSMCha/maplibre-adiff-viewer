# maplibre-adiff-viewer

A [MapLibre GL JS](https://maplibre.org/) plugin to visualize OpenStreetMap [augmented diff](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs) files on a map in the browser, in the manner of [osmcha.org](https://osmcha.org).

## Installation

```
npm install @osmcha/maplibre-adiff-viewer
```

## Usage

```js
import maplibre from "maplibre-gl";
import adiffParser from "@osmcha/osm-adiff-parser";
import { MapLibreAugmentedDiffViewer } from "@osmcha/maplibre-adiff-viewer";

let map = new maplibre.Map({ /* configure your map here */ });

let adiff = await adiffParser(augmentedDiffXmlString); // parse your augmented diff XML
let adiffViewer = new MapLibreAugmentedDiffViewer(adiff); // initialize the plugin

map.once("load", () => adiffViewer.addTo(map)); // add the plugin to the map
```

## License

This code is available under the ISC License. See the [LICENSE](./LICENSE) file for details.
