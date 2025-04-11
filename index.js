import bbox from "@turf/bbox";

import adiffToGeoJSON from "./adiff-to-geojson.js";

export class MapLibreAugmentedDiffViewer {
  static defaults = {
    showElements: ["node", "way", "relation"],
    showActions: ["create", "modify", "delete", "noop"],
    onClick: null,
  }

  /// Create a MapLibreAugmentedDiffViewer which can be added to a MapLibre
  /// map instance in order to render an augmented diff.
  ///
  /// `adiff` is a plain JavaScript object representing the augmented diff.
  /// Generally you'll get one of these by using the `@osmcha/osm-adiff-parser`
  /// package to parse an XML augmented diff file.
  ///
  /// `options` is an object with any of the following properties:
  ///  - `showElements`: an array of OSM element types to show. The default
  ///    is ["node", "way", "relation"] which shows all element types. May
  ///    be empty, in which case nothing will be rendered.
  ///  - `showActions`: an array of action types to show. The default is
  ///    ["create", "modify", "delete"] which shows all action types. May
  ///    be empty, in which case nothing will be rendered.
  ///  - `onClick`: a function to call when one of the rendered map elements is
  ///    clicked. The function receives the corresponding action from the diff
  ///    as its argument.
  constructor(adiff, options) {
    this.adiff = adiff;
    this.geojson = adiffToGeoJSON(adiff);
    this.options = {...MapLibreAugmentedDiffViewer.defaults, ...options};
  }

  /// Returns the changeset bounding box in [west, south, east, north] form.
  /// The bounding box covers only the elements that were changed, not elements
  /// that were only included in the diff for context.
  bounds() {
    return bbox({
     type: "FeatureCollection",
     features: this.geojson.features.filter(f => f.properties.action !== "noop")
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
      [
        "any",
        ["boolean", ["feature-state", "selected"], false],
        ["boolean", ["feature-state", "highlighted"], false],
      ],
      "hsla(0, 0%, 45%, 0.5)",
      "hsla(0, 0%, 15%, 0.5)"
    ];
    const CASE_BLUR = 2;

    // TODO: maybe we shouldn't reuse bg for highlight, and instead put 'highlight'
    // case and core layers on top of everything else (filtered to only show features
    // with the 'highlight' feature state). that way highlighted stuff would be on top
    // of everything else.
    const CORE_COLOR = [
      "match", ["get", "action"],
      "create", "#32E5C7",
      "modify", [
        "match", ["get", "side"],
        "old", "#888888",
        "new", ["case", ["get", "tags_changed"], "#E8E845", "#D0D0D0"],
        "#FF0000" // unreachable
      ],
      "delete", "#F23456",
      "#8B79C4",
    ];

    // Filter expression for action types (create, modify, delete). Note that
    // this filter expression works even in the case where showActions is empty
    // (in other words, MapLibre evaluates ["in", "variable"] to false).
    const ACTION_TYPE_FILTER = ["in", "action", ...this.options.showActions];

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
      filter: ['all', ['==', 'type', 'relation'], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("relation") ? "visible" : "none",
        "line-cap": "round",
        "line-join": "round",
      },
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
      filter: ['all', ['==', 'type', 'way'], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("way") ? "visible" : "none",
        "line-cap": "round",
        "line-join": "round",
      },
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
      filter: ['all', ['==', 'type', 'node'], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("node") ? "visible" : "none",
      },
      paint: {
        "circle-radius": ["case", [">", ["get", "num_tags"], 0], 8, 6],
        "circle-color": CASE_COLOR,
        "circle-opacity": [
          "case",
          [
            "any",
            ["boolean", ["feature-state", "selected"], false],
            ["boolean", ["feature-state", "highlighted"], false],
          ],
          1.0,
          0.0,
        ],
      }
    });
  
