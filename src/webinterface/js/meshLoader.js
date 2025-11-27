// meshLoader.js
// Simple minimal .obj loader: parse vertices, normals, faces (triangles), output flat arrays.

// ------------------------------------------------------------
// Load OBJ from a File object (user upload)
// ------------------------------------------------------------
export async function loadOBJFromFile(file) {
  const text = await file.text();
  return parseOBJ(text);
}

// ------------------------------------------------------------
// Load OBJ directly from a string (server-hosted models)
// ------------------------------------------------------------
export function loadOBJFromText(text) {
  return parseOBJ(text);
}

// ------------------------------------------------------------
// Minimal OBJ parser (positions, normals, triangular faces)
// ------------------------------------------------------------
function parseOBJ(text) {
  const lines = text.split('\n');

  const positions = [];
  const normals = [];
  const faces = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const type = parts[0];

    // v x y z
    if (type === 'v') {
      positions.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    }

    // vn x y z
    else if (type === 'vn') {
      normals.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    }

    // f v/t/n v/t/n v/t/n ...
    else if (type === 'f') {
      const verts = parts.slice(1).map(vstr => {
        const [vi, vt, vni] = vstr
          .split('/')
          .map(s => (s === '' ? undefined : parseInt(s) - 1));

        return { vi, vni };
      });

      // Triangulate face (fan method)
      for (let i = 1; i < verts.length - 1; i++) {
        faces.push([verts[0], verts[i], verts[i + 1]]);
      }
    }
  }

  // Flatten into GPU-friendly arrays
  const finalPositions = [];
  const finalNormals = [];
  const indices = [];

  let idx = 0;

  for (const face of faces) {
    for (const vert of face) {
      const pos = positions[vert.vi];
      finalPositions.push(...pos);

      if (vert.vni !== undefined && normals[vert.vni]) {
        finalNormals.push(...normals[vert.vni]);
      } else {
        finalNormals.push(0, 0, 0); // fallback if no normal provided
      }

      indices.push(idx++);
    }
  }

  return {
    positions: new Float32Array(finalPositions),
    normals: new Float32Array(finalNormals),
    indices: new Uint32Array(indices),
  };
}
