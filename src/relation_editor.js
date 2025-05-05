import { not } from 'rose';
import { polygonManager } from './polygon_manager';

//@ts-check
let relationMatrix = [];
let isFixedList = [];
const mainSelct = /**@type {HTMLSelectElement} */ (
    document.querySelector('#slct-main-poly')
);
const relationPolyList = /**@type {Element} */ (
    document.querySelector('#relation-poly-list')
);

/**
 * Update the relation matrix to be `newSize` by `newSize`.
 * @param {number} newSize New size of the relation matrix.
 */
function updateMatrixSize(newSize) {
    const oldSize = relationMatrix.length;
    if (newSize <= oldSize) return;
    const delta = newSize - oldSize;

    relationMatrix.forEach((row) => {
        for (let i = 0; i < delta; i++) {
            row.push(0);
        }
    });

    for (let i = 0; i < delta; i++) {
        relationMatrix.push(Array(newSize).fill(0));
    }

    for (let i = 0; i < delta; i++) isFixedList.push(0);
}

function resetRelationMatrix() {
    relationMatrix = [];
    isFixedList = [];
}

function getChecked() {
    const checked = [
        .../**@type {NodeListOf<HTMLInputElement>} */ (
            relationPolyList?.querySelectorAll('input:checked')
        ),
    ].map((cb) => Number(cb.value));
    return checked;
}

/**
 * Set mutual relation to checked polygons.
 * @param {number} relationType 1 for not overlap; 2 for overlap
 */
function setMutualRelation(relationType) {
    const checked = getChecked();
    if (checked.length < 2) return;
    for (let i = 0; i < checked.length; i++) {
        for (let j = i + 1; j < checked.length; j++) {
            if (relationMatrix[checked[i]][checked[j]] !== 0) {
                log(
                    'Warning: A relation bewtween the following indices is overwritten:'
                );
                log(checked[i] + ', ' + checked[j]);
            }
            relationMatrix[checked[i]][checked[j]] = relationType;
            relationMatrix[checked[j]][checked[i]] = relationType;
        }
    }
    log(
        'You have set the relation among the following polygons to be ' +
            (relationType == 1 ? 'not overlap' : 'overlap')
    );
    log(JSON.stringify(checked));
}

/**
 * Set relation between main target and selected targets.
 * @param {number} relationType 1 for not overlap; 2 for overlap
 */
function setMainTargetRelation(relationType) {
    const mainTarget = Number(mainSelct.value);
    const checked = getChecked();
    if (checked.length < 1) return;
    for (let i = 0; i < checked.length; i++) {
        if (relationMatrix[checked[i]][mainTarget] !== 0) {
            log(
                'Warning: A relation bewtween the following indices is overwritten:'
            );
            log(checked[i] + ', ' + mainTarget);
        }
        relationMatrix[mainTarget][checked[i]] = relationType;
        relationMatrix[checked[i]][mainTarget] = relationType;
    }
    log(
        'Following polygons are set to ' +
            (relationType == 1 ? 'not overlap' : 'overlap') +
            ' with ' +
            mainTarget
    );
    log(JSON.stringify(checked));
}

function setFix() {
    const checked = getChecked();
    for (let i = 0; i < checked.length; i++) {
        isFixedList[checked[i]] = 1;
    }
    log('Following polygons are set to be fixed:');
    log(JSON.stringify(checked));
}

function loadRelationToInput() {
    const notOverlapInput =
        /**@type {HTMLInputElement} */ document.querySelector(
            '#input-not-overlap'
        );
    const overlapInput =
        /**@type {HTMLInputElement} */ document.querySelector('#input-overlap');
    const fixInput =
        /**@type {HTMLInputElement} */ document.querySelector('#input-fix');
    let notOverlap = [];
    let overlap = [];
    let fix = [];
    for (let i = 0; i < relationMatrix.length; i++) {
        for (let j = i + 1; j < relationMatrix[i].length; j++) {
            if (
                isFixedList[i] &&
                isFixedList[j] &&
                relationMatrix[i][j] !== 0
            ) {
                console.warn(
                    'Overlap/Not Overlap rules cannot be applied when both polygons are fixed. The following indices are ignored:' +
                        i +
                        ', ' +
                        j
                );
            }
            if (relationMatrix[i][j] === 1) {
                notOverlap.push([i, j]);
            } else if (relationMatrix[i][j] === 2) {
                overlap.push([i, j]);
            }
        }
    }
    for (let i = 0; i < isFixedList.length; i++) {
        if (isFixedList[i]) {
            fix.push(i);
        }
    }
    notOverlapInput.value = JSON.stringify(notOverlap);
    overlapInput.value = JSON.stringify(overlap);
    fixInput.value = JSON.stringify(fix);
}

