"""Build Aged Elder (Ch39) GLB with Run Forward animation and standard runner clips.

Usage:
    python art/build_aged_elder.py

Writes dist/assets/aged-elder.glb with:
- Ch39 mesh, skin, compressed PBR textures
- 65-bone Mixamo skeleton
- Complete 9-clip animation suite (Run from Run Forward.fbx, Neutral Idle, Jump, Slide, Roll, etc.)
"""
from __future__ import annotations

import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation as R

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_college_actors import (
    ASSETS,
    BOY_GLB,
    NEUTRAL_IDLE_FBX,
    MIXAMO_TO_CC,
    decode_glb_full,
    gltf_fk_clip,
    mixamo_fbx_fk_clip,
    orthonormal_rot,
    retarget_clip_to_gltf_skeleton,
)
from export_injured_run import parse_fbx_nodes

CH39_FBX = Path(r"C:\Users\kishore\Downloads\Ch39_nonPBR.fbx")
RUN_FORWARD_FBX = Path(r"C:\Users\kishore\Downloads\Run Forward.fbx")
OUT_GLB = ASSETS / "aged-elder.glb"


def extract_ch39_actor(fbx_path: Path) -> dict:
    raw = fbx_path.read_bytes()
    nodes = parse_fbx_nodes(raw)
    objs = {c[1][0]: c for c in next(n for n in nodes if n[0] == "Objects")[2]}
    conns = next(n for n in nodes if n[0] == "Connections")[2]

    children_of = {}
    for cn in conns:
        if cn[1][0] == "OO":
            children_of.setdefault(cn[1][2], []).append(cn[1][1])

    # Extract & compress diffuse and normal textures
    videos = {k: v for k, v in objs.items() if v[0] == "Video"}
    # file2 is diffuse, file5 is normal
    diff_vid = next(v for v in videos.values() if "file2" in str(v[1][1]))
    norm_vid = next(v for v in videos.values() if "file5" in str(v[1][1]))

    diff_bytes = bytes(next(c for c in diff_vid[2] if c[0] == "Content")[1][0])
    norm_bytes = bytes(next(c for c in norm_vid[2] if c[0] == "Content")[1][0])

    diff_img = Image.open(io.BytesIO(diff_bytes)).convert("RGB").resize((1024, 1024), Image.LANCZOS)
    diff_buf = io.BytesIO()
    diff_img.save(diff_buf, format="JPEG", quality=86, optimize=True)

    norm_img = Image.open(io.BytesIO(norm_bytes)).convert("RGB").resize((512, 512), Image.LANCZOS)
    norm_buf = io.BytesIO()
    norm_img.save(norm_buf, format="JPEG", quality=82, optimize=True)

    # Main Geometry
    geo_id = next(k for k, v in objs.items() if v[0] == "Geometry" and any(s[0] == "PolygonVertexIndex" and len(s[1][0]) > 0 for s in v[2]))
    geo = objs[geo_id]
    raw_verts = np.array(next(s[1][0] for s in geo[2] if s[0] == "Vertices"), dtype=np.float64).reshape(-1, 3)
    polys = np.array(next(s[1][0] for s in geo[2] if s[0] == "PolygonVertexIndex"), dtype=np.int32)
    uv_node = next(s for s in geo[2] if s[0] == "LayerElementUV")
    raw_uvs = np.array(next(s[1][0] for s in uv_node[2] if s[0] == "UV"), dtype=np.float64).reshape(-1, 2)
    uv_idx = np.array(next(s[1][0] for s in uv_node[2] if s[0] == "UVIndex"), dtype=np.int32) if any(s[0] == "UVIndex" for s in uv_node[2]) else None
    norm_node = next(s for s in geo[2] if s[0] == "LayerElementNormal")
    raw_norms = np.array(next(s[1][0] for s in norm_node[2] if s[0] == "Normals"), dtype=np.float64).reshape(-1, 3)

    # Skin deformer & bone weights
    skin_id = next(ch for ch in children_of[geo_id] if objs[ch][0] == "Deformer" and objs[ch][1][2] == "Skin")
    cluster_ids = [ch for ch in children_of[skin_id] if objs[ch][0] == "Deformer" and objs[ch][1][2] == "Cluster"]

    bone_weights_raw = [[] for _ in range(len(raw_verts))]
    mesh_world_fbx = None

    for cl_id in cluster_ids:
        cl = objs[cl_id]
        bid = next(ch for ch in children_of[cl_id] if objs[ch][0] == "Model")
        b_name = objs[bid][1][1].split("\x00")[0]
        tl = np.array(next(s[1][0] for s in cl[2] if s[0] == "TransformLink"), dtype=np.float64).reshape(4, 4).T
        if mesh_world_fbx is None:
            t = np.array(next(s[1][0] for s in cl[2] if s[0] == "Transform"), dtype=np.float64).reshape(4, 4).T
            mesh_world_fbx = tl @ t
        idxs = next((s[1][0] for s in cl[2] if s[0] == "Indexes"), np.array([], dtype=np.int32))
        wts = next((s[1][0] for s in cl[2] if s[0] == "Weights"), np.array([], dtype=np.float64))
        for vi, wt in zip(idxs, wts):
            if wt > 1e-6:
                bone_weights_raw[int(vi)].append((b_name, float(wt)))

    rot_m = mesh_world_fbx[:3, :3] if mesh_world_fbx is not None else np.eye(3)
    t_m = mesh_world_fbx[:3, 3] if mesh_world_fbx is not None else np.zeros(3)
    verts_m = (raw_verts @ rot_m.T + t_m) * 0.01
    norms_m = raw_norms @ rot_m.T
    norms_len = np.linalg.norm(norms_m, axis=1, keepdims=True)
    norms_m /= np.maximum(norms_len, 1e-8)

    # Extract PoseNode world matrices in meters
    pose = next(v for v in objs.values() if v[0] == "Pose")
    pose_mats = {}
    for pn in pose[2]:
        if pn[0] == "PoseNode":
            nid = next(s[1][0] for s in pn[2] if s[0] == "Node")
            if nid in objs and objs[nid][0] == "Model":
                nm = objs[nid][1][1].split("\x00")[0]
                mat = np.array(next(s[1][0] for s in pn[2] if s[0] == "Matrix"), dtype=np.float64).reshape(4, 4).T
                mat[:3, 3] *= 0.01
                pose_mats[nm] = (nid, mat)

    # Build bone hierarchy starting with Armature root and mixamorig:Hips
    hips_id = next(k for k, v in objs.items() if v[0] == "Model" and v[1][1].split("\x00")[0] == "mixamorig:Hips")
    bone_nodes = []
    bone_name_to_idx = {}
    bone_world_mats = {}
    bone_world_rots = {}
    bone_world_pos = {}

    # Armature root node (index 0)
    armature_idx = 0
    armature_node = {
        "name": "Armature",
        "translation": [0.0, 0.0, 0.0],
        "rotation": [0.0, 0.0, 0.0, 1.0],
        "children": [1],
    }
    bone_nodes.append(armature_node)
    bone_world_mats[0] = np.eye(4, dtype=np.float64)
    bone_world_rots[0] = R.identity()
    bone_world_pos[0] = np.zeros(3, dtype=np.float64)
    bone_name_to_idx["Armature"] = 0

    def add_bone_tree(mid: int, parent_gltf_idx: int):
        nm = objs[mid][1][1].split("\x00")[0]
        if nm not in pose_mats:
            return
        idx = len(bone_nodes)
        _, wmat = pose_mats[nm]
        w_rot = orthonormal_rot(wmat[:3, :3])
        w_pos = wmat[:3, 3].copy()
        bone_world_mats[idx] = wmat
        bone_world_rots[idx] = w_rot
        bone_world_pos[idx] = w_pos
        bone_name_to_idx[nm] = idx

        if parent_gltf_idx > 0:
            p_rot = bone_world_rots[parent_gltf_idx]
            p_pos = bone_world_pos[parent_gltf_idx]
            l_rot = p_rot.inv() * w_rot
            l_pos = p_rot.inv().apply(w_pos - p_pos)
        else:
            # First child under Armature root (mixamorig:Hips)
            l_rot = w_rot
            l_pos = w_pos

        node = {
            "name": nm,
            "translation": [float(x) for x in l_pos],
            "rotation": [float(x) for x in l_rot.as_quat()],
        }
        bone_nodes.append(node)

        child_indices = []
        for ch in children_of.get(mid, []):
            if ch in objs and objs[ch][0] == "Model" and objs[ch][1][2] == "LimbNode":
                ch_idx = len(bone_nodes)
                add_bone_tree(ch, idx)
                if len(bone_nodes) > ch_idx:
                    child_indices.append(ch_idx)
        if child_indices:
            node["children"] = child_indices

    add_bone_tree(hips_id, armature_idx)

    # Triangulate polygons
    split_verts = {}
    out_pos = []
    out_norm = []
    out_uv = []
    out_joints = []
    out_weights = []
    out_indices = []

    def corner_index(v_i: int, pv_i: int) -> int:
        n = norms_m[pv_i] if len(norms_m) == len(polys) else norms_m[v_i]
        uv = raw_uvs[uv_idx[pv_i]] if uv_idx is not None else raw_uvs[v_i]
        u_g, v_g = float(uv[0]), 1.0 - float(uv[1])
        key = (v_i, round(float(n[0]), 4), round(float(n[1]), 4), round(float(n[2]), 4), round(u_g, 5), round(v_g, 5))
        existing = split_verts.get(key)
        if existing is not None:
            return existing
        new_i = len(out_pos)
        split_verts[key] = new_i
        out_pos.append(verts_m[v_i])
        out_norm.append(n)
        out_uv.append((u_g, v_g))

        w_list = sorted(bone_weights_raw[v_i], key=lambda x: -x[1])
        j4 = [0, 0, 0, 0]
        w4 = [0.0, 0.0, 0.0, 0.0]
        k = 0
        for bnm, wt in w_list:
            if bnm in bone_name_to_idx:
                j4[k] = bone_name_to_idx[bnm]
                w4[k] = wt
                k += 1
                if k == 4:
                    break
        s_w = sum(w4)
        if s_w > 0:
            w4 = [x / s_w for x in w4]
        else:
            w4[0] = 1.0
        out_joints.append(j4)
        out_weights.append(w4)
        return new_i

    face = []
    for pv_i, raw_v in enumerate(polys):
        end = raw_v < 0
        v_i = int(-raw_v - 1 if end else raw_v)
        face.append((v_i, pv_i))
        if end:
            c0 = corner_index(*face[0])
            for t_i in range(1, len(face) - 1):
                c1 = corner_index(*face[t_i])
                c2 = corner_index(*face[t_i + 1])
                out_indices.extend((c0, c1, c2))
            face.clear()

    return {
        "positions": np.asarray(out_pos, dtype=np.float32),
        "normals": np.asarray(out_norm, dtype=np.float32),
        "uvs": np.asarray(out_uv, dtype=np.float32),
        "joints": np.asarray(out_joints, dtype=np.uint16),
        "weights": np.asarray(out_weights, dtype=np.float32),
        "indices": np.asarray(out_indices, dtype=np.uint32),
        "bone_nodes": bone_nodes,
        "bone_name_to_idx": bone_name_to_idx,
        "bone_world_mats": bone_world_mats,
        "bone_world_rots": bone_world_rots,
        "bone_world_pos": bone_world_pos,
        "diffuse_jpg": diff_buf.getvalue(),
        "normal_jpg": norm_buf.getvalue(),
    }


