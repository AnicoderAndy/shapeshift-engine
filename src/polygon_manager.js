import { Polygon } from "./polygon";
import { optimize } from "./diff_func";
import { not } from "rose";

export class polygonManager {
    constructor() {
        this.polyList = [];
        this.drawingPoly = false;
        this.relation = { notOverlap: [], overlap: [], tangent: [], contain: [] };
        this.param = [];
        // Number of parameters for each polygon
        this.paramSize = 2;
        // Number of parameters for all polygons
        this.totParameter = 0;
    }

    /**
     * Push a new polygon to the end of polyList.
     * @param {Polygon} poly 
     */
    pushPolygon(poly) {
        this.polyList.push(poly);
        this.param.push(0, 0);
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
            this.relation.notOverlap.push([index1, index2]);
        } else if (relation == 1) {
            this.relation.overlap.push([index1, index2]);
        } else if (relation == 2) {
            this.relation.tangent.push([index1, index2]);
        } else if (relation == 3) {
            this.relation.contain.push([index1, index2]);
        } else {
            throw new Error("Invalid relation type.");
        }
    }

    setRelation(notOverlap, overlap, tangent, contain) {
        this.relation.notOverlap = notOverlap;
        this.relation.overlap = overlap;
        this.relation.tangent = tangent;
        this.relation.contain = contain;
    }

    /**
     * Return the first parameter index of the inquired polygon.
     * @param {number} polyIndex Index of the inquired polygon.
     * @returns {number} Index of the inquiry.
     */
    paramIndex(polyIndex) {
        return polyIndex * this.paramSize;
    }

    /**
     * Calculate and return number of parameters for all polygons.
     * @returns {number} Total number of parameters for all polygons.
     */
    getTotParameter() {
        this.totParameter = this.polyList.length * this.paramSize;
        return this.totParameter;
    }

    size() {
        return this.polyList.length;
    }

    applyTransformation() {
        for (let i = 0; i < this.polyList.length; i++) {
            this.polyList[i].setOffset([this.param[this.paramIndex(i)], this.param[this.paramIndex(i) + 1]]);
        }
    }

    async optimize() {
        this.param = await optimize(this);
        this.applyTransformation();
    }
}