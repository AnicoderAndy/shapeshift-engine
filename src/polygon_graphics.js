import { Graphics } from "pixi.js";

function convertToPixiPoints(polygon) {
    let ret = [];
    for (let i = 0; i < polygon._vertexList.length; i++) {
        ret.push(polygon._vertexList[i][0]);
        ret.push(-polygon._vertexList[i][1]);
    }
    return ret;
}

export class polygonGraphics {
    constructor(polygon) {
        // Polygon object
        this._polygon = polygon;
        // Graphics object
        this._graphics = new Graphics();
        // Setup graphics
        this.setupGraphics();
    }

    setupGraphics() {
        this._graphics.clear();
        this._graphics.poly(convertToPixiPoints(this._polygon));
        this._graphics.fill(this._polygon.getFilling());
    }

    setVertexList(vertexList) {
        this._polygon._vertexList = vertexList;
        this.setupGraphics();
    }

    getPolygon() {
        return this._polygon;
    }

    getGraphics() {
        return this._graphics;
    }

    destroy() {
        this._graphics.destroy();
    }
}