/**
 * @param {number} size Size of the relation matrix.
 * @param {{notOverlap: [number,number][], overlap: [number, number][], fixed: number[]}} relation
 */
export function loadRelationFromJSON(size, relation) {
    const notOverlapInput =
        /**@type {HTMLInputElement} */ document.querySelector(
            '#input-not-overlap'
        );
    const overlapInput =
        /**@type {HTMLInputElement} */ document.querySelector('#input-overlap');
    const fixInput =
        /**@type {HTMLInputElement} */ document.querySelector('#input-fix');

    resetRelationMatrix();
    updateMatrixSize(size);
    const { notOverlap, overlap, fixed } = relation;
    fixed.forEach((i) => {
        isFixedList[i] = 1;
    });
    const fn = (pair, type) => {
        const [i, j] = pair;
        if (isFixedList[i] === 1 && isFixedList[j] === 1) {
            console.warn(
                'Overlap/Not Overlap rules cannot be applied when both polygons are fixed. The following indices are ignored:\n' +
                    i +
                    ', ' +
                    j
            );
            return;
        }
        relationMatrix[i][j] = type;
        relationMatrix[j][i] = type;
    };
    notOverlap.forEach((pair) => {
        fn(pair, 1);
    });
    overlap.forEach((pair) => {
        fn(pair, 2);
    });
    notOverlapInput.value = JSON.stringify(notOverlap);
    overlapInput.value = JSON.stringify(overlap);
    fixInput.value = JSON.stringify(fixed);
}

/**
 * @param {string} msg
 */
function log(msg) {
    console.log(msg);
    const logBox = /**@type {HTMLTextAreaElement} */ (
        document.querySelector('#log-messages')
    );
    logBox.innerHTML += msg + '<br>';
    logBox.scrollTop = logBox.scrollHeight;
}

/**
 * @param {polygonManager} polyManager
 */
export function setupRelationEditor(polyManager) {
    const relationModal = /**@type {HTMLElement} */ (
        document.querySelector('#modal-relation')
    );
    const relationModalSwitch = document.querySelector('#btn-relation-modal');
    const relationModalCloseBtn = document.querySelector('#btn-relation-close');
    const selectAllBtn = document.querySelector('#btn-relation-slct-all');
    const rvrsBtn = document.querySelector('#btn-relation-rvrs-slct');
    const mutualNotOverlapBtn = document.querySelector(
        '#btn-mutual-not-overlap'
    );
    const mutualOverlapBtn = document.querySelector('#btn-mutual-overlap');
    const mainNotOverlapBtn = document.querySelector('#btn-main-not-overlap');
    const mainOverlapBtn = document.querySelector('#btn-main-overlap');
    const fixBtn = document.querySelector('#btn-fixed');
    const clearBtn = document.querySelector('#btn-clear-relation');

    relationModalSwitch?.addEventListener('click', () => {
        relationPolyList.innerHTML = '';
        polyManager.getList().forEach((pG, i) => {
            const label = document.createElement('label');
            const option = document.createElement('option');
            let text = '';
            if (pG._isText) {
                text = `Text ${i}: ` + pG.getTextString();
            } else {
                text = `Polygon ${i}`;
            }
            label.innerHTML = `<input type="checkbox" value="${i}" /> ` + text;
            option.value = i;
            option.textContent = text;
            relationPolyList.appendChild(label);
            mainSelct.appendChild(option);
        });
        updateMatrixSize(polyManager.getList().length);
        relationModal.style.display = 'flex';
    });

    relationModalCloseBtn?.addEventListener('click', () => {
        loadRelationToInput();
        relationModal.style.display = 'none';
    });

    selectAllBtn?.addEventListener('click', () => {
        /**@type {NodeListOf<HTMLInputElement>} */ (
            relationPolyList?.querySelectorAll('input[type="checkbox"]')
        ).forEach((cb) => {
            cb.checked = true;
        });
    });

    rvrsBtn?.addEventListener('click', () => {
        /**@type {NodeListOf<HTMLInputElement>} */ (
            relationPolyList?.querySelectorAll('input[type="checkbox"]')
        ).forEach((cb) => {
            cb.checked = !cb.checked;
        });
    });

    mutualNotOverlapBtn?.addEventListener('click', () => {
        setMutualRelation(1);
    });

    mutualOverlapBtn?.addEventListener('click', () => {
        setMutualRelation(2);
    });

    mainNotOverlapBtn?.addEventListener('click', () => {
        setMainTargetRelation(1);
    });

    mainOverlapBtn?.addEventListener('click', () => {
        setMainTargetRelation(2);
    });

    fixBtn.addEventListener('click', () => {
        setFix();
    });

    clearBtn.addEventListener('click', () => {
        resetRelationMatrix();
        updateMatrixSize(polyManager.getList().length);
        document.querySelector('#log-messages').innerHTML = '';
    });
}
