import { Graphics, Application } from 'pixi.js';

const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

const sqr = (x) => x * x;

const vecAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];

const vecMinus = (a, b) => [a[0] - b[0], a[1] - b[1]];

/**
 * Return whether a polygon's point set is in counter-clockwise order
 * @param {number[][]} points Points of a polygon
 * @returns {Boolean} Whether the polygon is in counter-clockwise order
 */
const isCCW = (points) => {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        sum += (x2 - x1) * (y2 + y1);
    }
    return sum > 0;
};

// Return whether a polygon is convex or not
// TODO: AI Generated, not tested
function isConvex(poly) {
    // let isCCW = 0;
    // let isCW = 0;
    // for (let i = 0; i < poly.n; i++) {
    //     const [x1, y1] = poly.points[i];
    //     const [x2, y2] = poly.points[(i + 1) % poly.n];
    //     const [x3, y3] = poly.points[(i + 2) % poly.n];
    //     const cross = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
    //     if (cross > 0) {
    //         isCCW++;
    //     } else if (cross < 0) {
    //         isCW++;
    //     }
    // }
    // return isCCW === 0 || isCW === 0;
    return true;
}

/**
 * Called by minkowskiSum when both A and B are convex
 * @param {number[][]} pointsA Coordinates of the first polygon
 * @param {number[][]} pointsB Coordinates of the second polygon
 * @returns {number[][]} Coordinates of the resulting polygon
 */
function convexMinkowskiSum(pointsA, pointsB) {
    let reorder = (points) => {
        // Find the up-left-most point
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
    let ret = [];

    let i = 0;
    let j = 0;

    while (i < a.length - 2 && j < b.length - 2) {
        ret.push(vecAdd(a[i], b[j]));
        let vecA = vecMinus(a[i + 1], a[i]);
        let vecB = vecMinus(b[j + 1], b[j]);
        let crossProduct = cross(vecA, vecB);
        // Note that the y-axis in pixijs is inverted
        if (crossProduct >= 0 && j < a.length - 2) j++;
        if (crossProduct <= 0 && i < b.length - 2) i++;
    }

    return ret;
}

/**
 * Symmetrically invert the points of a polygon about the origin
 * @param {number[2][]} points Points of a polygon
 * @returns {number[2][]} Resulting points
 */
export const invertPoints = (points) => {
    let inverted = [];
    for (let i = 0; i < points.length; i++) {
        inverted.push([-points[i][0], -points[i][1]]);
    }
    return inverted;
};

export class Polygon {
    constructor(points, filling) {
        // Number of points of this polygon
        this._n = points.length;
        // TODO: Check whether given points make a valid polygon.
        // TODO: Check polygon is convex or not.
        // Points of this polygon (ensure CCW order)
        this._points = points;
        if (!isCCW(points)) {
            this._points.reverse();
        }
        this._filling = filling;
        this._graphics = new Graphics();
        this._graphics.poly([].concat(...this._points));
        this._graphics.fill(filling);

        // Properties for whether allowed to transform
        this._translatable = false;
        this._scalable = false;
        this._rotatable = false;

        // Transformation properties
        this._offset = [0, 0];   // Translation
        this._scale = [1., 1.];
        this._rotation = 0; // In Radians
    }

    /**
     * Return the Minkowski sum of two polygons
     * @param {number[2][]} pointsA Coordinates of the first polygon
     * @param {number[2][]} pointsB Coordinates of the second polygon
     * @returns {number[2]} Coordinates of the resulting polygon
     */
    static minkowskiSum(pointsA, pointsB) {
        if (isConvex(pointsA) && isConvex(pointsB)) {
            return convexMinkowskiSum(pointsA, pointsB);
        }
    }

    /**
     * Return the Minkowski difference points of two polygon points
     * @param {number[2][]} pointsA Coordinates of the first polygon
     * @param {number[2][]} pointsB Coordinates of the second polygon
     * @returns {number[2][]} Coordinates of the resulting polygon
     */
    static minkowskiDiff(pointsA, pointsB) {
        let inverted = invertPoints(pointsB);
        return Polygon.minkowskiSum(pointsA, inverted);
    }

    /**
     * Return the SDF of a point X to a polygon.
     * Algorithm from the appendix of the paper "Minkowski Penalties"
     * 
     * TODO: This function has a correction multiplier '-1' to the result due to the inverted y-axis. Direct computation needed.
     * @param {number[2]} X coordiate of X
     * @param {number[2][]} points coordinates of the polygon
     * @returns {number} SDF value
     */
    static SDF(X, points) {
        let d = Number.POSITIVE_INFINITY;
        let e = true;
        let j = 0;
        let s = 1;
        let n = points.length;
        let v0 = vecMinus(points[0], points[n - 1]);
        for (let i = 0; i < n; i++) {
            let u = vecMinus(X, points[i]);
            let v = vecMinus(points[(i + 1) % n], points[i]);
            let z = dot(v, v);
            let udotv = dot(u, v);
            if (udotv >= 0 && udotv < z) {
                let dd = sqr(cross(u, v)) / z;
                if (dd < d) {
                    d = dd;
                    j = i;
                    e = true;
                }
            } else {
                let dd = dot(u, u);
                if (dd < d) {
                    d = dd;
                    s = 1;
                    e = false;
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
            return -1 * cross(u, v) / Math.sqrt(dot(v, v));
        } else {
            return -1 * s * Math.sqrt(d);
        }
    }

    getPoints() {
        return this._points;
    }

    setPoints(points) {
        this._points = points;
    }

    getN() {
        this._n = this._points.length;
        return this._n;
    }

    getOffset() {
        return this._offset;
    }

    setOffset(offset) {
        this._offset = offset;
        this._graphics.clear();
        this._graphics.translateTransform(offset[0], offset[1]);
        this._graphics.poly([].concat(...this._points));
        this._graphics.fill(this._filling);
    }

    setFilling(filling) {
        this._filling = filling;
        this._graphics.fill(filling);
    }

    getGraphics() {
        return this._graphics;
    }
}