//@ts-check
/**
 * 
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {number}
 */
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

/**
 * 
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {number}
 */
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

/**
 * Return x * x
 * @param {number} x 
 * @returns {number}
 */
export const sqr = (x) => x * x;

/**
 * 
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {[number, number]}
 */
export const vecAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];

/**
 * 
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {[number, number]}
 */
export const vecMinus = (a, b) => [a[0] - b[0], a[1] - b[1]];

/**
 * Return the NOT-NORMALIZED direction from a to b.
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {[number, number]}
 */
export const direction = (a, b) => vecMinus(b, a);

/**
 * @param {[number, number]} a 
 * @param {[number, number]} b 
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b
 */
export const compareXY = (a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
}

/**
 * Return the orientation of the triplet (p, q, r)
 * @param {[number, number]} p 
 * @param {[number, number]} q 
 * @param {[number, number]} r 
 * @returns {number} 0 if p, q, r are collinear,
 *                   -1 if r is on the left side of pq,
 *                   1 if r is on the right side of pq.
 */
export const orientation = (p, q, r) => {
    let val = cross(vecMinus(q, p), vecMinus(r, p));
    if (val == 0) return 0;
    return val > 0 ? -1 : 1;
}

/**
 * Returns true iff p is upper than the x-axis.
 * @param {[number, number]} p 
 * @returns {boolean}
 */
const isUpper = (p) => p[1] > 0 || (p[1] == 0 && p[0] > 0);

/**
 * Compare to directions by their angle to the +x-axis.
 * @param {[number, number]} p 
 * @param {[number, number]} q 
 * @returns {number} -1 if p is lower than q; 1 if upper; 0 if collinear.
 */
export const compareDirection = (p, q) => {
    if (isUpper(p) && !isUpper(q)) return -1;
    if (!isUpper(p) && isUpper(q)) return 1;
    const c = cross(p, q);
    if (c == 0) return 0;
    return c > 0 ? -1 : 1;
}

/**
 * Returns true iff d is not equal to d1, and while rotating 
 * counterclockwise starting at d1, d is reached strictly before d2 is reached. 
 * Note that true is returned if d1 == d2, unless also d == d1.
 * @param {[number, number]} d
 * @param {[number, number]} d1
 * @param {[number, number]} d2
 * @returns {boolean}
 */
export const ccwInBetween = (d, d1, d2) => {
    if (compareDirection(d, d1) == -1) {
        return (compareDirection(d, d2) == -1) || (compareDirection(d2, d1) != 1);
    } else {
        return (compareDirection(d, d2) == -1) && (compareDirection(d2, d1) != 1);
    }
}

/**
 * Returns true iff the straight line ab intersects with the line cd.
 * @param {[number, number]} a Point
 * @param {[number, number]} b Point
 * @param {[number, number]} c Point
 * @param {[number, number]} d Point
 * @returns {boolean} True iff the line segment ab and cd are collinear.
 */
export const isCollinearLine = (a, b, c, d) =>
    orientation(a, b, c) == 0 && orientation(a, b, d) == 0;

/**
 * Returns true iff the straight line ab intersects with the line cd.
 * @param {[number, number]} a Point
 * @param {[number, number]} b Point
 * @param {[number, number]} c Point
 * @param {[number, number]} d Point
 * @returns {boolean} True iff the line segment ab and cd are collinear.
 */
export const isIntersectingLine = (a, b, c, d) => {
    if (isCollinearLine(a, b, c, d)) {
        return false;
    }
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    /**
     * Helper function to check if point q lies on line segment 'pr'.
     * @param {[number, number]} p
     * @param {[number, number]} q
     * @param {[number, number]} r
     * @returns {boolean} Result
     */
    const onSegment = (p, q, r) => {
        return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
            q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1]);
    }
    return (o1 != o2 && o3 != o4) || (o1 == 0 && onSegment(a, c, b)) || (o2 == 0 && onSegment(a, d, b)) || (o3 == 0 && onSegment(c, a, d)) || (o4 == 0 && onSegment(c, b, d));
}
