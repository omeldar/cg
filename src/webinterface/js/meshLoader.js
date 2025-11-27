// meshLoader.js
// Simple minimal .obj loader: parse vertices, normals, faces (triangles), output flat arrays.

export async function loadOBJFromFile(file) {
  const text = await file.text();
  return parseOBJ(text);
}

function parseOBJ(text) {
  const lines = text.split('\n');

  const positions = [];
  const normals = [];
  const faces = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'v') {
      positions.push([ parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]) ]);
    } else if (parts[0] === 'vn') {
      normals.push([ parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]) ]);
    } else if (parts[0] === 'f') {
      const faceVerts = parts.slice(1).map(vstr => {
        const [ vi, vt, vni ] = vstr.split('/').map(s => s === '' ? undefined : parseInt(s) - 1);
        return { vi, vni };
      });
      if (faceVerts.length >= 3) {
        // triangulate (fan)
        for (let i = 1; i < faceVerts.length - 1; i++) {
          faces.push([ faceVerts[0], faceVerts[i], faceVerts[i+1] ]);
        }
      }
    }
  }

  const finalPositions = [];
  const finalNormals = [];
  const indices = [];

  let idxCounter = 0;

  for (const face of faces) {
    for (const vert of face) {
      const pos = positions[vert.vi];
      finalPositions.push(...pos);

      if (vert.vni !== undefined && normals[vert.vni]) {
        finalNormals.push(...normals[vert.vni]);
      } else {
        finalNormals.push(0, 0, 0);
      }
      indices.push(idxCounter++);
    }
  }

  return {
    positions: new Float32Array(finalPositions),
    normals: new Float32Array(finalNormals),
    indices: new Uint32Array(indices),
  };
}
