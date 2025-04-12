//@ts-check
/**
 * Polygon class for creating and manipulating polygons,
 * providing operations like Minkowski sum, and SDF.
 * @author Qiu Jingye   <anicoder@outlook.com>
 */

import { cross, dot, vecAdd, vecMinus, sqr, isIntersectingLine } from './utilities'
import ClipperLib from 'clipper-lib';

/**
 * Symmetrically invert the points of a polygon about the origin
 * @param {[number, number][]} points Points of a polygon
 * @returns {[number, number][]} Resulting points
 */
const invertPoints = (points) => {
    /**@type {[number, number][]} */
    let inverted = [];
    for (let i = 0; i < points.length; i++) {
        inverted.push([-points[i][0], -points[i][1]]);
    }
    return inverted;
};

/**
 * Return whether a polygon's point set is in counter-clockwise order
 * @param {number[][]} vertices Vertices of a polygon
 * @returns {Boolean} Whether the polygon is in counter-clockwise order
 */
const isCCW = (vertices) => {
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[(i + 1) % vertices.length];
        sum += (x2 - x1) * (y2 + y1);
    }
    return sum < 0;
};

/**
 * Return whether a polygon is convex.
 * @param {[number, number][]} vertices Vertices of the polygon.
 * @returns {Boolean} Whether the polygon is convex.
 */
function isConvex(vertices) {
    let isCW = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[(i + 1) % n];
        const [x3, y3] = vertices[(i + 2) % n];
        const cross = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
        if (cross < 0) {
            isCW++;
            break;
        }
    }
    return isCW === 0;
}

/**
 * Called by minkowskiSum when both A and B are convex
 * @param {[number, number][]} pointsA Coordinates of the first polygon
 * @param {[number, number][]} pointsB Coordinates of the second polygon
 * @returns {[number, number][]} Coordinates of the resulting polygon
 */
function convexMinkowskiSum(pointsA, pointsB) {
    let reorder = (points) => {
        // Find the down-left-most point
        let pos = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][1] < points[pos][1] || (points[i][1] === points[pos][1] && points[i][0] < points[pos][0])) {
                pos = i;
            }
        }
        return points.slice(pos).concat(points.slice(0, pos));
    }

    let a = reorder(pointsA);
    let b = reorder(pointsB);
    a.push(a[0], a[1]);
    b.push(b[0], b[1]);

    /**@type {[number, number][]} */
    let ret = [];
    let i = 0;
    let j = 0;

    while (i < a.length - 2 || j < b.length - 2) {
        ret.push(vecAdd(a[i], b[j]));
        let vecA = vecMinus(a[i + 1], a[i]);
        let vecB = vecMinus(b[j + 1], b[j]);
        let crossProduct = cross(vecA, vecB);
        // Note that the y-axis in pixijs is inverted
        if (crossProduct >= 0 && i < a.length - 2) i++;
        if (crossProduct <= 0 && j < b.length - 2) j++;
    }

    return ret;
}

export class Polygon {
    constructor(vertexList, filling) {
        // Number of points of this polygon
        /**@type {number} */
        this._n = vertexList.length;
        // Vertices of this polygon (ensure CCW order)
        /**@type {[number, number][]} */
        this._vertexList = vertexList;
        if (!isCCW(vertexList)) {
            this._vertexList.reverse();
        }
        this._filling = filling;

        // Properties for whether allowed to transform
        this._translatable = true;

        // Transformation properties
        /**@type {[number, number]} */
        this._translation = [0, 0];   // Translation
    }

