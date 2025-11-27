// orbitCamera.js
// Orbit camera with SHIFT-drag panning (like Blender)

export class OrbitCamera {
  constructor(canvas) {
    this.canvas = canvas;

    // Orbit state
    this.distance = 3;
    this.rotationX = 0;
    this.rotationY = 0;

    // Pan state (moves target)
    this.target = [0, 0, 0];

    this._initEvents();
  }

  _initEvents() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      dragging = false;
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // ----------------------------------------------------
      // SHIFT + drag → PAN the camera (move target)
      // ----------------------------------------------------
      if (e.shiftKey) {
        const panSpeed = this.distance * 0.002; // pan speed scales with zoom

        // Compute camera's local axes to move correctly in world space
        const yaw = this.rotationY;
        const cameraRight = [ Math.cos(yaw), 0, -Math.sin(yaw) ];
        const cameraUp = [ 0, 1, 0 ];

        // Move target sideways + up/down
        this.target[0] += (-dx * panSpeed) * cameraRight[0] + (dy * panSpeed) * cameraUp[0];
        this.target[1] += (dy * panSpeed) * cameraUp[1];
        this.target[2] += (-dx * panSpeed) * cameraRight[2] + (dy * panSpeed) * cameraUp[2];

        return; // do NOT orbit when shift-panning
      }

      // ----------------------------------------------------
      // Normal drag → ORBIT
      // ----------------------------------------------------
      this.rotationY += dx * 0.005;
      this.rotationX += dy * 0.005;
      this.rotationX = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.rotationX));
    });

    // ----------------------------------------------------
    // Zoom (scroll wheel)
    // ----------------------------------------------------
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance *= e.deltaY > 0 ? 1.1 : 0.9;
      this.distance = Math.max(0.1, Math.min(50, this.distance));
    });
  }

  getViewProjectionMatrix() {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const fovy = Math.PI / 4;
    const near = 0.1;
    const far = 200.0;

    const proj = mat4_perspective(fovy, aspect, near, far);
    const view = this._computeViewMatrix();
    return multiplyMatrices(proj, view);
  }

  _computeViewMatrix() {
    // Compute orbit eye position relative to *target*
    const cx = this.target[0] + Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.distance;
    const cz = this.target[2] + Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.distance;
    const cy = this.target[1] + Math.sin(this.rotationX) * this.distance;

    return mat4_lookAt([cx, cy, cz], this.target, [0, 1, 0]);
  }
}

// --- simple matrix math (no dependencies) ---

function mat4_perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ];
}

function mat4_lookAt(eye, target, up) {
  const [ex, ey, ez] = eye;
  const [tx, ty, tz] = target;
  const [ux, uy, uz] = up;

  const zx = ex - tx;
  const zy = ey - ty;
  const zz = ez - tz;
  const zlen = Math.hypot(zx, zy, zz);
  const zx_n = zx / zlen;
  const zy_n = zy / zlen;
  const zz_n = zz / zlen;

  const xx = uy * zz_n - uz * zy_n;
  const xy = uz * zx_n - ux * zz_n;
  const xz = ux * zy_n - uy * zx_n;
  const xlen = Math.hypot(xx, xy, xz);
  const xx_n = xx / xlen;
  const xy_n = xy / xlen;
  const xz_n = xz / xlen;

  const yx = zy_n * xz_n - zz_n * xy_n;
  const yy = zz_n * xx_n - zx_n * xz_n;
  const yz = zx_n * xy_n - zy_n * xx_n;

  return [
    xx_n, yx, zx_n, 0,
    xy_n, yy, zy_n, 0,
    xz_n, yz, zz_n, 0,
    -(xx_n * ex + xy_n * ey + xz_n * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx_n * ex + zy_n * ey + zz_n * ez),
    1
  ];
}

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + j] * b[i * 4 + k];
      }
      out[i * 4 + j] = sum;
    }
  }
  return out;
}
