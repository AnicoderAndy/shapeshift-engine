//@ts-check
import { Polygon } from "./polygon";
import { Application, Graphics, Ticker } from "pixi.js";
import { polygonGraphics } from "./polygon_graphics";
import { beginOptimization } from "./diff_func";
/**
 * @typedef {Object} Relation
 * @property {[number, number][]} notOverlap
 * @property {[number, number][]} overlap
 * @property {[number, number][]} tangent
 * @property {[number, number][]} contain
 */

function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * 
 * @param {Graphics} graphicsRef 
 * @returns {import("pixi.js").TickerCallback<any>}
 */
function makeFlickerHandler(graphicsRef) {
    /**
     * @param {Ticker} ticker 
     */
    const flicker = (ticker) => {
        let alphaDirection = -0.05;
        graphicsRef.alpha += alphaDirection;
        if (graphicsRef.alpha <= 0.2 || graphicsRef.alpha >= 1) {
            alphaDirection *= -1;
        }
    };
    return flicker;
}

// Function to check if two line segments intersect
function doLinesIntersect(p1, q1, p2, q2) {

    // Helper function to find the orientation of the ordered triplet (p, q, r)
    function orientation(p, q, r) {
        const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
        if (val === 0) return 0; // collinear
        return val > 0 ? 1 : 2; // clock or counterclockwise
    }

    // Helper function to check if point q lies on line segment 'pr'
    function onSegment(p, q, r) {
        return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
            q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1]);
    }

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
}

// Check if the polygon is simple
function isSimplePolygon(vertices) {
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            // Skip adjacent edges and the same edge
            if (Math.abs(i - j) === 1 || (i === 0 && j === n - 1)) continue;

            if (doLinesIntersect(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n])) {
                return false;
            }
        }
    }
    return true;
}

export class polygonManager {
    /**
     * 
     * @param {Application} app 
     * @param {Element} uiPolyList
     * @param {{randomColorInput: HTMLInputElement; polygonColorInput: HTMLInputElement;}} colorInput
     */
    constructor(app, uiPolyList, colorInput) {
        // Pixijs application
        this._app = app;
        // List of managed polygons
        /**@type {polygonGraphics[]} */
        this._polyGraphicsList = [];
        // Relations between polygons
        /**@type {Relation} */
        this._relation = { notOverlap: [], overlap: [], tangent: [], contain: [] };
        // Parameters to be optimized
        this._param = [];
        // Number of parameters for each polygon
        this._paramSize = 2;
        // Number of parameters for all polygons
        this._totParameter = 0;
        // Indicator of the status of drawing polygon
        this._drawingPolygon = false;
        // List of the polygon vertices currently being drawn
        this._currentVertices = [];
        // Current polygonGraphics object
        this._currentPolygonGraphics = new polygonGraphics(new Polygon([], 'red'));
        // Handler instance for canvasDrawPolygonHandler
        this._canvasDrawPolygonHandler = this.canvasDrawPolygonHandler.bind(this);
        // PolyList in index.html
        this._uiPolyList = uiPolyList;
        // Color Input controls
        this._colorController = colorInput;
    }

    getList() {
        return this._polyGraphicsList;
    }

    /**
     * Create graphics for a polygon.
     * Add both the polygon and the graphics to the manager.
     * Display the polygon on the screen.
     * @param {Polygon} poly to be added. 
     */
    pushPolygon(poly) {
        const pG = new polygonGraphics(poly);
        this._polyGraphicsList.push(pG);
        this._app.stage.addChild(pG.getGraphics());
        this._param.push(0, 0);
    }

    /**
     * Add a constraint relation to the polygon manager.
     * 
     * TODO: Check validity of the relation and the index
     * @param {number} relation 0-notOverlap, 1-overlap, 2-tangent, 3-contain
     * @param {number} index1 index of the first polygon
     * @param {number} index2 index of the second polygon
     */
    addRelation(relation, index1, index2) {
        if (relation == 0) {
            this._relation.notOverlap.push([index1, index2]);
        } else if (relation == 1) {
            this._relation.overlap.push([index1, index2]);
        } else if (relation == 2) {
            this._relation.tangent.push([index1, index2]);
        } else if (relation == 3) {
            this._relation.contain.push([index1, index2]);
        } else {
            throw new Error("Invalid relation type.");
        }
    }

    canvasDrawPolygonHandler(e) {
        this._currentVertices.push([e.offsetX, -e.offsetY]);
        console.log(e.offsetX, -e.offsetY);
        if (this._currentVertices.length >= 2) {
            this._currentPolygonGraphics.setVertexList([...this._currentVertices]);
            this._app.stage.addChild(this._currentPolygonGraphics.getGraphics());
        }
    }