    layers.push({
      id: "changeset-relation",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'relation'], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("relation") ? "visible" : "none",
      },
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
      filter: ['all', ['==', 'type', 'way'], ["==", "side", "old"], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("way") ? "visible" : "none",
      },
      paint: {
        "line-width": 1.0,
        "line-color": CORE_COLOR,
        "line-dasharray": [5, 3],
      }
    });
    
    layers.push({
      id: "changeset-way-unchanged",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'way'], ["==", "action", "noop"], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("way") ? "visible" : "none",
      },
      paint: {
        "line-width": 1.0,
        "line-color": "#8B79C4",
      }
    });
  
    layers.push({
      id: "changeset-way-new",
      type: "line",
      source: "changeset",
      filter: ['all', ['==', 'type', 'way'], ["==", "side", "new"], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("way") ? "visible" : "none",
      },
      paint: {
        "line-width": 1.0,
        "line-color": CORE_COLOR,
      }
    });

    layers.push({
      id: "changeset-node-unchanged",
      type: "circle",
      source: "changeset",
      filter: ['all', ['==', 'type', 'node'], ["==", "action", "noop"], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("node") ? "visible" : "none",
      },
      paint: {
        "circle-radius": ["case", [">", ["get", "num_tags"], 0], 4, 2],
        "circle-color": "#8B79C4",
      }
    });

    layers.push({
      id: "changeset-node",
      type: "circle",
      source: "changeset",
      filter: ['all', ['==', 'type', 'node'], ACTION_TYPE_FILTER],
      layout: {
        "visibility": this.options.showElements.includes("node") ? "visible" : "none",
      },
      paint: {
        "circle-radius": ["case", [">", ["get", "num_tags"], 0], 4, 2],
        "circle-color": CORE_COLOR,
      }
    });

    return layers;
  }

  addTo(map) {
    this.map = map;
    this.refresh();
    
    // currently selected element (one at a time)
    // NOTE: this is only used internally for rotating between overlapping
    // features on successive clicks; if you want the feature to appear visually
    // selected you still need to call adiffViewer.select(type, id)
    let selected = null;

    map.on("click", (event) => {
      if (!this.options.onClick) { return; }
      
      let bbox = [
        [event.point.x - 5, event.point.y - 5],
        [event.point.x + 5, event.point.y + 5]
      ];
      let features = map.queryRenderedFeatures(bbox) ?? [];

      if (features.length == 0) {
        selected = null;
        this.options.onClick(null);
        return;
      }

      // deduplicate features and sort them by id; this is important
      // to make sure that rotating through overlapping features on
      // successive clicks behaves consistently.
      let seen = new Set();
      let deduplicated = [];
      for (let f of features) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          deduplicated.push(f);
        }
      }
      let sorted = deduplicated.sort((a, b) => a < b);
  
      // rotate through features under cursor with each click
      // (allows easier selection of overlapping objects)
      let selectedIndex = sorted.findIndex(f => f.id === selected);
      let nextIndex = mod(selectedIndex + 1, sorted.length);
      let selectedFeature = sorted[nextIndex];
      selected = selectedFeature.id;

      let action = this.adiff.actions.find(action => {
        let element = action.new ?? action.old;
        return element.type === selectedFeature.properties.type &&
          element.id === selectedFeature.properties.id;
        });

      if (action) {
        this.options.onClick(event, action);
      }
    });
  }

  /// Rebuild the styles applied to the map by the adiff viewer. You should call
  /// this function after changing the viewer's `options`, or after modifying
  /// the basemap that the viewer is displayed on top of.
  refresh() {
    if (!this.map) return;

    let currentStyle = this.map.getStyle();

    currentStyle.sources = { ...currentStyle.sources, ...this.sources() };
    currentStyle.layers = [
      ...currentStyle.layers.filter(layer => !layer.id.startsWith("changeset-")),
      ...this.layers(),
    ]

    this.map.setStyle(currentStyle);
  }

  /// Select the given OSM element (visually highlighting it on the map)
  /// This function is intended to be used when a feature is clicked.
  select(type, id) {
    this.deselect();

    for (let fid of this._getFeatureIdsForElement(type, id)) {
      this.map.setFeatureState({ source: "changeset", id: fid }, { selected: true });
    }
  }

  /// Clear any selected OSM elements (removing visual highlight)
  deselect() {
    for (let fid of this.geojson.features.map(f => f.id)) {
      this.map.setFeatureState({ source: "changeset", id: fid }, { selected: false });
    }
  }

  /// Highlight the given OSM element. Highlighting differs from selecting in
  /// two ways:
  ///   1. There can be multiple highlighted features at once
  ///   2. Highlights must be removed from each feature by ID (there's no
  //       "clear all" function)
  /// Highlighting is intended for hover effects (as opposed to selecting,
  /// which is meant to be used on click).
  highlight(type, id) {
    this._setHighlight(type, id, true);
  }

  /// Remove highlight effect from the given OSM element
  unhighlight(type, id) {
    this._setHighlight(type, id, false);
  }

  _setHighlight(type, id, highlighted) {
    for (let fid of this._getFeatureIdsForElement(type, id)) {
      this.map.setFeatureState({ source: "changeset", id: fid }, { highlighted });
    }
  }

  _getFeatureIdsForElement(type, id) {
    return this.geojson.features
      .filter(f => f.properties.type === type && f.properties.id === id)
      .map(f => f.id);
  }
}

/// Euclidean modulo function (JavaScript's % operator implements truncated modulo)
function mod(n, m) {
  return ((n % m) + m) % m;
}
