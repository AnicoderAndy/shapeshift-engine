//@ts-check
import { Polygon } from './polygon';
import { Application, Graphics, Text } from 'pixi.js';
import { polygonGraphics } from './polygon_graphics';
import { beginOptimization } from './diff_func';

/**
 * @typedef {Object} Relation
 * @property {[number, number][]} notOverlap
 * @property {[number, number][]} overlap
 * @property {number[]} fixed
 */

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return '#' + color;
}

/**
 * Generate a flicker handler for a specific Graphics object.
 * @param {Graphics | Text} graphicsRef The Graphics object to flicker.
 * @returns {import("pixi.js").TickerCallback<any>} The flicker handler function.
 */
function makeFlickerHandler(graphicsRef) {
    const flicker = () => {
        let alphaDirection = -0.05;
        graphicsRef.alpha += alphaDirection;
        if (graphicsRef.alpha <= 0.2 || graphicsRef.alpha >= 1) {
            alphaDirection *= -1;
        }
    };
    return flicker;
}

export class polygonManager {
    /**
     * @typedef {Object} ControlElements
     * @property {Element} uiPolyList
     * @property {HTMLInputElement} textInput
     * @property {HTMLInputElement} fontFamilyInput
     * @property {HTMLInputElement} fontSizeInput
     * @property {{randomColorInput: HTMLInputElement; polygonColorInput: HTMLInputElement;}} colorInput
     * @property {{notOverlapInput: HTMLInputElement; overlapInput: HTMLInputElement; fixInput: HTMLInputElement;}} relationInput
     */
    /**
     * Create a polygonManager object.
     * @param {Application} app
     * @param {ControlElements} htmlElements
     */
    constructor(app, htmlElements) {
        // Pixijs application
        this._app = app;
        // List of managed polygons
        /**@type {polygonGraphics[]} */
        this._polyGraphicsList = [];
        // Relations between polygons
        /**@type {Relation} */
        this._relation = { notOverlap: [], overlap: [], fixed: [] };
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
        this._currentPolygonGraphics = new polygonGraphics(
            new Polygon([], 'red'),
            false
        );
        // Handler instance for canvasDrawPolygonHandler
        this._canvasDrawPolygonHandler =
            this.canvasDrawPolygonHandler.bind(this);
        // PolyList in index.html
        this._uiPolyList = htmlElements.uiPolyList;
        // Color Input controls
        this._colorController = htmlElements.colorInput;
        // Relation inputs
        this._relationInput = htmlElements.relationInput;
        // Text inputs
        this._textInput = htmlElements.textInput;
        this._fontSizeInput = htmlElements.fontSizeInput;
        this._fontFamilyInput = htmlElements.fontFamilyInput;
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
        const pG = new polygonGraphics(poly, false);
        this._polyGraphicsList.push(pG);
        this._app.stage.addChild(pG.getGraphics());
        this._param.push(0, 0);

        // Add the polygon to the uiList
        let li = document.createElement('li');
        const polygonIndex = this.size() - 1;
        li.innerHTML = `Polygon ${polygonIndex}`;
        this._uiPolyList.appendChild(li);
        li.addEventListener('click', () => {
            const graphicsRef =
                this._polyGraphicsList[polygonIndex].getGraphics();
            const flicker = makeFlickerHandler(graphicsRef);
            this._app.ticker.add(flicker);
            setTimeout(() => {
                this._app.ticker.remove(flicker);
                graphicsRef.alpha = 1;
            }, 250);
        });
    }

