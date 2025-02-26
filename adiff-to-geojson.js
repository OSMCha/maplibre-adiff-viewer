import bbox from "@turf/bbox";
import bboxPolygon from "@turf/bbox-polygon";
import { isArea } from "id-area-keys";
import deepEqual from "deep-equal";

function coordsAreEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function isClosed(coordsArray) {
  return coordsAreEqual(coordsArray[0], coordsArray[coordsArray.length - 1]);
}

function elementToGeoJSON(element) {
  let properties = { ...element };
  let geometry = null;

  switch (element.type) {
    case "node":
      {
        let { lon, lat } = element;
        // FIXME: bug-compatibility with real-changesets-parser
        let coordinates = lon !== undefined && lat !== undefined ? [+lon, +lat] : [];
        geometry = { type: "Point", coordinates };
      }
      break;
    case "way":
      {
        let { nodes } = element;
        let coordinates = nodes
          .filter((node) => node.lon !== undefined && node.lat !== undefined)
          .map(({ lon, lat }) => [+lon, +lat]);
        if (coordinates.length > 0 && isClosed(coordinates) && isArea(element.tags)) {
          geometry = { type: "Polygon", coordinates: [coordinates] };
        } else {
          geometry = { type: "LineString", coordinates };
        }
      }
      break;
    case "relation":
      {
        let members = element.members || [];

        let features = members
          .map(({ ref, role, ...member }) => elementToGeoJSON({ id: ref, ...member }))
          .map(f => { f.properties.action = "unchanged"; f.properties.side = "new"; return f; });

        properties.relations = features;

        // NOTE: members might not all have geometries, because child relations' members aren't
        // included in adiffs from adiffs.osmcha.org right now. bbox() will return an infinite
        // bounding box if these geometry-less members are included, so filter them out first.
        let bounds = bbox({ type: "FeatureCollection", features: features.filter((f) => f.geometry) });
        // Make sure the resulting bbox is finite before attaching it as a geometry for this
        // relation (it can be infinite if there were no features left after filtering above)
        if (bounds.every(v => Number.isFinite(v))) {
          geometry = bboxPolygon(bounds).geometry;
        }
      }
      break;
  }

  // erase unwanted properties
  delete properties.lon;
  delete properties.lat;
  delete properties.nodes;
  delete properties.members;

  return { type: "Feature", properties, geometry };
}

function adiffToGeoJSON({ actions }) {
  // let features = [];
  
  // this maps string IDs like "way/123456" to GeoJSON features.
  // each value is an array because in the case of modify actions
  // there are two versions of the feature (old and new) 
  let features = new Map();

  for (let idx in actions) {
    let action = actions[idx];
    let oldFeature = null;
    let newFeature = null;

    let id = action.new.type + "/" + action.new.id;
    
    if (action.type == "create" || action.type == "modify") {
      newFeature = elementToGeoJSON(action.new);
      newFeature.properties.action = action.type;
      newFeature.properties.side = "new";
      newFeature.properties.num_tags = Object.keys(newFeature.properties.tags).length;
    }

    if (action.type == "modify" || action.type == "delete") {
      oldFeature = elementToGeoJSON(action.old);
      oldFeature.properties.action = action.type;

      if (action.new.type == "relation" && action.new.version === action.old.version) {
        oldFeature.properties.action = "unchanged";
        newFeature.properties.action = "unchanged";
      };
      
      oldFeature.properties.side = "old";
      oldFeature.properties.num_tags = Object.keys(oldFeature.properties.tags).length;
    }

    if (action.type == "modify") {
      let tags_changed = !deepEqual(action.old.tags, action.new.tags, { strict: true });
      oldFeature.properties.tags_changed = tags_changed;
      newFeature.properties.tags_changed = tags_changed;
    }

    // if (oldFeature) features.push(oldFeature);
    // if (newFeature) features.push(newFeature);
    features.set(id, [oldFeature, newFeature].filter(Boolean));

    // HACK: (WIP, not working) need to add relation members, but
    // omit them if they're already in the diff as standalone
    // added/modified/deleted elements
    if (newFeature && newFeature.properties.relations) {
      for (let related of newFeature.properties.relations) {
        let id = related.properties.type + "/" + related.properties.id;
        if (!features.has(id)) {
          features.set(id, [related]);
        }
      }
    }
  }

  features = [...features.values()]
    .map((fs, idx) => fs.map(f => { f.id = idx; return f; }))
    .flat();

  return { type: "FeatureCollection", features };
}

export default adiffToGeoJSON;