def build_elder_glb(actor: dict, clips: list[dict], mesh_name: str, out_path: Path):
    bin_chunks = []
    buffer_views = []
    accessors = []

    def add_view(data: bytes, target: int | None = None) -> int:
        offset = sum(len(c) for c in bin_chunks)
        pad = (-len(data)) % 4
        bin_chunks.append(data + b"\x00" * pad)
        bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            bv["target"] = target
        idx = len(buffer_views)
        buffer_views.append(bv)
        return idx

    def add_accessor(bv_idx: int, comp_type: int, acc_type: str, count: int, min_v=None, max_v=None) -> int:
        acc = {"bufferView": bv_idx, "componentType": comp_type, "type": acc_type, "count": count}
        if min_v is not None:
            acc["min"] = [float(x) for x in min_v]
        if max_v is not None:
            acc["max"] = [float(x) for x in max_v]
        idx = len(accessors)
        accessors.append(acc)
        return idx

    pos = actor["positions"]
    pos_acc = add_accessor(add_view(pos.tobytes(), 34962), 5126, "VEC3", len(pos), pos.min(axis=0), pos.max(axis=0))
    norm_acc = add_accessor(add_view(actor["normals"].tobytes(), 34962), 5126, "VEC3", len(pos))
    uv_acc = add_accessor(add_view(actor["uvs"].tobytes(), 34962), 5126, "VEC2", len(pos))
    joints_acc = add_accessor(add_view(actor["joints"].tobytes(), 34962), 5123, "VEC4", len(pos))
    weights_acc = add_accessor(add_view(actor["weights"].tobytes(), 34962), 5126, "VEC4", len(pos))
    idx_acc = add_accessor(add_view(actor["indices"].tobytes(), 34963), 5125, "SCALAR", len(actor["indices"]))

    # Inverse bind matrices
    n_bones = len(actor["bone_nodes"])
    ibms = np.zeros((n_bones, 4, 4), dtype=np.float32)
    # Joint 0 is Armature (identity)
    ibms[0] = np.eye(4, dtype=np.float32)
    for j in range(1, n_bones):
        if j in actor["bone_world_mats"]:
            ibms[j] = np.linalg.inv(actor["bone_world_mats"][j]).T.astype(np.float32)
        else:
            ibms[j] = np.eye(4, dtype=np.float32)
    ibm_acc = add_accessor(add_view(ibms.tobytes()), 5126, "MAT4", n_bones)

    diff_bv = add_view(actor["diffuse_jpg"])
    norm_bv = add_view(actor["normal_jpg"])

    nodes = [dict(b) for b in actor["bone_nodes"]]
    mesh_node_idx = len(nodes)
    nodes.append({"name": mesh_name, "mesh": 0, "skin": 0})

    # Identity mapping for Mixamo -> Mixamo
    identity_bone_map = {k: k for k in MIXAMO_TO_CC}

    gltf_anims = []
    for clip in clips:
        times, hips_nid, hip_pos, rot_tracks = retarget_clip_to_gltf_skeleton(
            clip,
            nodes,
            actor["bone_name_to_idx"],
            identity_bone_map,
            actor["bone_world_rots"],
            actor["bone_world_pos"],
            "mixamorig:Hips",
            is_idle=(clip["name"] == "Idle"),
        )
        t_acc = add_accessor(add_view(times.tobytes()), 5126, "SCALAR", len(times), [times.min()], [times.max()])
        samplers = []
        channels = []

        # Hip position
        hp_acc = add_accessor(add_view(hip_pos.tobytes()), 5126, "VEC3", len(times))
        samplers.append({"input": t_acc, "output": hp_acc, "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": hips_nid, "path": "translation"}})

        for nid, quats in rot_tracks.items():
            q_acc = add_accessor(add_view(quats.tobytes()), 5126, "VEC4", len(times))
            samplers.append({"input": t_acc, "output": q_acc, "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": nid, "path": "rotation"}})

        gltf_anims.append({"name": clip["name"], "samplers": samplers, "channels": channels})
        print(f"  Clip {clip['name']:14s}: {len(channels):2d} channels, duration={clip['duration']:.3f}s")

    gltf = {
        "asset": {"version": "2.0", "generator": "LMSK-LifeRush-AgedElderBuilder"},
        "scene": 0,
        "scenes": [{"nodes": [0, mesh_node_idx]}],
        "nodes": nodes,
        "meshes": [
            {
                "name": mesh_name,
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": pos_acc,
                            "NORMAL": norm_acc,
                            "TEXCOORD_0": uv_acc,
                            "JOINTS_0": joints_acc,
                            "WEIGHTS_0": weights_acc,
                        },
                        "indices": idx_acc,
                        "material": 0,
                    }
                ],
            }
        ],
        "skins": [
            {
                "name": "Armature_Skin",
                "inverseBindMatrices": ibm_acc,
                "joints": list(range(n_bones)),
                "skeleton": 0,
            }
        ],
        "materials": [
            {
                "name": "Ch39_Material",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0.05,
                    "roughnessFactor": 0.85,
                },
                "normalTexture": {"index": 1},
                "doubleSided": True,
            }
        ],
        "textures": [{"sampler": 0, "source": 0}, {"sampler": 0, "source": 1}],
        "images": [
            {"bufferView": diff_bv, "mimeType": "image/jpeg"},
            {"bufferView": norm_bv, "mimeType": "image/jpeg"},
        ],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "animations": gltf_anims,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": sum(len(c) for c in bin_chunks)}],
    }

    raw_json = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_pad = (-len(raw_json)) % 4
    raw_json += b" " * json_pad

    bin_data = b"".join(bin_chunks)
    total_len = 12 + 8 + len(raw_json) + 8 + len(bin_data)

    header = struct.pack("<4sII", b"glTF", 2, total_len)
    json_hdr = struct.pack("<II", len(raw_json), 0x4E4F534A)  # JSON
    bin_hdr = struct.pack("<II", len(bin_data), 0x004E4942)   # BIN\0

    out_path.write_bytes(header + json_hdr + raw_json + bin_hdr + bin_data)
    print(f"Wrote {out_path.name}: {out_path.stat().st_size / (1024 * 1024):.2f} MB ({len(pos)} verts, {n_bones} bones, {len(gltf_anims)} animations)")


