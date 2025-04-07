import { Application } from 'pixi.js';
import { polygonManager } from './polygon_manager.js';


(async () => {
    // Get polygon list element
    const uiPolyList = document.querySelector('#list-polygons');

    // Get color control elements
    const randomColorInput = document.querySelector('#input-polygon-random-color');
    const polygonColorInput = document.querySelector('#input-polygon-color');
    const colorInput = { randomColorInput, polygonColorInput };

    // Get control buttons' elements
    const drawPolyBtn = document.querySelector('#btn-draw-poly');
    const debugBtn = document.querySelector('#btn-debug');
    const processBtn = document.querySelector('#btn-process');

    // Create a new application
    const app = new Application();
    await app.init({ width: 1000, height: 800, backgroundColor: 'white' });
    app.canvas.style.border = '1px solid black';
    document.querySelector('#canvas').append(app.canvas);

    // Create a polygon manager
    const polyManager = new polygonManager(app, uiPolyList, colorInput);

    // Add event listeners to control buttons
    drawPolyBtn.addEventListener('click', polyManager.drawPolyHandler.bind(polyManager));
    processBtn.addEventListener('click', async () => {
        // Get Content in the input boxes
        const notOverlap = eval(document.querySelector('#input-not-overlap').value) ?? [];
        const overlap = eval(document.querySelector('#input-overlap').value) ?? [];
        const tangent = [];
        const contain = [];
        const fixedPolygons = eval(document.querySelector('#input-fix').value) ?? [];

        // Add relations to the polygon manager
        polyManager.setRelation(notOverlap, overlap, tangent, contain);

        // Set fixed polygons
        polyManager.setFix(fixedPolygons);

        // Start optimization process
        await polyManager.optimize(1e-2);
    });

    debugBtn.addEventListener('click', async () => {
        let graphicsRef = polyManager.getList()[0].getGraphics();
        let alphaDirection = -0.05;
        const flicker = () => {
            graphicsRef.alpha += alphaDirection;
            if (graphicsRef.alpha <= 0.2 || graphicsRef.alpha >= 1) {
                alphaDirection *= -1;
            }
        };
        app.ticker.add(flicker);
        setTimeout(() => {
            app.ticker.remove(flicker);
            graphicsRef.alpha = 1;
        }, 250);
    });
})();