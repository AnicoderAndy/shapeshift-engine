import { Real, Vec, compile, fn, struct, vjp, add, mul, sub, sqrt, select, gt, lt, and, div, Bool, not, geq, neg, abs } from 'rose';
import { polygonManager } from './polygon_manager';
import { Polygon } from './polygon';
import { Graphics } from 'pixi.js';

const sqr = x => mul(x, x);
const cross = (a, b) => sub(mul(a[0], b[1]), mul(a[1], b[0]));
const dot = (a, b) => add(mul(a[0], b[0]), mul(a[1], b[1]));
const max = (x, y) => select(gt(x, y), Real, x, y);
const min = (x, y) => select(lt(x, y), Real, x, y);
const vecAdd = (a, b) => struct([add(a[0], b[0]), add(a[1], b[1])]);
const vecMinus = (a, b) => struct([sub(a[0], b[0]), sub(a[1], b[1])]);
// Use this as a macro. Return whether a polygon is translatable(Boolean).
const translatable = (polyManager, index) => polyManager.list()[index].getPolygon().getTranslatable();

/**
 * Return a opaque function that computes sdf(0) of a polygon with n points and an offset.
 * 
 * Algorithm from the paper on which this project is based.
 * 
 * TODO: Optimize uu and vv computation
 * @param {number} n test
 * @returns {fn} Differentiable function
 */
const sdf0_offset = (n) => fn([{ offset: Vec(2, Real), points: Vec(n, Vec(2, Real)) }], Real, ({ offset, points }) => {
    // sdf_offset(0) = sdf_original(-offset)
    offset[0] = neg(offset[0]);
    offset[1] = neg(offset[1]);

    let d = Number.MAX_VALUE;
    let e = true;
    let s = 1;
    let uu = [0, 0];
    let vv = [0, 0];
    let v0 = vecMinus(points[0], points[n - 1]);
    for (let i = 0; i < n; i++) {
        const u = vecMinus(offset, points[i]);
        const v = vecMinus(points[(i + 1) % n], points[i]);
        const z = dot(v, v);
        const udotv = dot(u, v);

        const outmostcond = and(geq(udotv, 0), lt(udotv, z));
        const dd = select(outmostcond, Real, div(sqr(cross(u, v)), z), dot(u, u));
        const innercond = lt(dd, d);

        e = select(and(outmostcond, innercond), Bool, true, select(and(not(outmostcond), innercond), Bool, false, e));
        s = select(and(not(outmostcond), innercond), Real, select(lt(cross(v0, v), 0), Real, -1, 1), s)
        uu = select(and(e, innercond), Vec(2, Real), vecMinus(offset, points[i]), uu);
        vv = select(and(e, innercond), Vec(2, Real), vecMinus(points[(i + 1) % n], points[i]), vv);
        d = min(d, dd);

        v0 = v;
    }
    return select(e, Real, div(cross(uu, vv), sqrt(dot(vv, vv))), mul(s, sqrt(d)));
});

/**
 * Return the squared penalty of the predicate that two polygons do not overlap.
 * @param {polygonManager} polyManager 
 * @param {number} index1 Index of the first polygon involved in the relationship.
 * @param {number} index2 The second polygon index.
 * @returns The squared function of NotOverlap Penalty.
 */
const fnNotOverlap = (polyManager, index1, index2) => {
    const mD = Polygon.minkowskiDiff(polyManager.getPoints(index1), polyManager.getPoints(index2));
    const pIndex1 = polyManager.getParamIndex(index1);
    const pIndex2 = polyManager.getParamIndex(index2);
    const sdf0 = sdf0_offset(mD.length);

    if (translatable(polyManager, index1) && translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = sub(params[pIndex2], params[pIndex1]);
            const offsetY = sub(params[pIndex2 + 1], params[pIndex1 + 1]);
            return sqr(neg(min(0, sdf0({ offset: [offsetX, offsetY], points: mD }))));
        });
    } else if (translatable(polyManager, index1)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex1];
            const offsetY = params[pIndex1 + 1];
            return sqr(neg(min(0, sdf0({ offset: [offsetX, offsetY], points: mD }))));
        });
    } else if (translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex2];
            const offsetY = params[pIndex2 + 1];
            return sqr(neg(min(0, sdf0({ offset: [offsetX, offsetY], points: mD }))));
        });
    }
};

/**
 * Return the squared penalty of the predicate that two polygons overlap.
 * @param {polygonManager} polyManager 
 * @param {number} index1 Index of the first polygon involved in the relationship.
 * @param {number} index2 The second polygon index.
 * @returns The squared function of Overlap Penalty.
 */