def main():
    print(f"Extracting Aged Elder from {CH39_FBX.name}...")
    actor = extract_ch39_actor(CH39_FBX)
    print(f"Actor extracted: {len(actor['positions'])} vertices, {len(actor['bone_nodes'])} bones")

    print(f"Extracting Run animation from {RUN_FORWARD_FBX.name}...")
    run_clip = mixamo_fbx_fk_clip(RUN_FORWARD_FBX, "Run")

    print(f"Extracting Neutral Idle from {NEUTRAL_IDLE_FBX.name}...")
    idle_clip = mixamo_fbx_fk_clip(NEUTRAL_IDLE_FBX, "Idle", target_fps=18.0)

    print(f"Extracting other gameplay animations from {BOY_GLB.name}...")
    boy_gltf, boy_buf = decode_glb_full(BOY_GLB)
    other_clip_names = ["Jump", "Slide", "Roll", "Stumble", "HeadHit", "Fall", "ShoulderSweep"]
    other_clips = [gltf_fk_clip(boy_gltf, boy_buf, nm) for nm in other_clip_names]

    all_clips = [idle_clip, run_clip] + other_clips

    print(f"Building {OUT_GLB.name}...")
    build_elder_glb(actor, all_clips, "Ch39_AgedElder_Mesh", OUT_GLB)


if __name__ == "__main__":
    main()
