import { Application } from 'pixi.js';
import { polygonManager } from './polygon_manager.js';
import { polygon2svg } from './polygon2svg.js';


(async () => {
    // Get polygon list element
    const uiPolyList = document.querySelector('#list-polygons');

    // Get color control elements
    const randomColorInput = document.querySelector('#input-polygon-random-color');
    const polygonColorInput = document.querySelector('#input-polygon-color');
    const colorInput = { randomColorInput, polygonColorInput };

    // Get control buttons' elements
    const drawPolyBtn = document.querySelector('#btn-draw-poly');
    const downloadSvgBtn = document.querySelector('#btn-download-svg');
    const downloadJsonBtn = document.querySelector('#btn-download-json');
    const importJsonBtn = document.querySelector('#btn-import-json');
    const debugBtn = document.querySelector('#btn-debug');
    const processBtn = document.querySelector('#btn-process');

    // Get input elements
    const importJsonInput = document.querySelector('#input-import-json');
    const notOverlapInput = document.querySelector('#input-not-overlap');
    const overlapInput = document.querySelector('#input-overlap');
    const fixInput = document.querySelector('#input-fix');
    const relationInput = { notOverlapInput, overlapInput, fixInput };

    // Create a new application
    const app = new Application();
    await app.init({ width: 1000, height: 800, backgroundColor: 'white' });
    app.canvas.style.border = '1px solid black';
    document.querySelector('#canvas').append(app.canvas);

    // Create a polygon manager
    const htmlElements = { uiPolyList, colorInput, relationInput };
    const polyManager = new polygonManager(app, htmlElements);

    // Add event listeners to control buttons
    drawPolyBtn.addEventListener('click', polyManager.drawPolyHandler.bind(polyManager));
    processBtn.addEventListener('click', async () => {
        // Get Content in the input boxes
        polyManager.updateRelation();

        // Set fixed polygons
        polyManager.setupFix();

        // Start optimization process
        await polyManager.optimize(1e-2);
    });

    downloadSvgBtn.addEventListener('click', () => {
        const svg = polygon2svg(polyManager);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        download(blob, 'shapeshift-export.svg');
    });

    downloadJsonBtn.addEventListener('click', () => {
        const json = polyManager.exportToJson();
        const blob = new Blob([json], { type: 'application/json' });
        download(blob, 'shapeshift-saved.json');
    });

    importJsonBtn.addEventListener('click', () => {
        if (!confirm('This operation will clear the canvas and all configurations. Are you sure to proceed?')) {
            return;
        }
        try {
            const file = importJsonInput.files[0];
            if (!file) {
                throw new Error('No file selected');
            }
            const reader = new FileReader();
            reader.onload = e => {
                const json = e.target.result;
                polyManager.loadJson(json);
            }
            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing JSON:', error);
            return;
        }
    });

    debugBtn.addEventListener('click', () => {
        console.log(polyManager.exportToJson());
    });
})();

function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}