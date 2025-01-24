import { Application, Container, Sprite, Text, Texture, Assets, Graphics, GraphicsContext } from 'pixi.js';
import { Polygon } from './polygon.js';
import { polygonManager } from './polygon_manager.js';

let drawingPoly = false;
let points = [];
let lastPoly = null;

function canvasDrawPolygonHandler(e) {
    points.push([e.offsetX, e.offsetY]);
    console.log(e.offsetX, e.offsetY);
    if (points.length >= 3) {
        if (lastPoly) {
            lastPoly.getGraphics().destroy();
        }
        lastPoly = new Polygon([...points], 'red');
        app.stage.addChild(lastPoly.getGraphics());
    }
}

function btnDrawPolyHandler() {
    drawingPoly = !drawingPoly;
    console.log('Drawing: ', drawingPoly);
    if (drawingPoly) {
        app.canvas.addEventListener('click', canvasDrawPolygonHandler);
    } else {
        let li = document.createElement('li');
        li.innerHTML = `Polygon ${polyManager.size()}`;
        polyList.append(li);
        
        const newPoly = new Polygon([...points], 'blue');
        polyManager.pushPolygon(newPoly);
        app.stage.addChild(newPoly.getGraphics());

        lastPoly.getGraphics().destroy();
        lastPoly = null;
        points = [];


        app.canvas.removeEventListener('click', canvasDrawPolygonHandler);
    }
}

// Create a new application
const app = new Application();
await app.init({ width: 1000, height: 800, backgroundColor: 'white' });
app.canvas.style.border = '1px solid black';
document.querySelector('#canvas').append(app.canvas);

// Create a polygon manager
const polyManager = new polygonManager();

// Get control buttons' elements
const drawPolyBtn = document.querySelector('#btn-draw-poly');
const debugBtn = document.querySelector('#btn-debug');
const processBtn = document.querySelector('#btn-process');

// Get polygon list element
const polyList = document.querySelector('#list-polygons');

// Add event listeners to control buttons
drawPolyBtn.addEventListener('click', btnDrawPolyHandler);
processBtn.addEventListener('click', async () => {
    // Get Content in the input boxes
    const notOverlap = eval(document.querySelector('#input-not-overlap').value) ?? [];
    const overlap = eval(document.querySelector('#input-overlap').value) ?? [];
    const tangent = eval(document.querySelector('#input-tangent').value) ?? [];
    const contain = eval(document.querySelector('#input-contain').value) ?? [];
    
    // Add relations to the polygon manager
    polyManager.setRelation(notOverlap, overlap, tangent, contain);

    // Start optimization process
    await polyManager.optimize();
});

debugBtn.addEventListener('click', async () => {
    await polyManager.optimize();
});