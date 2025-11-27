import { GPURenderer } from './gpuRenderer.js';
import { loadOBJFromFile, loadOBJFromText } from './meshLoader.js';
import { OrbitCamera } from './orbitCamera.js';

async function main() {
  const canvas = document.getElementById('gpu-canvas');
  const renderer = new GPURenderer(canvas);
  await renderer.init();

  const camera = new OrbitCamera(canvas);

  const fileInput = document.getElementById('file-input');
  const exampleSelect = document.getElementById('example-select');
  const viewSelect = document.getElementById('view-mode');

  // ---------------------------
  // 1. Handle user file upload
  // ---------------------------
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const mesh = await loadOBJFromFile(file);
      renderer.setMesh(mesh);
    } catch (err) {
      console.error('Failed to load OBJ:', err);
      alert('Failed to load OBJ (check console).');
    }
  });

  // ---------------------------
  // 2. Handle example model load
  // ---------------------------
  exampleSelect.addEventListener('change', async () => {
    const path = exampleSelect.value;
    if (!path) return; // user picked the blank option
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      const mesh = await loadOBJFromText(text);
      renderer.setMesh(mesh);
    } catch (err) {
      console.error('Failed to load example OBJ:', err);
      alert('Failed to load example OBJ (check console).');
    }
  });

  // ---------------------------
  // 3. View mode change
  // ---------------------------
  viewSelect.addEventListener('change', () => {
    renderer.setViewMode(viewSelect.value);
  });

  // ---------------------------
  // 4. Animation loop
  // ---------------------------
  function frame() {
    if (renderer.device && camera) {
      const vp = camera.getViewProjectionMatrix();
      renderer.render(vp);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch(err => {
  console.error(err);
  alert('WebGPU initialization failed — is your browser WebGPU-enabled?');
});
