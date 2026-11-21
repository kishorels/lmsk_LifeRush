"""Upgrade schoolgirl.glb skirt mesh, 4-bone cloth skinning, expressive morph targets, and bow fit.

Operates directly on the current optimized dist/assets/schoolgirl.glb so all existing textures,
hair, jacket, skeleton, uniformSourceDocument metadata, and original animation channels stay intact.

Usage:
    python art/upgrade_schoolgirl_skirt.py
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT / "dist" / "assets" / "schoolgirl.glb"


def smoothstep(x: float) -> float:
    c = max(0.0, min(1.0, x))
    return c * c * (3.0 - 2.0 * c)


def compute_normals(vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    n = np.zeros_like(vertices, dtype=np.float64)
    v0 = vertices[triangles[:, 0]]
    v1 = vertices[triangles[:, 1]]
    v2 = vertices[triangles[:, 2]]
    cross = np.cross(v1 - v0, v2 - v0)
    for corner in range(3):
        np.add.at(n, triangles[:, corner], cross)
    norms = np.linalg.norm(n, axis=1, keepdims=True)
    return (n / np.maximum(norms, 1e-10)).astype(np.float32)


def main():
    raw = GLB_PATH.read_bytes()
    json_size = struct.unpack_from("<I", raw, 12)[0]
    g = json.loads(raw[20 : 20 + json_size])
    bin_off = 20 + json_size
    bin_size = struct.unpack_from("<I", raw, bin_off)[0]
    data = bytearray(raw[bin_off + 8 : bin_off + 8 + bin_size])

    def read_acc(idx: int) -> np.ndarray:
        a = g["accessors"][idx]
        bv = g["bufferViews"][a["bufferView"]]
        sz = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
        dt = {5126: "<f4", 5123: "<u2", 5125: "<u4", 5121: "u1"}[a["componentType"]]
        return np.frombuffer(
            data,
            dtype=dt,
            count=a["count"] * sz,
            offset=bv.get("byteOffset", 0) + a.get("byteOffset", 0),
        ).reshape(-1, sz).copy()

    def add_bv(binary: bytes) -> int:
        data.extend(b"\0" * (-len(data) % 4))
        idx = len(g["bufferViews"])
        g["bufferViews"].append({"buffer": 0, "byteOffset": len(data), "byteLength": len(binary)})
        data.extend(binary)
        return idx

    def add_acc(values, kind=None) -> int:
        a = np.asarray(values)
        is_int = a.dtype.kind in "iu"
        if is_int:
            dtype = "<u2" if (a.size == 0 or int(a.max()) < 65536) else "<u4"
        else:
            dtype = "<f4"
        a = np.asarray(a, dtype=dtype)
        if a.ndim == 1:
            a = a.reshape(-1, 1)
        bv = add_bv(a.tobytes())
        ctype = 5123 if a.dtype == np.dtype("<u2") else (5125 if is_int else 5126)
        acc = {
            "bufferView": bv,
            "componentType": ctype,
            "count": len(a),
            "type": kind or {1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4"}[a.shape[1]],
        }
        if len(a):
            acc["min"] = a.min(0).tolist()
            acc["max"] = a.max(0).tolist()
        g["accessors"].append(acc)
        return len(g["accessors"]) - 1

    # Locate jacket, skirt, and skin joints
    jacket_node = next(n for n in g["nodes"] if "fitted jacket" in n.get("name", ""))
    jacket_prim = g["meshes"][jacket_node["mesh"]]["primitives"][0]
    jacket_verts = read_acc(jacket_prim["attributes"]["POSITION"])
    jacket_joints = read_acc(jacket_prim["attributes"]["JOINTS_0"])
    jacket_weights = read_acc(jacket_prim["attributes"]["WEIGHTS_0"])
    jacket_tree = cKDTree(jacket_verts)

    skirt_node_idx, skirt_node = next(
        (i, n) for i, n in enumerate(g["nodes"]) if "pleated skirt" in n.get("name", "")
    )
    skirt_mesh = g["meshes"][skirt_node["mesh"]]
    black_mat = skirt_mesh["primitives"][0]["material"]
    red_mat = skirt_mesh["primitives"][1]["material"]

    skin = g["skins"][skirt_node["skin"]]
    joint_ids = {g["nodes"][n]["name"].replace("mixamorig:", ""): i for i, n in enumerate(skin["joints"])}

    # Build contoured, naturally-draped 16-pleat school skirt with smooth 4-bone skinning
    # and expressive aerodynamic wind/flare/flutter morph targets.
    points, uvs, faces, face_mats = [], [], [], []
    joints, weights = [], []
    sway_left, sway_right = [], []

    levels = sorted(set([i / 24 for i in range(25)] + [0.78, 0.82, 0.88, 0.92]))
    segments = 128

    for t in levels:
        # Snug waist tuck (0.154m x 0.114m) flush with fitted jacket waist -> smooth hip contour ->
        # soft flowing A-line skirt flare (0.246m x 0.184m) instead of a rigid 0.31m lampshade cone!
        hip_curve = smoothstep(t / 0.42)
        flare = max(0.0, t - 0.16) ** 1.26
        base_rx = 0.154 + 0.044 * hip_curve + 0.056 * flare
        base_rz = 0.114 + 0.022 * hip_curve + 0.052 * flare
        z_center = -0.008 * hip_curve - 0.005 * t

        for col in range(segments + 1):
            theta = col / segments * math.tau
            # Soft rounded woven cloth pleats (zero sharp paper sawtooth edges)
            pleat = 0.74 * math.sin(theta * 16.0) + 0.26 * math.sin(theta * 32.0 + 0.4)
            drape = 0.005 * math.sin(theta * 3.0 + 0.35) * (t ** 1.4)
            fold = pleat * (t ** 1.35)

            px = (base_rx + 0.014 * fold + drape) * math.sin(theta)
            pz = z_center + (base_rz + 0.012 * fold + drape) * math.cos(theta)
            py = 1.072 - 0.392 * t + 0.007 * math.cos(theta) * (t ** 1.2) - 0.004 * abs(math.sin(theta)) * t
            points.append([px, py, pz])
            uvs.append([col / segments * 6.0, t * 3.0])

            # 4-bone smooth cloth skinning: Spine+Hips lock waistband to jacket; thighs smoothly carry drape
            spine_w = 0.42 * (1.0 - smoothstep(t / 0.26))
            leg_w = 0.74 * smoothstep((t - 0.14) / 0.86)
            hips_w = max(0.0, 1.0 - spine_w - leg_w)
            left_share = 0.5 + 0.5 * math.tanh(px / 0.052)
            w_sum = spine_w + hips_w + leg_w
            joints.append([joint_ids["Hips"], joint_ids["LeftUpLeg"], joint_ids["RightUpLeg"], joint_ids["Spine"]])
            weights.append([
                hips_w / w_sum,
                (leg_w * left_share) / w_sum,
                (leg_w * (1.0 - left_share)) / w_sum,
                spine_w / w_sum,
            ])

            # Expressive cloth morph targets: backward aerodynamic wind billow + outward radial flare +
            # subtle hem lift + opposite-phase wave flutter & lateral inertia swing!
            t2 = t ** 1.55
            t3 = t ** 1.75
            rad_x = math.sin(theta) * 0.036 * t2
            rad_z = math.cos(theta) * 0.026 * t2
            wind_back = -0.072 * t3
            hem_lift = 0.028 * t3
            rip_a = math.sin(theta * 4.0 + t * 3.8)
            rip_b = math.cos(theta * 3.0 - t * 3.2)

            sway_left.append([
                rad_x + 0.046 * t2 + 0.010 * rip_b * t3,
                hem_lift + 0.014 * rip_a * t3,
                rad_z + wind_back + 0.012 * rip_a * t3,
            ])
            sway_right.append([
                rad_x - 0.046 * t2 - 0.010 * rip_b * t3,
                hem_lift - 0.014 * rip_a * t3,
                rad_z + wind_back - 0.012 * rip_a * t3,
            ])

    for row in range(len(levels) - 1):
        mid = (levels[row] + levels[row + 1]) * 0.5
        mat = red_mat if (0.78 <= mid <= 0.82 or 0.88 <= mid <= 0.92) else black_mat
        for col in range(segments):
            a = row * (segments + 1) + col
            b = a + segments + 1
            faces.extend([(a, b, a + 1), (a + 1, b, b + 1)])
            face_mats.extend([mat, mat])

    pts_arr = np.asarray(points, dtype=np.float32)
    faces_arr = np.asarray(faces, dtype=np.int32)
    fm_arr = np.asarray(face_mats, dtype=np.int32)
    norms_arr = compute_normals(pts_arr, faces_arr)

    attrs = {
        "POSITION": add_acc(pts_arr),
        "NORMAL": add_acc(norms_arr),
        "TEXCOORD_0": add_acc(np.asarray(uvs, dtype=np.float32)),
        "JOINTS_0": add_acc(np.asarray(joints, dtype=np.uint16)),
        "WEIGHTS_0": add_acc(np.asarray(weights, dtype=np.float32)),
    }
    t0_acc = add_acc(np.asarray(sway_left, dtype=np.float32))
    t1_acc = add_acc(np.asarray(sway_right, dtype=np.float32))
    targets = [{"POSITION": t0_acc}, {"POSITION": t1_acc}]

    skirt_mesh["primitives"] = [
        {
            "attributes": attrs,
            "indices": add_acc(faces_arr[fm_arr == black_mat].reshape(-1)),
            "material": int(black_mat),
            "targets": targets,
        },
        {
            "attributes": attrs,
            "indices": add_acc(faces_arr[fm_arr == red_mat].reshape(-1)),
            "material": int(red_mat),
            "targets": targets,
        },
    ]
    skirt_mesh["weights"] = [0.0, 0.0]

    # Refit the overly oversized red bow lobes & tails slightly neater (~22% more proportionate)
    def surface_z(px: float, py: float) -> float:
        near = jacket_verts[(np.abs(jacket_verts[:, 0] - px) < 0.027) & (np.abs(jacket_verts[:, 1] - py) < 0.025)]
        if not len(near):
            near = jacket_verts[jacket_tree.query([px, py, 0.1], k=10)[1]]
        return float(near[:, 2].max())

    def replace_mesh_geo(node_name: str, pts, tris):
        node = next(n for n in g["nodes"] if n.get("name") == node_name)
        m = g["meshes"][node["mesh"]]
        mat = m["primitives"][0]["material"]
        p_arr = np.asarray(pts, dtype=np.float32)
        f_arr = np.asarray(tris, dtype=np.int32)
        _, closest = jacket_tree.query(p_arr)
        m["primitives"] = [{
            "attributes": {
                "POSITION": add_acc(p_arr),
                "NORMAL": add_acc(compute_normals(p_arr, f_arr)),
                "TEXCOORD_0": add_acc(p_arr[:, :2] * 4.0),
                "JOINTS_0": add_acc(jacket_joints[closest].astype(np.uint16)),
                "WEIGHTS_0": add_acc(jacket_weights[closest].astype(np.float32)),
            },
            "indices": add_acc(f_arr.reshape(-1)),
            "material": int(mat),
        }]

    for side in (-1, 1):
        b_pts, b_tris = [], []
        for row in range(13):
            v = row / 12.0 * 2.0 - 1.0
            for col in range(17):
                u = col / 16.0
                px = side * (0.008 + 0.080 * u)
                py = 1.438 + v * (0.011 + 0.035 * math.sin(u * math.pi / 2.0)) + 0.006 * u
                pz = surface_z(px, py) + 0.013 + 0.017 * math.sin(u * math.pi) * math.cos(v * math.pi / 2.0) + 0.002 * math.sin(v * math.pi * 3.0) * u
                b_pts.append([px, py, pz])
                if row < 12 and col < 16:
                    a = row * 17 + col
                    b_tris.extend([(a, a + 1, a + 17), (a + 1, a + 18, a + 17)])
        replace_mesh_geo(f"Uniform folded red bow {side}", b_pts, b_tris)

        t_pts, t_tris = [], []
        for row in range(17):
            t = row / 16.0
            for col in range(7):
                u = col / 6.0 * 2.0 - 1.0
                px = side * (0.010 + t * 0.025) + u * (0.011 + 0.009 * t)
                py = 1.432 - 0.142 * t + 0.009 * abs(u) * (t ** 8)
                pz = surface_z(px, py) + 0.017 + 0.009 * math.sin(t * math.pi) + 0.003 * math.sin(u * math.pi * 2.0) * math.sin(t * math.pi)
                t_pts.append([px, py, pz])
                if row < 16 and col < 6:
                    a = row * 7 + col
                    t_tris.extend([(a, a + 1, a + 7), (a + 1, a + 8, a + 7)])
        replace_mesh_geo(f"Uniform draped bow tail {side}", t_pts, t_tris)

    # Refresh baked skirt cloth-weight channel samplers (keeping exact channel structure intact!)
    for clip in g["animations"]:
        w_chan = clip["channels"][-1]
        if w_chan["target"].get("node") == skirt_node_idx and w_chan["target"].get("path") == "weights":
            smp = clip["samplers"][w_chan["sampler"]]
            times = read_acc(smp["input"]).reshape(-1)
            dur = max(float(times[-1]), 0.001)
            phase = times / dur
            if clip["name"] == "Run":
                w0 = 0.30 + 0.42 * (0.5 + 0.5 * np.sin(phase * math.tau * 2.0))
                w1 = 0.30 + 0.42 * (0.5 - 0.5 * np.sin(phase * math.tau * 2.0))
            elif clip["name"] in ("Jump", "Slide", "Roll"):
                lift = 0.16 + 0.56 * np.sin(phase * math.pi)
                w0, w1 = lift, lift
            else:
                w0 = 0.05 + 0.04 * (0.5 + 0.5 * np.sin(phase * math.tau))
                w1 = 0.05 + 0.04 * (0.5 - 0.5 * np.sin(phase * math.tau))
            vals = np.stack([w0, w1], axis=-1).reshape(-1).astype(np.float32)
            smp["output"] = add_acc(vals, kind="SCALAR")

    g["buffers"][0]["byteLength"] = len(data)
    meta = json.dumps(g, separators=(",", ":")).encode("utf-8")
    meta += b" " * (-len(meta) % 4)
    data.extend(b"\0" * (-len(data) % 4))
    total = 28 + len(meta) + len(data)
    GLB_PATH.write_bytes(
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(meta), 0x4E4F534A)
        + meta
        + struct.pack("<II", len(data), 0x004E4942)
        + data
    )
    print(f"Upgraded {GLB_PATH.name}: {total / 1024:.1f} KB, skirt verts={len(pts_arr)}, bow & cloth weights updated.")


if __name__ == "__main__":
    main()
