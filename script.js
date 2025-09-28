// 全体の状態を管理するグローバル変数
let originalWidth = 0;
let originalHeight = 0;
let scaleFactor = 1;
let history = [];
let historyIndex = -1;
let currentTool = 'move';
let images = [];
let isDragging = false;
let draggingImage = null;
let startX = 0;
let startY = 0;
let currentColor = '#ff0000';

// HTML要素の取得
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('colorInput');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const moveToolBtn = document.getElementById('moveToolBtn');
const penToolBtn = document.getElementById('penToolBtn');
const fillToolBtn = document.getElementById('fillToolBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadModal = document.getElementById('downloadModal');
const closeButton = document.querySelector('.close-button');
const scaleFactorInput = document.getElementById('scaleFactorInput');
const originalSizeDisplay = document.getElementById('originalSizeDisplay');
const newSizeDisplay = document.getElementById('newSizeDisplay');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');

// イベントリスナーの設定
imageInput.addEventListener('change', handleImageUpload);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
moveToolBtn.addEventListener('click', () => { currentTool = 'move'; });
penToolBtn.addEventListener('click', () => { currentTool = 'pen'; });
fillToolBtn.addEventListener('click', () => { currentTool = 'fill'; };);
downloadBtn.addEventListener('click', handleDownloadBtnClick);
closeButton.addEventListener('click', () => { downloadModal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === downloadModal) downloadModal.style.display = 'none'; });
scaleFactorInput.addEventListener('input', updateNewSizeDisplay);
confirmDownloadBtn.addEventListener('click', handleConfirmDownload);
colorInput.addEventListener('change', (e) => { currentColor = e.target.value; });

// メインの関数
function handleImageUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    images = [];
    history = [];
    historyIndex = -1;
    
    let filesLoaded = 0;
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const newImage = { img, x: 0, y: 0, width: img.width, height: img.height };
                images.push(newImage);
                if (images.length === 1) {
                    originalWidth = img.width;
                    originalHeight = img.height;
                    const longestSide = Math.max(originalWidth, originalHeight);
                    if (longestSide > 1024) {
                        scaleFactor = 1024 / longestSide;
                    } else {
                        scaleFactor = 1;
                    }
                    canvas.width = originalWidth * scaleFactor;
                    canvas.height = originalHeight * scaleFactor;
                }
                
                filesLoaded++;
                if (filesLoaded === files.length) {
                    drawImages();
                    saveState();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    if (currentTool === 'move') {
        for (let i = images.length - 1; i >= 0; i--) {
            const image = images[i];
            if (canvasX > image.x && canvasX < image.x + image.width * scaleFactor &&
                canvasY > image.y && canvasY < image.y + image.height * scaleFactor) {
                isDragging = true;
                draggingImage = image;
                startX = canvasX - image.x;
                startY = canvasY - image.y;
                images.splice(i, 1);
                images.push(draggingImage);
                break;
            }
        }
    } else if (currentTool === 'pen') {
        const pixelX = Math.floor(canvasX / scaleFactor);
        const pixelY = Math.floor(canvasY / scaleFactor);
        drawPixel(pixelX, pixelY, currentColor);
        saveState();
    }
}

function handleMouseMove(event) {
    if (currentTool === 'move' && isDragging) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        draggingImage.x = canvasX - startX;
        draggingImage.y = canvasY - startY;
        drawImages();
    }
}

function handleMouseUp() {
    isDragging = false;
    draggingImage = null;
    if (currentTool === 'pen') {
        saveState();
    }
}

function drawImages() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const image of images) {
        ctx.drawImage(image.img, image.x, image.y, image.width * scaleFactor, image.height * scaleFactor);
    }
}

function drawPixel(x, y, color) {
    const rgba = hexToRgba(color);
    ctx.fillStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 1)`;
    ctx.fillRect(x * scaleFactor, y * scaleFactor, scaleFactor, scaleFactor);
}

function hexToRgba(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function saveState() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    const imageDataURL = canvas.toDataURL('image/png');
    history.push(imageDataURL);
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex];
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex];
    }
}

function handleDownloadBtnClick() {
    originalSizeDisplay.textContent = `${originalWidth} × ${originalHeight}`;
    const scale = parseInt(scaleFactorInput.value);
    newSizeDisplay.textContent = `${originalWidth * scale} × ${originalHeight * scale}`;
    downloadModal.style.display = 'block';
}

function updateNewSizeDisplay() {
    const scale = parseInt(scaleFactorInput.value) || 1;
    newSizeDisplay.textContent = `${originalWidth * scale} × ${originalHeight * scale}`;
}

function handleConfirmDownload() {
    downloadModal.style.display = 'none';
    const scale = parseInt(scaleFactorInput.value) || 1;
    downloadImage(scale);
}

function downloadImage(scale) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = originalWidth * scale;
    newCanvas.height = originalHeight * scale;
    const newCtx = newCanvas.getContext('2d');
    
    // 既存の画像を新しいキャンバスに再描画
    newCtx.clearRect(0, 0, newCanvas.width, newCanvas.height);
    for (const image of images) {
        newCtx.drawImage(image.img, image.x, image.y, image.width * scale, image.height * scale);
    }
    
    const imageDataURL = newCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `edited_texture_${newCanvas.width}x${newCanvas.height}.png`;
    link.href = imageDataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
