import bbox from "@turf/bbox";

import adiffToGeoJSON from "./adiff-to-geojson.js";

export class MapLibreAugmentedDiffViewer {
  constructor(adiff, options) {
    this.adiff = adiff;
    this.geojson = adiffToGeoJSON(adiff);
    this.options = {...options};
  }

  /// Returns the changeset bounding box in [west, south, east, north] form.
  /// The bounding box covers only the elements that were changed, not elements
  /// that were only included in the diff for context.
  bounds() {
    return bbox({
     type: "FeatureCollection",
     features: this.geojson.features.filter(f => f.properties.action !== "unchanged")
    });
  }

  /// Return the sources that should be added to the map style in order to support
  /// the augmented diff viewer. This function is called by addTo(map); in most cases
  /// you should use that function as it will also handle updating the map style when
  /// options are changed.
  sources() {
    let source = {
        type: "geojson",
        data: this.geojson,
    };

    if (this.adiff.note) {
      source.attribution = this.adiff.note;
    }
    
    return { changeset: source };
  }

  /// Return the layers that should be added to the map style in order to support
  /// the augmented diff viewer. This function is called by addTo(map); in most cases
  /// you should use that function as it will also handle updating the map style when
  /// options are changed.
  layers() {
    let layers = [];

    const CASE_OPACITY = 1; //["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 0.2];
    const CASE_COLOR = [
      "case",
      ["boolean", ["feature-state", "highlight"], false],
      "hsla(0, 0%, 85%, 0.5)",
      "hsla(0, 0%, 15%, 0.5)"
    ];
    const CASE_BLUR = 2;

    // TODO: maybe we shouldn't reuse bg for highlight, and instead put 'highlight'
    // case and core layers on top of everything else (filtered to only show features
    // with the 'highlight' feature state). that way highlighted stuff would be on top
    // of everything else.
    const CORE_COLOR = [
          "match", ["get", "action"],
          "create", "#39DBC0",
          "modify", [
            "match", ["get", "side"],
            // "old", ["case", ["get", "tags_changed"], "#DB950A", "#AAAAAA"],
            "old", "#888888",
            "new", ["case", ["get", "tags_changed"], "#E8E845", "#B7B7B7"],
            "#FF0000" // unreachable
          ],
          "delete", "#CC2C47",
          "#8B79C488",
      ];
      
    layers.push({
      id: "changeset-overlay-bg",
      type: "background",
      paint: {
        "background-color": "hsla(0, 0%, 0%, 0.5)",
      }
    });

    layers.push({
      id: "changeset-relation-bg",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'relation']],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-width": 8,
        "line-color": CASE_COLOR,
        "line-opacity": CASE_OPACITY,
        "line-blur": CASE_BLUR,
        "line-offset": -5,
      }
    });
  
    layers.push({
      id: "changeset-way-bg",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'way']],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-width": 8,
        "line-color": CASE_COLOR,
        "line-opacity": CASE_OPACITY,
        "line-blur": CASE_BLUR,
      }
    });
  
    layers.push({
      id: "changeset-node-bg",
      type: "circle",
      source: "changeset",
      filter: ['all', ['==', 'type', 'node']],
      paint: {
        "circle-radius": 4,
        "circle-color": CASE_COLOR,
        "circle-opacity": CASE_OPACITY,
        "circle-blur": CASE_BLUR,
      }
    });
  
    layers.push({
      id: "changeset-relation",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'relation']],
      paint: {
        "line-width": 1.0,
        "line-color": CORE_COLOR,
        "line-dasharray": [6, 6, 2, 6],
        "line-offset": -5,
      }
    });
  
    layers.push({
      id: "changeset-way-old",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'way'], ["==", "side", "old"]],
      paint: {
        "line-width": 1.0,
        "line-color": CORE_COLOR,
        "line-dasharray": [5, 3],
      }
    });
    
    // layers.push({
    //   id: "changeset-way-context",
    //   type: "line",
    //   source: "changeset",
    //   // filter: ['all', ['==', 'type', 'way'], ["!", ["has", "side"]]],
    //   paint: {
    //     "line-width": 1.5,
    //     "line-color": "#8B79C4",
    //   }
    // });
  
    layers.push({
      id: "changeset-way-new",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'way'], ["==", "side", "new"]],
      paint: {
        "line-width": 1.5,
        "line-color": CORE_COLOR,
      }
    });
  
    layers.push({
      id: "changeset-node",
      type: "circle",
      source: "changeset",
      filter: ['all', ['==', 'type', 'node']],
      paint: {
        "circle-radius": ["case", [">", ["get", "num_tags"], 0], 4, 2],
        "circle-color": CORE_COLOR,
      }
    });

    return layers;
  }

  updateStyle(map) {
    let currentStyle = map.getStyle();

    currentStyle.sources = { ...currentStyle.sources, ...this.sources() };
    currentStyle.layers = [
      ...currentStyle.layers.filter(layer => !layer.id.startsWith("changeset-")),
      ...this.layers(),
    ]

    map.setStyle(currentStyle);
  }

  addTo(map) {
    this.updateStyle(map);
    
    let selected = null; // currently selected element (one at a time)

    map.on("click", (event) => {
      if (!this.options.onClick) { return; }
      
      let bbox = [
        [event.point.x - 5, event.point.y - 5],
        [event.point.x + 5, event.point.y + 5]
      ];
      let features = map.queryRenderedFeatures(bbox) ?? [];

      let id = selected;
      // for (let id of selected) {
      if (id !== null) {
        map.setFeatureState({ source: 'changeset', id }, { highlight: false });
      }

      if (features.length == 0) {
        return;
      }

      // TODO: deduplicate features and sort them by id
      // let features = [...new Set(features.map(f => f.id))].sort((a, b) => a < b)
  
      // selected = new Set(features.map((feature) => feature.id));

      // rotate through features under cursor with each click
      // (allows easier selection of overlapping objects)
      let selectedIndex = features.findIndex(f => f.id === selected);
      let nextIndex = mod(selectedIndex + 1, features.length);
      let selectedFeature = features[nextIndex];
      selected = selectedFeature.id;

      map.setFeatureState({ source: 'changeset', id: selected }, { highlight: true });

      this.options.onClick(event, this.adiff.actions.find(action => {
        let element = action.new ?? action.old;
        return element.type === selectedFeature.properties.type &&
          element.id === selectedFeature.properties.id;
        }));
    });
  }
}

/// Euclidean modulo function (JavaScript's % operator implements truncated modulo)
function mod(n, m) {
  return ((n % m) + m) % m;
}