const fnOverlap = (polyManager, index1, index2) => {
    const mD = Polygon.minkowskiDiff(polyManager.getPoints(index1), polyManager.getPoints(index2));
    const pIndex1 = polyManager.getParamIndex(index1);
    const pIndex2 = polyManager.getParamIndex(index2);
    const sdf0 = sdf0_offset(mD.length);

    if (translatable(polyManager, index1) && translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = sub(params[pIndex2], params[pIndex1]);
            const offsetY = sub(params[pIndex2 + 1], params[pIndex1 + 1]);
            return sqr(max(0, sdf0({ offset: [offsetX, offsetY], points: mD })));
        });
    } else if (translatable(polyManager, index1)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex1];
            const offsetY = params[pIndex1 + 1];
            return sqr(max(0, sdf0({ offset: [offsetX, offsetY], points: mD })));
        });
    } else if (translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex2];
            const offsetY = params[pIndex2 + 1];
            return sqr(max(0, sdf0({ offset: [offsetX, offsetY], points: mD })));
        });
    }
};

/**
 * Return the squared penalty of the predicate that two polygons tangent.
 * @param {polygonManager} polyManager 
 * @param {number} index1 Index of the first polygon involved in the relationship.
 * @param {number} index2 The second polygon index.
 * @returns The squared function of Tangent Penalty.
 */
const fnTangent = (polyManager, index1, index2) => {
    const mD = Polygon.minkowskiDiff(polyManager.getPoints(index1), polyManager.getPoints(index2));
    const pIndex1 = polyManager.getParamIndex(index1);
    const pIndex2 = polyManager.getParamIndex(index2);
    const sdf0 = sdf0_offset(mD.length);
    if (translatable(polyManager, index1) && translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = sub(params[pIndex2], params[pIndex1]);
            const offsetY = sub(params[pIndex2 + 1], params[pIndex1 + 1]);
            return sqr(sdf0({ offset: [offsetX, offsetY], points: mD }));
        });
    } else if (translatable(polyManager, index1)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex1];
            const offsetY = params[pIndex1 + 1];
            return sqr(sdf0({ offset: [offsetX, offsetY], points: mD }));
        });
    } else if (translatable(polyManager, index2)) {
        return fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
            const offsetX = params[pIndex2];
            const offsetY = params[pIndex2 + 1];
            return sqr(sdf0({ offset: [offsetX, offsetY], points: mD }));
        });
    }
};

/**
 * Return the squared penalty of the predicate that A contains B.
 * @param {polygonManager} polyManager 
 * @param {number} index1 Index of the first polygon involved in the relationship.
 * @param {number} index2 The second polygon index.
 * @returns The squared function of Contain Penalty.
 */
const fnContain = (polyManager, index1, index2) => {
    return 0;
};

const buildRelation = (polyManager) => {
    // Build squared penalty functions
    let fnList = [];
    for (const [index1, index2] of polyManager.getRelation().notOverlap) {
        fnList.push(fnNotOverlap(polyManager, index1, index2));
    }
    for (const [index1, index2] of polyManager.getRelation().overlap) {
        fnList.push(fnOverlap(polyManager, index1, index2));
    }
    for (const [index1, index2] of polyManager.getRelation().tangent) {
        fnList.push(fnTangent(polyManager, index1, index2));
    }
    for (const [index1, index2] of polyManager.getRelation().contain) {
        fnList.push(fnContain(polyManager, index1, index2));
    }

    const ret = fn([Vec(polyManager.getTotParameter(), Real)], Real, (params) => {
        let result = 0;
        for (let i = 0; i < fnList.length; i++) {
            result = add(result, fnList[i](params));
        }
        return result;
    });
    return ret;
};

const optimization = async (optimizationParameters) => {
    const { epsilon, squaredSumPenalty, params, paramType, eta, c0 = 1e-4, eta_c = 1.5 } = optimizationParameters;
    let c = c0;

    for (let epoch = 0; epoch < 50; epoch++) {
        const f = fn([paramType], Real, (params) => add(epsilon(params), mul(c, squaredSumPenalty(params))));
        const h = fn([paramType], paramType, (params) => vjp(f)(params).grad(1));
        const grad = await compile(h);
        const gradVal = grad(params);

        let maxGrad = 0;

        // Iterate through params, generate newParams
        for (const key in params) {
            params[key] -= eta * (gradVal[key] ?? 0);
            maxGrad = Math.max(maxGrad, Math.abs(gradVal[key] ?? 0));
        }

        if (maxGrad < 1e-5) {
            console.log(`Converged in ${epoch} epochs.`);
            console.log(params);
            return params;
        }
        c *= eta_c;
    }
    console.log('Not Converged!!!');
    console.log(params);
    return params;
};

export const beginOptimization = async (polyManager, eta) => {
    const paramType = Vec(polyManager.getTotParameter(), Real);
    const optParameters = {
        paramType: paramType,
        epsilon: fn([paramType], Real, () => 0),
        squaredSumPenalty: buildRelation(polyManager),
        params: polyManager._param,
        eta: eta
    };
    return await optimization(optParameters);
};