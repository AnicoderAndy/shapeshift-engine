import { Application } from 'pixi.js';
import { polygonManager } from './polygon_manager.js';

// Create a new application
const app = new Application();
await app.init({ width: 1000, height: 800, backgroundColor: 'white' });
app.canvas.style.border = '1px solid black';
document.querySelector('#canvas').append(app.canvas);

// Create a polygon manager
const polyManager = new polygonManager(app);

// Get control buttons' elements
const drawPolyBtn = document.querySelector('#btn-draw-poly');
const debugBtn = document.querySelector('#btn-debug');
const processBtn = document.querySelector('#btn-process');

// Get polygon list element
const polyList = document.querySelector('#list-polygons');

// Add event listeners to control buttons
drawPolyBtn.addEventListener('click', polyManager.drawPolyHandler.bind(polyManager));
processBtn.addEventListener('click', async () => {
    // Get Content in the input boxes
    const notOverlap = eval(document.querySelector('#input-not-overlap').value) ?? [];
    const overlap = eval(document.querySelector('#input-overlap').value) ?? [];
    const tangent = [];
    const contain = eval(document.querySelector('#input-contain').value) ?? [];
    const fixedPolygons = eval(document.querySelector('#input-fix').value) ?? [];

    // Add relations to the polygon manager
    polyManager.setRelation(notOverlap, overlap, tangent, contain);

    // Set fixed polygons
    polyManager.setFix(fixedPolygons);

    // Start optimization process
    await polyManager.optimize(1e-2);
});

debugBtn.addEventListener('click', async () => {
    polyManager.polyList[0]._translatable = false;
    console.log(polyManager);
});

window.d = () => {
    console.log(polyManager);
}