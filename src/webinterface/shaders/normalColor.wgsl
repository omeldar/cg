// normalColor.wgsl

struct Uniforms {
    viewProj: mat4x4<f32>,
    viewMode: u32,
};

@group(0) @binding(0) var<uniform> u : Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) normal: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.pos = u.viewProj * vec4<f32>(in.position, 1.0);
    out.normal = normalize(in.normal);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    if u.viewMode == 0u {
        let c = in.normal * 0.5 + vec3<f32>(0.5);
        return vec4<f32>(c, 1.0);
    } else {
        let front = in.normal.z > 0.0;
        var outColor: vec4<f32>;
        if front {
            outColor = vec4<f32>(0.0, 1.0, 0.0, 1.0);
        } else {
            outColor = vec4<f32>(1.0, 0.0, 0.0, 1.0);
        }
        return outColor;
    }
}