    drawPolyHandler(event) {
        this._drawingPolygon = !this._drawingPolygon;
        const button = event.currentTarget;

        button.textContent = this._drawingPolygon ? 'Drawing...Click again to confirm' : 'New Polygon';
        console.log('Drawing: ', this._drawingPolygon);

        if (this._drawingPolygon) {
            this._app.canvas.addEventListener('click', this._canvasDrawPolygonHandler);
        } else {
            if (this._currentVertices.length < 2) {
                console.error("A polygon must have at least 2 vertices.");
                alert("A polygon must have at least 2 vertices.");
                this._currentVertices = [];
                return;
            }

            // Check if the polygon is simple
            if (!isSimplePolygon(this._currentVertices)) {
                console.error("The polygon is not simple (edges intersect). Please redraw.");
                alert("The polygon is not simple (edges intersect). Please redraw.");

                // remove the graphics from the stage
                if (this._currentPolygonGraphics) {
                    this._app.stage.removeChild(this._currentPolygonGraphics.getGraphics());
                    this._currentPolygonGraphics.destroy();
                    this._currentPolygonGraphics = new polygonGraphics(new Polygon([], 'red'));
                }

                this._currentVertices = [];
                return;
            }

            const color = this._colorController.randomColorInput.checked ? getRandomColor() : this._colorController.polygonColorInput.value;
            const newPoly = new Polygon([...this._currentVertices], color);
            this.pushPolygon(newPoly);

            if (this._currentPolygonGraphics) {
                this._currentPolygonGraphics.destroy();
                this._currentPolygonGraphics = new polygonGraphics(new Polygon([], 'red'));
                this._currentVertices = [];
            }

            this._app.canvas.removeEventListener('click', this._canvasDrawPolygonHandler);

            let li = document.createElement('li');
            const polygonIndex = this.size() - 1;
            li.innerHTML = `Polygon ${polygonIndex}`;
            this._uiPolyList.appendChild(li);
            li.addEventListener('click', () => {
                const graphicsRef = this._polyGraphicsList[polygonIndex].getGraphics();
                const flicker = makeFlickerHandler(graphicsRef);
                this._app.ticker.add(flicker);
                setTimeout(() => {
                    this._app.ticker.remove(flicker);
                    graphicsRef.alpha = 1;
                }, 250);
            });
        }
    }

    /**
     * Set relation and stores them in the manager. A relation is a list of pairs of polygon indices.
     * @param {[number, number][]} notOverlap Relationships of not overlapping polygons
     * @param {[number, number][]} overlap Relationships of overlapping polygons.
     * @param {[number, number][]} tangent Relationships of tangenting polygons.
     * @param {[number, number][]} contain Relationships of B containing A.
     */
    setRelation(notOverlap, overlap, tangent, contain) {
        this._relation.notOverlap = notOverlap;
        this._relation.overlap = overlap;
        this._relation.tangent = tangent;
        this._relation.contain = contain;
    }

    getRelation() {
        return this._relation;
    }

    /**
     * Return the first parameter index of the inquired polygon.
     * @param {number} polyIndex Index of the inquired polygon.
     * @returns {number} Index of the inquiry.
     */
    getParamIndex(polyIndex) {
        return polyIndex * this._paramSize;
    }

    /**
     * Calculate and return number of parameters for all polygons.
     * @returns {number} Total number of parameters for all polygons.
     */
    getTotParameter() {
        this._totParameter = this._polyGraphicsList.length * this._paramSize;
        return this._totParameter;
    }

    getPoints(index) {
        return this._polyGraphicsList[index].getPolygon().getPoints();
    }

    setPolygonProperty(index, propertyName, propertyValue) {
        this._polyGraphicsList[index].getPolygon()[propertyName] = propertyValue;
    }

    /**
     * Return how many polygons the manager is holding.
     * @returns {number}
     */
    size() {
        return this._polyGraphicsList.length;
    }

    applyTransformation() {
        for (let i = 0; i < this._polyGraphicsList.length; i++) {
            this._polyGraphicsList[i].getPolygon().setTranslation([this._param[this.getParamIndex(i)], this._param[this.getParamIndex(i) + 1]]);
            this._polyGraphicsList[i].getPolygon().applyTransformation();
            this._polyGraphicsList[i].setupGraphics();
        }
    }

    setFix(fixedPolygons) {
        for (let i = 0; i < fixedPolygons.length; i++) {
            this.setPolygonProperty(fixedPolygons[i], '_translatable', false);
        }
    }

    async optimize(eta) {
        this._param = await beginOptimization(this, eta);
        this.applyTransformation();
    }
}