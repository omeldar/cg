// main.js
import { GPURenderer } from './gpuRenderer.js';
import { loadOBJFromFile } from './meshLoader.js';
import { OrbitCamera } from './orbitCamera.js';

async function main() {
  const canvas = document.getElementById('gpu-canvas');
  const renderer = new GPURenderer(canvas);
  await renderer.init();

  const camera = new OrbitCamera(canvas);

  const fileInput = document.getElementById('file-input');
  const viewSelect = document.getElementById('view-mode');

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

  viewSelect.addEventListener('change', () => {
    renderer.setViewMode(viewSelect.value);
  });

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
