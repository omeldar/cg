// gpuRenderer.js
// WebGPU + WGSL renderer — loads WGSL shader from external file

export class GPURenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.indexCount = 0;
    this.viewMode = 0; // 0 = normalColor, 1 = frontBack
    this.depthTexture = null;
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser.');
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No GPU adapter available.');
    this.device = await adapter.requestDevice();

    const context = this.canvas.getContext('webgpu');
    if (!context) {
      throw new Error('Failed to get WebGPU context from canvas.');
    }
    this.context = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: format,
      alphaMode: 'opaque'
    });

    await this._initPipeline(format);
  }

  async _initPipeline(format) {
    // Load shader code from external WGSL file
    const resp = await fetch('shaders/normalColor.wgsl');
    if (!resp.ok) {
      throw new Error(`Failed to fetch shader: ${resp.status} ${resp.statusText}`);
    }
    const wgsl = await resp.text();

    const shaderModule = this.device.createShaderModule({
      code: wgsl
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 3 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, format: 'float32x3', offset: 0 }  // position
            ]
          },
          {
            arrayStride: 3 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 1, format: 'float32x3', offset: 0 }  // normal
            ]
          }
        ]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [
          { format: format }
        ]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
        frontFace: 'ccw'
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less'
      }
    });
  }

  setMesh(mesh) {
    const { device } = this;

    // Upload position buffer
    this.vertexBuffer = device.createBuffer({
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      size: mesh.positions.byteLength,
      mappedAtCreation: true
    });

    new Float32Array(this.vertexBuffer.getMappedRange()).set(mesh.positions);
    this.vertexBuffer.unmap();

    // Upload normal buffer
    this.normalBuffer = device.createBuffer({
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      size: mesh.normals.byteLength,
      mappedAtCreation: true
    });

    new Float32Array(this.normalBuffer.getMappedRange()).set(mesh.normals);
    this.normalBuffer.unmap();

    // Upload index buffer
    this.indexBuffer = device.createBuffer({
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      size: mesh.indices.byteLength,
      mappedAtCreation: true
    });
    // assuming mesh.indices is a Uint32Array
    new Uint32Array(this.indexBuffer.getMappedRange()).set(mesh.indices);
    this.indexBuffer.unmap();

    this.indexCount = mesh.indices.length;
  }

  setViewMode(mode) {
    this.viewMode = (mode === 'normalColor' ? 0 : 1);
  }

  render(viewProjMatrix) {

    // Before anything, check if a mesh is loaded
    if (!this.indexBuffer || !this.vertexBuffer || !this.normalBuffer) {
        return; // nothing to render yet
    }

    const device = this.device;
    const context = this.context;

    // resize canvas drawing buffer
    const width  = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width  = width;
      this.canvas.height = height;
    }

    // Setup or recreate depth texture if needed
    if (!this.depthTexture ||
        this.depthTexture.width !== this.canvas.width ||
        this.depthTexture.height !== this.canvas.height) {
      this.depthTexture = device.createTexture({
        size: [this.canvas.width, this.canvas.height, 1],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });
    }

    const UNIFORM_BUFFER_SIZE = 80;
    const uniformBuffer = device.createBuffer({
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      size: UNIFORM_BUFFER_SIZE,
    });

    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array(viewProjMatrix));
    device.queue.writeBuffer(uniformBuffer, 16 * 4, new Uint32Array([this.viewMode]));

    const bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } }
      ]
    });

    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.9, g: 0.9, b: 0.9, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthLoadOp: 'clear',
        depthClearValue: 1.0,
        depthStoreOp: 'store'
      }
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setVertexBuffer(1, this.normalBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint32');
    pass.drawIndexed(this.indexCount);
    pass.end();

    device.queue.submit([commandEncoder.finish()]);
  }
}
