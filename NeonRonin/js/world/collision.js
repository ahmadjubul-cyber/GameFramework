// NEON RONIN - static AABB collision world with a spatial hash
(function () {
  class Collision {
    constructor(cell) {
      this.cell = cell || 16;
      this.boxes = [];
      this.grid = new Map();
      this.stamp = 1;
      this.bounds = null; // {minX,maxX,minZ,maxZ}
      this._q = [];
    }

    key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }

    add(minX, minY, minZ, maxX, maxY, maxZ, props) {
      const b = { minX, minY, minZ, maxX, maxY, maxZ, id: this.boxes.length, _s: 0 };
      if (props) Object.assign(b, props);
      this.boxes.push(b);
      const c = this.cell;
      const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c);
      const z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iz = z0; iz <= z1; iz++) {
          const k = this.key(ix, iz);
          let list = this.grid.get(k);
          if (!list) { list = []; this.grid.set(k, list); }
          list.push(b);
        }
      }
      return b;
    }

    remove(b) {
      const c = this.cell;
      const x0 = Math.floor(b.minX / c), x1 = Math.floor(b.maxX / c);
      const z0 = Math.floor(b.minZ / c), z1 = Math.floor(b.maxZ / c);
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (list) { const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); }
      }
      b.removed = true;
    }

    query(minX, minZ, maxX, maxZ) {
      const out = this._q; out.length = 0;
      const s = ++this.stamp;
      const c = this.cell;
      const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c);
      const z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iz = z0; iz <= z1; iz++) {
          const list = this.grid.get(this.key(ix, iz));
          if (!list) continue;
          for (let i = 0; i < list.length; i++) {
            const b = list[i];
            if (b._s === s) continue;
            b._s = s;
            if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) continue;
            out.push(b);
          }
        }
      }
      return out;
    }

    pointInside(x, y, z, pad) {
      pad = pad || 0;
      const list = this.query(x - pad, z - pad, x + pad, z + pad);
      for (const b of list) {
        if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad && y > b.minY && y < b.maxY) return b;
      }
      return null;
    }

    // highest surface at (x,z) whose top is <= fromY (+ tolerance)
    groundAt(x, z, fromY, r) {
      r = r || 0;
      let best = 0;
      const list = this.query(x - r, z - r, x + r, z + r);
      for (const b of list) {
        if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) {
          if (b.maxY <= fromY + 0.05 && b.maxY > best) best = b.maxY;
        }
      }
      return best;
    }

    // Ray cast with DDA traversal over the hash grid. Returns nearest hit or null.
    raycast(ox, oy, oz, dx, dy, dz, maxDist, filter) {
      const c = this.cell;
      let best = null, bestT = maxDist;
      const s = ++this.stamp;
      let ix = Math.floor(ox / c), iz = Math.floor(oz / c);
      const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
      const tDeltaX = Math.abs(dx) > 1e-9 ? Math.abs(c / dx) : Infinity;
      const tDeltaZ = Math.abs(dz) > 1e-9 ? Math.abs(c / dz) : Infinity;
      let tMaxX = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (ix + 1) * c - ox : ox - ix * c) / Math.abs(dx)) : Infinity;
      let tMaxZ = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (iz + 1) * c - oz : oz - iz * c) / Math.abs(dz)) : Infinity;
      let tCell = 0;
      for (let iter = 0; iter < 400; iter++) {
        const list = this.grid.get(this.key(ix, iz));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const b = list[i];
            if (b._s === s) continue;
            b._s = s;
            if (filter && !filter(b)) continue;
            const r = Collision.rayBox(ox, oy, oz, dx, dy, dz, b, bestT);
            if (r && r.t < bestT) { bestT = r.t; best = r; best.box = b; }
          }
        }
        if (tCell > bestT) break;
        if (tMaxX < tMaxZ) { tCell = tMaxX; tMaxX += tDeltaX; ix += stepX; }
        else { tCell = tMaxZ; tMaxZ += tDeltaZ; iz += stepZ; }
        if (tCell > bestT || tCell > maxDist) break;
      }
      // ground plane
      if (dy < -1e-6 && this.hasGround !== false) {
        const tg = -oy / dy;
        if (tg >= 0 && tg < bestT) {
          bestT = tg;
          best = { t: tg, nx: 0, ny: 1, nz: 0, box: null, ground: true };
        }
      }
      if (best) {
        best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t;
      }
      return best;
    }

    static rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
      let tmin = 0, tmax = maxT, nx = 0, ny = 0, nz = 0;
      // X
      if (Math.abs(dx) < 1e-9) { if (ox < b.minX || ox > b.maxX) return null; }
      else {
        let t1 = (b.minX - ox) / dx, t2 = (b.maxX - ox) / dx, n = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; n = 1; }
        if (t1 > tmin) { tmin = t1; nx = n; ny = 0; nz = 0; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      if (Math.abs(dy) < 1e-9) { if (oy < b.minY || oy > b.maxY) return null; }
      else {
        let t1 = (b.minY - oy) / dy, t2 = (b.maxY - oy) / dy, n = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; n = 1; }
        if (t1 > tmin) { tmin = t1; nx = 0; ny = n; nz = 0; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      if (Math.abs(dz) < 1e-9) { if (oz < b.minZ || oz > b.maxZ) return null; }
      else {
        let t1 = (b.minZ - oz) / dz, t2 = (b.maxZ - oz) / dz, n = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; n = 1; }
        if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = n; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      if (tmin <= 0 && nx === 0 && ny === 0 && nz === 0) return { t: 0, nx: 0, ny: 1, nz: 0, inside: true };
      return { t: tmin, nx, ny, nz };
    }

    // Move a vertical cylinder body (approximated as a square footprint) through the world.
    // pos/vel are THREE.Vector3; result written to out.
    moveBody(pos, vel, dt, r, h, step, out, opts) {
      out.grounded = false; out.wall = null; out.wallNx = 0; out.wallNz = 0; out.ceil = false; out.landedOn = null;
      const minY = opts && opts.minY != null ? opts.minY : -Infinity;
      const ignoreLow = opts && opts.ignoreLow; // vehicles ignore curbs
      const skip = opts && opts.skip;
      const eps = 0.001;
      // --- X axis
      let nx = pos.x + vel.x * dt;
      let list = this.query(Math.min(pos.x, nx) - r, pos.z - r, Math.max(pos.x, nx) + r, pos.z + r);
      for (const b of list) {
        if (skip && skip(b)) continue;
        if (b.maxY <= pos.y + step || b.minY >= pos.y + h) continue;
        if (ignoreLow && b.maxY < ignoreLow) continue;
        if (pos.z + r <= b.minZ || pos.z - r >= b.maxZ) continue;
        if (nx + r > b.minX && nx - r < b.maxX) {
          if (pos.x + r <= b.minX + eps * 4) { nx = b.minX - r - eps; out.wall = b; out.wallNx = -1; out.wallNz = 0; }
          else if (pos.x - r >= b.maxX - eps * 4) { nx = b.maxX + r + eps; out.wall = b; out.wallNx = 1; out.wallNz = 0; }
          else {
            // already overlapping: push out along the shallowest axis
            const pl = nx + r - b.minX, pr = b.maxX - (nx - r);
            const pf = pos.z + r - b.minZ, pb = b.maxZ - (pos.z - r);
            const m = Math.min(pl, pr, pf, pb);
            if (m === pl) nx = b.minX - r - eps; else if (m === pr) nx = b.maxX + r + eps;
            else if (m === pf) pos.z = b.minZ - r - eps; else pos.z = b.maxZ + r + eps;
          }
        }
      }
      pos.x = nx;
      // --- Z axis
      let nz = pos.z + vel.z * dt;
      list = this.query(pos.x - r, Math.min(pos.z, nz) - r, pos.x + r, Math.max(pos.z, nz) + r);
      for (const b of list) {
        if (skip && skip(b)) continue;
        if (b.maxY <= pos.y + step || b.minY >= pos.y + h) continue;
        if (ignoreLow && b.maxY < ignoreLow) continue;
        if (pos.x + r <= b.minX || pos.x - r >= b.maxX) continue;
        if (nz + r > b.minZ && nz - r < b.maxZ) {
          if (pos.z + r <= b.minZ + eps * 4) { nz = b.minZ - r - eps; out.wall = b; out.wallNx = 0; out.wallNz = -1; }
          else if (pos.z - r >= b.maxZ - eps * 4) { nz = b.maxZ + r + eps; out.wall = b; out.wallNx = 0; out.wallNz = 1; }
          else {
            const pf = nz + r - b.minZ, pb = b.maxZ - (nz - r);
            nz = pf < pb ? b.minZ - r - eps : b.maxZ + r + eps;
          }
        }
      }
      pos.z = nz;
      // --- Y axis
      let ny = pos.y + vel.y * dt;
      list = this.query(pos.x - r, pos.z - r, pos.x + r, pos.z + r);
      for (const b of list) {
        if (skip && skip(b)) continue;
        if (ignoreLow && b.maxY < ignoreLow) continue;
        if (pos.x + r <= b.minX || pos.x - r >= b.maxX || pos.z + r <= b.minZ || pos.z - r >= b.maxZ) continue;
        if (vel.y <= 0.0001) {
          if (b.maxY <= pos.y + step + 0.01 && b.maxY >= ny - 0.001) {
            if (b.maxY > ny) { ny = b.maxY; }
            out.grounded = true; out.landedOn = b;
          }
        } else {
          if (b.minY >= pos.y + h - 0.05 && b.minY <= ny + h) { ny = b.minY - h - eps; out.ceil = true; }
        }
      }
      const g = this.hasGround === false ? -Infinity : 0;
      if (ny <= g + 0.001 && vel.y <= 0.0001) { ny = g; out.grounded = true; }
      if (ny < minY) ny = minY;
      pos.y = ny;
      if (out.grounded && vel.y < 0) vel.y = 0;
      if (out.ceil && vel.y > 0) vel.y = 0;
      // bounds
      const B = this.bounds;
      if (B) {
        if (pos.x < B.minX) { pos.x = B.minX; out.wall = out.wall || { bound: true }; }
        if (pos.x > B.maxX) { pos.x = B.maxX; out.wall = out.wall || { bound: true }; }
        if (pos.z < B.minZ) { pos.z = B.minZ; out.wall = out.wall || { bound: true }; }
        if (pos.z > B.maxZ) { pos.z = B.maxZ; out.wall = out.wall || { bound: true }; }
      }
      return out;
    }
  }
  NR.Collision = Collision;
})();
