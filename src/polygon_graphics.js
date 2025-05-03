//@ts-check
/**
 * Polygon_graphics class for polygons to interact with pixi.js
 * @author Qiu Jingye <anicoder@outlook.com>
 */

import { Graphics, Text } from 'pixi.js';
import { Polygon } from './polygon';

/**
 * @param {Polygon} polygon
 * @returns {number[]} List that can be used directly in poly() in pixi
 */
function convertToPixiPoints(polygon) {
    let ret = [];
    for (let i = 0; i < polygon._vertexList.length; i++) {
        ret.push(polygon._vertexList[i][0]);
        ret.push(-polygon._vertexList[i][1]);
    }
    return ret;
}

/**
 * Draw a line in graphics.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {Graphics} graphics
 * @param {string} filling
 */
function line(x1, y1, x2, y2, graphics, filling) {
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.stroke(filling);
}

export class polygonGraphics {
    /**
     * @param {Polygon} polygon
     * @param {Boolean} isText
     * @param {Text | null} textObject
     */
    constructor(polygon, isText, textObject = null) {
        // Polygon object
        this._polygon = polygon;
        this._isText = isText;
        // Graphics object
        if (!isText) {
            this._graphics = new Graphics();
        } else {
            this._textObject = textObject;
        }
        // Setup graphics
        this.setupGraphics();
    }

    setupGraphics() {
        if (!this._isText && this._graphics) {
            this._graphics.clear();
            if (this._polygon.getN() == 2) {
                const x1 = this._polygon._vertexList[0][0];
                const y1 = -this._polygon._vertexList[0][1]; // note: inverted y-axis
                const x2 = this._polygon._vertexList[1][0];
                const y2 = -this._polygon._vertexList[1][1];
                line(
                    x1,
                    y1,
                    x2,
                    y2,
                    this._graphics,
                    this._polygon.getFilling()
                );
            }
            this._graphics.poly(convertToPixiPoints(this._polygon));
            this._graphics.fill(this._polygon.getFilling());
        } else if (this._isText && this._textObject) {
            return;
        }
    }

    setVertexList(vertexList) {
        this._polygon._vertexList = vertexList;
        this.setupGraphics();
    }

    getPolygon() {
        return this._polygon;
    }

    /**@returns {Graphics} */
    getGraphics() {
        return /**@type {Graphics} */ (this._graphics);
    }

    /**@returns {Text} */
    getTextObject() {
        return /**@type {Text} */ (this._textObject);
    }

    destroy() {
        if (this._graphics) {
            this._graphics.destroy();
            this._graphics = undefined;
        }
        if (this._textObject) {
            this._textObject.destroy();
            this._textObject = undefined;
        }
    }
}
