// main.js
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

  // ----------------------------------------------------
  // 1. USER FILE UPLOAD
  // ----------------------------------------------------
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear example dropdown (so UI shows we are using a user model)
    exampleSelect.value = "";

    try {
      const mesh = await loadOBJFromFile(file);
      renderer.setMesh(mesh);
    } catch (err) {
      console.error('Failed to load OBJ:', err);
      alert('Failed to load OBJ (check console).');
    }
  });

  // ----------------------------------------------------
  // 2. LOAD EXAMPLE MODEL FROM SERVER
  // ----------------------------------------------------
  exampleSelect.addEventListener('change', async () => {
    const path = exampleSelect.value;

    // "-- choose example --" selected
    if (!path) return;

    // Clear file input (so UI shows it's no longer a user-uploaded model)
    fileInput.value = "";

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      const mesh = await loadOBJFromText(text);
      renderer.setMesh(mesh);

    } catch (err) {
      console.error("Failed to load example OBJ:", err);
      alert("Failed to load example OBJ (check console).");
    }
  });

  // ----------------------------------------------------
  // 3. VIEW MODE SWITCHING
  // ----------------------------------------------------
  viewSelect.addEventListener('change', () => {
    renderer.setViewMode(viewSelect.value);
  });

  // ----------------------------------------------------
  // 4. RENDER LOOP
  // ----------------------------------------------------
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
