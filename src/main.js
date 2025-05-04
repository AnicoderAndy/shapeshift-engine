import { Application, Text } from 'pixi.js';
import { polygonManager } from './polygon_manager.js';
import { polygon2svg } from './polygon2svg.js';

(async () => {
    // Get polygon list element
    const uiPolyList = document.querySelector('#list-polygons');

    // Get color control elements
    const randomColorInput = document.querySelector(
        '#input-polygon-random-color'
    );
    const polygonColorInput = document.querySelector('#input-polygon-color');
    const colorInput = { randomColorInput, polygonColorInput };

    // Get control buttons' elements
    const drawPolyBtn = document.querySelector('#btn-draw-poly');
    const newTextBtn = document.querySelector('#btn-new-text');
    const importTextListBtn = document.querySelector('#btn-import-text-list');
    const downloadSvgBtn = document.querySelector('#btn-download-svg');
    const downloadJsonBtn = document.querySelector('#btn-download-json');
    const importJsonBtn = document.querySelector('#btn-import-json');
    const debugBtn = document.querySelector('#btn-debug');
    const processBtn = document.querySelector('#btn-process');

    // Get input elements
    const textInput = document.querySelector('#input-text');
    const textListInput = document.querySelector('#input-text-list');
    const fontSizeInput = document.querySelector('#input-font-size');
    const fontFamilyInput = document.querySelector('#input-font-family');
    const importJsonInput = document.querySelector('#input-import-json');
    const notOverlapInput = document.querySelector('#input-not-overlap');
    const overlapInput = document.querySelector('#input-overlap');
    const fixInput = document.querySelector('#input-fix');
    const relationInput = { notOverlapInput, overlapInput, fixInput };

    // Create a new application
    const app = new Application();
    await app.init({ width: 1000, height: 800, backgroundColor: 'white' });
    document.querySelector('#div-canvas').append(app.canvas);

    // Create a polygon manager
    const htmlElements = {
        uiPolyList,
        colorInput,
        relationInput,
        textInput,
        fontSizeInput,
        fontFamilyInput,
    };
    const polyManager = new polygonManager(app, htmlElements);

    // Add event listeners to control buttons
    drawPolyBtn.addEventListener(
        'click',
        polyManager.drawPolyHandler.bind(polyManager)
    );
    newTextBtn.addEventListener(
        'click',
        polyManager.newTextHandler.bind(polyManager)
    );
    processBtn.addEventListener('click', async e => {
        const btn = e.target;
        if (btn.disabled) return;

        btn.disabled = true;
        btn.innerHTML = 'Processing...';

        try {
            // Get content in the input boxes
            polyManager.updateRelation();
            // Set fixed polygons
            polyManager.setupFix();
            // Start optimization process
            await polyManager.optimize({
                eta: 0.01,
                c0: 1e-3,
                eta_c: 3,
                maxIter: 100
            });
        } catch (error) {
            console.error('Error during processing:', error);
            alert(`An error occurred during processing: ${error}`);
        } finally {
            btn.innerHTML = 'Process';
            btn.disabled = false;
        }
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

    importTextListBtn.addEventListener('click', () => {
        textListInput.click();
    });

    textListInput.addEventListener('change', () => {
        const file = textListInput.files[0];
        if (!file) {
            console.log('textListInput clicked but no file selected');
        }
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const lines = content
                    .split(/\r?\n/)
                    .filter((line) => line.trim() !== '');
                for (const line of lines) {
                    const textString = line;
                    const fontFamily = fontFamilyInput.value;
                    const fontSize = Number(fontSizeInput.value);
                    polyManager.pushText(textString, {
                        fontFamily,
                        size: fontSize,
                    });
                }
                console.log(
                    'Import text list info: A text list has been loaded.'
                );
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing text list:', error);
            alert(`An error occurred during importing text list: ${error}`);
            return;
        }
    });

    importJsonBtn.addEventListener('click', () => {
        importJsonInput.click();
    });

    importJsonInput.addEventListener('change', () => {
        const file = importJsonInput.files[0];
        if (!file) return;

        if (
            !confirm(
                'This operation will clear the canvas and all configurations. Are you sure to proceed?'
            )
        ) {
            importJsonInput.value = '';
            return;
        }
        try {
            const file = importJsonInput.files[0];
            if (!file) {
                throw new Error('No file selected');
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const json = e.target.result;
                polyManager.loadJson(json);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing JSON:', error);
            alert(`An error occurred during importing JSON: ${error}`);
            return;
        }
    });

    debugBtn.addEventListener('click', () => {});
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
