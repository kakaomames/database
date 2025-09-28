// HTML要素の取得
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('colorInput');
const downloadBtn = document.getElementById('downloadBtn');
const downloadModal = document.getElementById('downloadModal');
const closeButton = document.querySelector('.close-button');
const scaleFactorInput = document.getElementById('scaleFactorInput');
const originalSizeDisplay = document.getElementById('originalSizeDisplay');
const newSizeDisplay = document.getElementById('newSizeDisplay');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');

// グローバル変数
let images = [];
let draggingImage = null;
let isDragging = false;
let startX = 0;
let startY = 0;
let currentTool = 'move';
let history = [];
let historyIndex = -1;
let originalWidth = 0;
let originalHeight = 0;

// 画像を読み込むイベントリスナー
imageInput.addEventListener('change', (event) => {
  const files = event.target.files;
  if (files.length === 0) return;

  images = [];
  history = [];
  historyIndex = -1;

  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const newImage = {
          img: img,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        };
        images.push(newImage);
        
        // 最初の画像のサイズを基準としてOriginalSizeを設定
        if (images.length === 1) {
            originalWidth = img.width;
            originalHeight = img.height;
        }

        drawImages();
        saveState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Canvasにすべての画像を再描画する関数
function drawImages() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const image of images) {
    ctx.drawImage(image.img, image.x, image.y);
  }
}

// 履歴を保存する関数
function saveState() {
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  const imageDataURL = canvas.toDataURL('image/png');
  history.push(imageDataURL);
  historyIndex++;
}

// ------------------- UIイベントリスナー -------------------
// ツール選択ボタン
document.getElementById('moveToolBtn').addEventListener('click', () => { currentTool = 'move'; });
document.getElementById('penToolBtn').addEventListener('click', () => { currentTool = 'pen'; });
document.getElementById('fillToolBtn').addEventListener('click', () => { currentTool = 'fill'; });

// アンドゥ/リドゥボタン
document.getElementById('undoBtn').addEventListener('click', () => {
  if (historyIndex > 0) {
    historyIndex--;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[historyIndex];
  }
});
document.getElementById('redoBtn').addEventListener('click', () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[historyIndex];
  }
});

// ダウンロードモーダルの表示・非表示
downloadBtn.addEventListener('click', () => {
  originalSizeDisplay.textContent = `${originalWidth} × ${originalHeight}`;
  const scale = parseInt(scaleFactorInput.value);
  newSizeDisplay.textContent = `${originalWidth * scale} × ${originalHeight * scale}`;
  downloadModal.style.display = 'block';
});
closeButton.addEventListener('click', () => { downloadModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target === downloadModal) { downloadModal.style.display = 'none'; } });

// 倍率入力欄のリアルタイム更新
scaleFactorInput.addEventListener('input', () => {
  const scale = parseInt(scaleFactorInput.value) || 1;
  newSizeDisplay.textContent = `${originalWidth * scale} × ${originalHeight * scale}`;
});

// ダウンロード実行ボタン
confirmDownloadBtn.addEventListener('click', () => {
  downloadModal.style.display = 'none';
  const scale = parseInt(scaleFactorInput.value) || 1;
  downloadImage(scale);
});

// ------------------- メイン機能 -------------------
// ダウンロードを実行する関数
function downloadImage(scale) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = originalWidth * scale;
  newCanvas.height = originalHeight * scale;
  const newCtx = newCanvas.getContext('2d');
  
  // 描画モードに応じて新しいキャンバスに画像を再描画
  if (images.length > 0) {
      drawImagesOnCanvas(newCtx, newCanvas.width, newCanvas.height);
  } else {
      newCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
  }
  
  const imageDataURL = newCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `edited_texture_${newCanvas.width}x${newCanvas.height}.png`;
  link.href = imageDataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 既存の画像を新しいキャンバスに再描画する関数
function drawImagesOnCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  for (const image of images) {
    ctx.drawImage(image.img, image.x, image.y);
  }
}
