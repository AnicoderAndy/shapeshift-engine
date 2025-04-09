//@ts-check
import { Polygon } from "./polygon";
import { polygonManager } from "./polygon_manager";
/**
 * @typedef {Object} SimplePolygon
 * @property {[number, number][]} vertexList
 * @property {string} filling
 */

/**
 * Convert a polygon by simplifying its properties and INVERTING Y-AXIS.
 * @param {Polygon} polygon Polygon object that needs to be converted.
 * @returns {SimplePolygon}
 */
function convertPolygon(polygon) {
    // Invert Y-axis
    /**@type {[number, number][]} */
    const invertedVertexList = polygon.getPoints().map(([x, y]) => [x, -y]);
    // Convert to simple polygon object
    return {
        vertexList: invertedVertexList,
        filling: polygon.getFilling(),
    };
}

/**
 * Get the list of polygons from the polygon manager.
 * @param {polygonManager} polyManager Polygon manager object of the current session.
 * @returns {SimplePolygon[]} List of polygon objects to be converted to SVG.
 */
function getPolygonList(polyManager) {
    const polygons = polyManager.getList().map(pG => pG.getPolygon());
    const simplePolygons = polygons.map(convertPolygon);
    return simplePolygons;
}

/**
 * Convert Polygon objects to SVG format.
 * @param {SimplePolygon[]} polygons
 * @param {object} [options]
 * @param {number} [options.width] SVG Canvas width, `default` = max(x)
 * @param {number} [options.height] SVG Canvas height, `default` = max(y)
 * @param {number} [options.padding] Canvas inner padding, `default` = 0
 * @returns {string} SVG String
 */
function polygonsToSVG(polygons, options = {}) {
    const padding = options.padding || 0;

    // Find max x, y to get the canvas size
    const allPoints = polygons.flatMap(poly => poly.vertexList);
    const xs = allPoints.map(p => p[0]);
    const ys = allPoints.map(p => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const width = options.width != null
        ? options.width
        : (maxX - minX) + padding * 2;
    const height = options.height != null
        ? options.height
        : (maxY - minY) + padding * 2;

    // SVG Header
    const header = `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `viewBox="${minX - padding} ${minY - padding} ${width} ${height}" ` +
        `width="${width}" height="${height}">`;

    // Generate SVG <polygon> elements
    const body = polygons.map(({ vertexList: polygonList, filling }) => {
        const pointsAttr = polygonList
            .map(([x, y]) => `${x},${y}`)
            .join(' ');
        return `  <polygon points="${pointsAttr}" fill="${filling}" />`;
    }).join('\n');

    const footer = `</svg>`;

    return [header, body, footer].join('\n');
}

/**
 * Convert the polygon manager to SVG
 * @param {polygonManager} polyManager 
 * @returns {string} SVG String
 */
export function polygon2svg(polyManager, options = {}) {
    const polygons = getPolygonList(polyManager);
    return polygonsToSVG(polygons, options);
}