    /**
     * @typedef {Object} TextOptions
     * @property {[number, number]} [position] - The position of the text.
     * @property {number} [size] - The size of the text.
     * @property {string} [fontFamily] - The font family of the text.
     */
    /**
     * Add a text to the canvas.
     * @param {String} text The textString to be added to the canvas.
     * @param {TextOptions} [options]
     */
    pushText(text, options = {}) {
        const {
            position = [500, -400],
            size = 16,
            fontFamily = 'Arial',
        } = options;

        const x = position[0];
        const y = position[1];
        const pixiTextObject = new Text({
            text,
            x,
            y: -y,
            style: {
                fontSize: size,
                fontFamily: fontFamily,
            },
        });
        const bounds = pixiTextObject.bounds;
        const xOff = bounds.maxX - bounds.minX;
        const yOff = bounds.maxY - bounds.minY;
        const newPoly = new Polygon(
            [
                [x, y],
                [x, y - yOff],
                [x + xOff, y - yOff],
                [x + xOff, y],
            ],
            'yellow',
            { textString: text, fontFamily, fontSize: size }
        );
        const pG = new polygonGraphics(newPoly, true, pixiTextObject);
        this._polyGraphicsList.push(pG);
        this._app.stage.addChild(pixiTextObject);
        this._param.push(0, 0);

        let li = document.createElement('li');
        const polygonIndex = this.size() - 1;
        li.innerHTML = `Text ${polygonIndex}`;
        this._uiPolyList.appendChild(li);
        li.addEventListener('click', () => {
            const graphicsRef =
                this._polyGraphicsList[polygonIndex].getTextObject();
            const flicker = makeFlickerHandler(graphicsRef);
            this._app.ticker.add(flicker);
            setTimeout(() => {
                this._app.ticker.remove(flicker);
                graphicsRef.alpha = 1;
            }, 250);
        });
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
        } else {
            throw new Error('Invalid relation type.');
        }
    }

    /**
     * Handler for the canvas object to obtain user's clicking position,
     * and pushing the offset to the current vertices list.
     * @param {MouseEvent} e
     */
    canvasDrawPolygonHandler(e) {
        this._currentVertices.push([e.offsetX, -e.offsetY]);
        console.log(
            `Drawing info: A point (${
                e.offsetX
            }, ${-e.offsetY}) is added to the polygon.`
        );
        if (this._currentVertices.length >= 2) {
            this._currentPolygonGraphics.setVertexList([
                ...this._currentVertices,
            ]);
            this._app.stage.addChild(
                this._currentPolygonGraphics.getGraphics()
            );
        }
    }

    drawPolyHandler(e) {
        this._drawingPolygon = !this._drawingPolygon;
        const button = e.currentTarget;

        button.textContent = this._drawingPolygon
            ? 'Drawing...Click again to confirm'
            : 'New Polygon';
        console.log('Drawing info: drawing mode ==', this._drawingPolygon);

        if (this._drawingPolygon) {
            this._app.canvas.addEventListener(
                'click',
                this._canvasDrawPolygonHandler
            );
        } else {
            // Not enough vertices:
            if (this._currentVertices.length < 2) {
                console.error(
                    'Invalid polygon detected: not enough vertices, at least 2 vertices are needed.'
                );
                alert('A polygon must have at least 2 vertices.');
                this.clearCurrentPolygon();
                return;
            }

            // Not Simple:
            else if (!Polygon.isSimplePolygon(this._currentVertices)) {
                console.error('Invalid polygon detected: edges intersect');
                alert(
                    'The polygon is not simple (edges intersect). Please redraw.'
                );
                this.clearCurrentPolygon();
                return;
            }

            const color = this._colorController.randomColorInput.checked
                ? getRandomColor()
                : this._colorController.polygonColorInput.value;
            const newPoly = new Polygon([...this._currentVertices], color);
            this.pushPolygon(newPoly);

            this.clearCurrentPolygon();
            this._app.canvas.removeEventListener(
                'click',
                this._canvasDrawPolygonHandler
            );
        }
    }

    newTextHandler(e) {
        const textString = this._textInput.value;
        const fontFamily = this._fontFamilyInput.value;
        const fontSize = Number(this._fontSizeInput.value);
        this._textInput.value = '';

        this.pushText(textString, { fontFamily, size: fontSize });
        console.log('Text info: A text object has been successfully added.');
    }

    clearCurrentPolygon() {
        // remove the graphics from the stage
        if (this._currentPolygonGraphics) {
            this._app.stage.removeChild(
                this._currentPolygonGraphics.getGraphics()
            );
            this._currentPolygonGraphics.destroy();
            this._currentPolygonGraphics = new polygonGraphics(
                new Polygon([], 'red'),
                false
            );
        }
        this._currentVertices = [];
    }

    // Fetch relations from the HTMLInput elements
    updateRelation() {
        this._relation.notOverlap =
            eval(this._relationInput.notOverlapInput.value) ?? [];
        this._relation.overlap =
            eval(this._relationInput.overlapInput.value) ?? [];
        this._relation.fixed = eval(this._relationInput.fixInput.value) ?? [];
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

    /**
     * Get the vertex list of a polygon by giving its index.
     * @param {number} index The index of the polygon.
     * @returns VertexList of the required polygon.
     */
    getPoints(index) {
        return this._polyGraphicsList[index].getPolygon().getPoints();
    }

    /**
     * Set a specific property by giving property name, polygon index, and its value.
     * @param {number} index The index of the polygon
     * @param {string} propertyName Name of the property to be set
     * @param {any} propertyValue Property value.
     */
    setPolygonProperty(index, propertyName, propertyValue) {
        this._polyGraphicsList[index].getPolygon()[propertyName] =
            propertyValue;
    }

    /**
     * Return how many polygons the manager is holding.
     * @returns {number}
     */
    size() {
        return this._polyGraphicsList.length;
    }

    /**
     * Apply transformation by setting the coordinates and clearing transformation properties.
     *
     * Important: This operation may also lead to the update of the graphics.
     */
    applyTransformation() {
        for (let i = 0; i < this._polyGraphicsList.length; i++) {
            this._polyGraphicsList[i]
                .getPolygon()
                .setTranslation([
                    this._param[this.getParamIndex(i)],
                    this._param[this.getParamIndex(i) + 1],
                ]);
            this._polyGraphicsList[i].getPolygon().applyTransformation();
            if (!this._polyGraphicsList[i]._isText) {
                this._polyGraphicsList[i].setupGraphics();
            } else {
                this._polyGraphicsList[i]
                    .getTextObject()
                    .position.set(
                        this._polyGraphicsList[i]
                            .getPolygon()
                            .getPoints()[0][0],
                        -this._polyGraphicsList[i]
                            .getPolygon()
                            .getPoints()[0][1]
                    );
            }
        }
    }

    /**
     * Clear the current context and load a context from JSON.
     * @param {string} json Imported json string.
     */
    loadJson(json) {
        /**@type {{ polygons: Polygon[], relations: Relation}} */
        const data = JSON.parse(json);
        this._polyGraphicsList = [];
        this._relationInput.notOverlapInput.value = JSON.stringify(
            data.relations.notOverlap
        );
        this._relationInput.overlapInput.value = JSON.stringify(
            data.relations.overlap
        );
        this._relationInput.fixInput.value = JSON.stringify(
            data.relations.fixed
        );
        this.clearCurrentPolygon();
        this._param = [];
        this._totParameter = 0;
        this._app.stage.removeChildren();
        this._uiPolyList.innerHTML = '';

        for (let i = 0; i < data.polygons.length; i++) {
            if (!data.polygons[i]._text) {
                const poly = new Polygon(
                    data.polygons[i]._vertexList,
                    data.polygons[i]._filling
                );
                this.pushPolygon(poly);
            } else {
                this.pushText(
                    /** @type {String}*/ (data.polygons[i]._text?.textString),
                    {
                        position: data.polygons[i]._vertexList[0],
                        fontFamily: data.polygons[i]._text?.fontFamily,
                        size: data.polygons[i]._text?.fontSize,
                    }
                );
            }
        }
    }

    exportToJson() {
        const polygons = this._polyGraphicsList.map((p) => p.getPolygon());
        this.updateRelation();
        const relations = this._relation;
        return JSON.stringify({ polygons, relations });
    }

    /**
     * Set the polygons to be fixed. These polygons will not be translated during the process.
     */
    setupFix() {
        for (let i = 0; i < this._polyGraphicsList.length; i++) {
            this.setPolygonProperty(i, '_translatable', true);
        }
        for (let i = 0; i < this._relation.fixed.length; i++) {
            this.setPolygonProperty(
                this._relation.fixed[i],
                '_translatable',
                false
            );
        }
    }

    getApp() {
        return this._app;
    }

    /**
     * Call the optimization function defined in `diff_func.js`.
     *
     * After the optimization, apply the transformation.
     * @param {Object} options Learning rate.
     */
    async optimize(options) {
        this._param = await beginOptimization(this, options);
        this.applyTransformation();
    }
}