    /**
     * Return the Minkowski sum of two polygons
     * @param {[number, number][]} pointsA Coordinates of the first polygon
     * @param {[number, number][]} pointsB Coordinates of the second polygon
     * @returns {[number, number][]} Coordinates of the resulting polygon
     */
    static minkowskiSum(pointsA, pointsB) {
        if (isConvex(pointsA) && isConvex(pointsB)) {
            return convexMinkowskiSum(pointsA, pointsB);
        }
        let pathA = [];
        let pathB = [];
        for (let i = 0; i < pointsA.length; i++) {
            pathA.push({ X: pointsA[i][0], Y: pointsA[i][1] });
        }
        for (let i = 0; i < pointsB.length; i++) {
            pathB.push({ X: pointsB[i][0], Y: pointsB[i][1] });
        }
        const result = ClipperLib.Clipper.MinkowskiSum(pathA, pathB, true)[0];
        /**@type {[number, number][]} */
        let ret = [];
        for (let i = 0; i < result.length; i++) {
            ret.push([result[i].X, result[i].Y]);
        }
        return ret;
    }

    /**
     * Return the Minkowski difference points of two polygon points
     * @param {[number, number][]} pointsA Coordinates of the first polygon
     * @param {[number, number][]} pointsB Coordinates of the second polygon
     * @returns {[number, number][]} Coordinates of the resulting polygon
     */
    static minkowskiDiff(pointsA, pointsB) {
        let inverted = invertPoints(pointsB);
        return Polygon.minkowskiSum(pointsA, inverted);
    }

    /**
     * Return the SDF of a point X to a polygon.
     * Algorithm from the appendix of the paper "Minkowski Penalties"
     * @param {[number, number]} X coordiate of X
     * @param {[number, number][]} points coordinates of the polygon
     * @returns {number} SDF value
     */
    static SDF(X, points) {
        let d = Number.POSITIVE_INFINITY;
        let e = true;
        let j = 0;
        let s = 1;
        const n = points.length;
        let v0 = vecMinus(points[0], points[n - 1]);
        for (let i = 0; i < n; i++) {
            let u = vecMinus(X, points[i]);
            let v = vecMinus(points[(i + 1) % n], points[i]);
            let z = dot(v, v);
            let udotv = dot(u, v);
            if (udotv >= 0 && udotv < z) {
                let dd = sqr(cross(u, v)) / z;
                if (dd < d) {
                    if (dd < d) {
                        d = dd, j = i, e = true;
                    }
                }
            } else {
                let dd = dot(u, u);
                if (dd < d) {
                    d = dd, s = 1, e = false;
                    if (cross(v0, v) < 0) {
                        s = -1;
                    }
                }
            }
            v0 = v;
        }
        if (e) {
            let u = vecMinus(X, points[j]);
            let v = vecMinus(points[(j + 1) % n], points[j]);
            return cross(u, v) / Math.sqrt(dot(v, v));
        } else {
            return s * Math.sqrt(d);
        }
    }

    /**
     * Check if the polygon is simple.
     * @param {[number, number][]} vertices Vertices of the polygon.
     * @returns {boolean} Whether the polygon is simple.
     */
    static isSimplePolygon(vertices) {
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                // Skip adjacent edges and the same edge
                if (Math.abs(i - j) === 1 || (i === 0 && j === n - 1)) continue;
                if (isIntersectingLine(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n])) {
                    return false;
                }
            }
        }
        return true;
    }

    getPoints() {
        return this._vertexList;
    }

    setVertexList(vertexList) {
        this._vertexList = vertexList;
    }

    getN() {
        this._n = this._vertexList.length;
        return this._n;
    }

    getTranslation() {
        return this._translation;
    }

    /**
     * @param {[number, number]} translation
     */
    setTranslation(translation) {
        this._translation = translation;
    }

    /**
     * Update the vertices by applying transformation.
     * Then **clear the transformation**.
     */
    applyTransformation() {
        let points = [];
        for (let i = 0; i < this._vertexList.length; i++) {
            points.push(vecAdd(this._vertexList[i], this._translation));
        }
        this._translation = [0, 0];
        this.setVertexList(points);
    }

    setFilling(filling) {
        this._filling = filling;
    }

    getFilling() {
        return this._filling;
    }

    setTranslatable(translatable) {
        this._translatable = translatable;
    }

    getTranslatable() {
        return this._translatable;
    }
}