"""Build College Man, College Woman GLBs and Neutral Idle + InjuredRun clips for College characters.

Usage:
    python art/build_college_actors.py
"""

from __future__ import annotations

import io
import json
import struct
import sys
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation as R

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_injured_run import FBX_TIME_UNIT, RX_NEG90, load_glb_json, parse_fbx_nodes, sanitize_bone

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "dist" / "assets"
BOY_GLB = ASSETS / "runverse-schoolboy.glb"
V6_GLB = ASSETS / "runverse-runner-v6.glb"
INJURED_FBX = Path(r"C:\Users\kishore\Downloads\Injured Run.fbx")
NEUTRAL_IDLE_FBX = Path(r"C:\Users\kishore\Downloads\Neutral Idle.fbx")
MAN_ZIP = Path(r"C:\Users\kishore\Downloads\character3_man.zip")
WOMAN_ZIP = Path(r"C:\Users\kishore\Downloads\charater2_Women.zip")

MIXAMO_TO_CC = {
    "mixamorig:Hips": "CC_Base_Hip",
    "mixamorig:Spine": "CC_Base_Waist",
    "mixamorig:Spine1": "CC_Base_Spine01",
    "mixamorig:Spine2": "CC_Base_Spine02",
    "mixamorig:Neck": "CC_Base_NeckTwist01",
    "mixamorig:Head": "CC_Base_Head",
    "mixamorig:LeftShoulder": "CC_Base_L_Clavicle",
    "mixamorig:LeftArm": "CC_Base_L_Upperarm",
    "mixamorig:LeftForeArm": "CC_Base_L_Forearm",
    "mixamorig:LeftHand": "CC_Base_L_Hand",
    "mixamorig:RightShoulder": "CC_Base_R_Clavicle",
    "mixamorig:RightArm": "CC_Base_R_Upperarm",
    "mixamorig:RightForeArm": "CC_Base_R_Forearm",
    "mixamorig:RightHand": "CC_Base_R_Hand",
    "mixamorig:LeftUpLeg": "CC_Base_L_Thigh",
    "mixamorig:LeftLeg": "CC_Base_L_Calf",
    "mixamorig:LeftFoot": "CC_Base_L_Foot",
    "mixamorig:LeftToeBase": "CC_Base_L_ToeBase",
    "mixamorig:RightUpLeg": "CC_Base_R_Thigh",
    "mixamorig:RightLeg": "CC_Base_R_Calf",
    "mixamorig:RightFoot": "CC_Base_R_Foot",
    "mixamorig:RightToeBase": "CC_Base_R_ToeBase",
}
for side_m, side_c in (("Left", "L"), ("Right", "R")):
    for f_m, f_c in (("Thumb", "Thumb"), ("Index", "Index"), ("Middle", "Mid"), ("Ring", "Ring"), ("Pinky", "Pinky")):
        for idx in (1, 2, 3):
            MIXAMO_TO_CC[f"mixamorig:{side_m}Hand{f_m}{idx}"] = f"CC_Base_{side_c}_{f_c}{idx}"


def orthonormal_rot(mat3: np.ndarray) -> R:
    u, _, vt = np.linalg.svd(mat3)
    det = np.linalg.det(u @ vt)
    if det < 0:
        u[:, -1] *= -1
    return R.from_matrix(u @ vt)


def decode_glb_full(path: Path):
    raw = path.read_bytes()
    json_size = struct.unpack_from("<I", raw, 12)[0]
    gltf = json.loads(raw[20 : 20 + json_size])
    bin_off = 20 + json_size
    bin_size = struct.unpack_from("<I", raw, bin_off)[0]
    buf = raw[bin_off + 8 : bin_off + 8 + bin_size]
    return gltf, buf


def read_accessor(gltf: dict, buf: bytes, idx: int) -> np.ndarray:
    acc = gltf["accessors"][idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    ctype = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[acc["componentType"]]
    ncomp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[acc["type"]]
    stride = bv.get("byteStride")
    if stride and stride != ncomp * np.dtype(ctype).itemsize:
        arr = np.empty((count, ncomp), dtype=ctype)
        item_sz = ncomp * np.dtype(ctype).itemsize
        for i in range(count):
            arr[i] = np.frombuffer(buf, dtype=ctype, count=ncomp, offset=offset + i * stride)
    else:
        arr = np.frombuffer(buf, dtype=ctype, count=count * ncomp, offset=offset)
        if ncomp > 1:
            arr = arr.reshape(count, ncomp)
    arr = arr.astype(np.float64)
    if acc.get("normalized"):
        if ctype == np.int8:
            arr = np.maximum(arr / 127.0, -1.0)
        elif ctype == np.uint8:
            arr /= 255.0
        elif ctype == np.int16:
            arr = np.maximum(arr / 32767.0, -1.0)
        elif ctype == np.uint16:
            arr /= 65535.0
    return arr


def gltf_fk_clip(gltf: dict, buf: bytes, clip_name: str, is_fbx_y_up_target: bool = True):
    """Compute world positions (Hips) and world rotations (all Mixamo bones) for each frame of a GLB clip."""
    nodes = gltf["nodes"]
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    name_to_idx = {n.get("name", ""): i for i, n in enumerate(nodes)}

    rest_t = [np.array(n.get("translation", [0.0, 0.0, 0.0]), dtype=np.float64) for n in nodes]
    rest_r = [R.from_quat(n.get("rotation", [0.0, 0.0, 0.0, 1.0])) for n in nodes]
    rest_s = [np.array(n.get("scale", [1.0, 1.0, 1.0]), dtype=np.float64) for n in nodes]

    def fk_rot_pos(local_r, local_t):
        wr = [None] * len(nodes)
        wp = [None] * len(nodes)

        def solve(i: int):
            if wr[i] is None:
                if i in parents:
                    pr, pp, ps = solve_full(parents[i])
                    wr[i] = pr * local_r[i]
                    wp[i] = pp + pr.apply(ps * local_t[i])
                else:
                    wr[i] = local_r[i]
                    wp[i] = local_t[i].copy()
            return wr[i], wp[i]

        def solve_full(i: int):
            r, p = solve(i)
            # Propagate Armature root scale
            scale_acc = rest_s[i].copy()
            cur = parents.get(i)
            while cur is not None:
                scale_acc = scale_acc * rest_s[cur]
                cur = parents.get(cur)
            return r, p, scale_acc

        for i in range(len(nodes)):
            solve(i)
        return wr, wp

    rest_wr, rest_wp = fk_rot_pos(rest_r, rest_t)

    anim = next(a for a in gltf["animations"] if a["name"] == clip_name)
    chan_data = {}
    all_times = set()
    for ch in anim["channels"]:
        nid = ch["target"].get("node")
        path = ch["target"].get("path")
        if nid is None or path not in ("rotation", "translation"):
            continue
        sampler = anim["samplers"][ch["sampler"]]
        t = read_accessor(gltf, buf, sampler["input"])
        v = read_accessor(gltf, buf, sampler["output"])
        chan_data[(nid, path)] = (t, v)
        all_times.update(np.round(t, 6).tolist())

    times = np.array(sorted(all_times), dtype=np.float64)
    if len(times) == 0:
        times = np.array([0.0], dtype=np.float64)
    duration = float(times[-1])

    # Interpolate each channel on unified timeline
    eval_r = {}
    eval_t = {}
    for (nid, path), (ct, cv) in chan_data.items():
        if path == "translation":
            cols = [np.interp(times, ct, cv[:, k]) for k in range(3)]
            eval_t[nid] = np.column_stack(cols)
        elif path == "rotation":
            # Ensure hemisphere continuity before linear blend + renormalize
            q = cv.copy()
            for k in range(1, len(q)):
                if np.dot(q[k - 1], q[k]) < 0:
                    q[k] = -q[k]
            cols = [np.interp(times, ct, q[:, k]) for k in range(4)]
            qm = np.column_stack(cols)
            qm /= np.linalg.norm(qm, axis=1, keepdims=True)
            eval_r[nid] = R.from_quat(qm)

    frames_rot = {nm: [] for nm in MIXAMO_TO_CC if nm in name_to_idx}
    hips_idx = name_to_idx["mixamorig:Hips"]
    hips_world_pos = []
    hips_rest_world_pos = rest_wp[hips_idx]
    hips_src_height = max(0.2, float(hips_rest_world_pos[1]))

    for fi in range(len(times)):
        lr = list(rest_r)
        lt = list(rest_t)
        for nid, rots in eval_r.items():
            lr[nid] = rots[fi]
        for nid, ts in eval_t.items():
            lt[nid] = ts[fi]
        wr, wp = fk_rot_pos(lr, lt)
        hips_world_pos.append(wp[hips_idx])
        for nm in frames_rot:
            frames_rot[nm].append(wr[name_to_idx[nm]])

    hips_world_pos = np.asarray(hips_world_pos, dtype=np.float64)
    rest_world_map = {nm: rest_wr[name_to_idx[nm]] for nm in frames_rot}
    anim_world_map = {nm: R.concatenate(rots) for nm, rots in frames_rot.items()}
    return {
        "name": clip_name,
        "times": times,
        "duration": duration,
        "rest_world": rest_world_map,
        "anim_world": anim_world_map,
        "hips_world_pos": hips_world_pos,
        "hips_rest_world_pos": hips_rest_world_pos,
        "hips_src_height": hips_src_height,
    }


def mixamo_fbx_fk_clip(fbx_path: Path, clip_name: str, target_fps: float | None = None, rx_neg90_root: bool = False):
    """Extract FK world rest + animated rotations & hip positions from a Mixamo FBX file."""
    nodes = parse_fbx_nodes(fbx_path.read_bytes())
    objs = {c[1][0]: c for c in next(n for n in nodes if n[0] == "Objects")[2]}
    conns = next(n for n in nodes if n[0] == "Connections")[2]
    models = {k: v for k, v in objs.items() if v[0] == "Model"}
    cns = {k: v for k, v in objs.items() if v[0] == "AnimationCurveNode"}
    curves = {k: v for k, v in objs.items() if v[0] == "AnimationCurve"}

    parent_of = {}
    model_anim, cn_axes = {}, {}
    for _, p, _ in conns:
        if p[0] == "OO" and p[1] in models and p[2] in models:
            parent_of[p[1]] = p[2]
        elif p[0] == "OP":
            ch, pa, prop = p[1], p[2], p[3]
            if ch in cns and pa in models:
                model_anim.setdefault(pa, {})[prop] = ch
            elif ch in curves and pa in cns:
                cn_axes.setdefault(pa, {})[prop.split("|")[-1]] = ch

    # Determine timeline
    all_t = set()
    for props in model_anim.values():
        for cn_id in props.values():
            for cid in cn_axes.get(cn_id, {}).values():
                kt = next(s[1][0] for s in curves[cid][2] if s[0] == "KeyTime")
                all_t.update(((kt - kt[0]).astype(np.float64) / FBX_TIME_UNIT).tolist())
    raw_times = np.array(sorted(all_t), dtype=np.float64)
    duration = float(raw_times[-1]) if len(raw_times) else 0.0
    if target_fps and duration > 0:
        n_samples = max(2, int(round(duration * target_fps)) + 1)
        times = np.linspace(0.0, duration, n_samples)
    else:
        times = raw_times

    def eval_curve_vec(cn_id, default):
        axes = cn_axes.get(cn_id, {})
        cols = []
        for idx, ax in enumerate(("X", "Y", "Z")):
            cid = axes.get(ax)
            if cid is not None:
                cnode = curves[cid]
                ckt = next(s[1][0] for s in cnode[2] if s[0] == "KeyTime")
                c_t = (ckt - ckt[0]).astype(np.float64) / FBX_TIME_UNIT
                c_v = next(s[1][0] for s in cnode[2] if s[0] == "KeyValueFloat").astype(np.float64)
                cols.append(np.interp(times, c_t, c_v))
            else:
                cols.append(np.full(len(times), float(default[idx]), dtype=np.float64))
        return np.column_stack(cols)

    bone_names = {mid: models[mid][1][1].split("\x00")[0] for mid in models}
    rest_local = {}
    anim_local = {}
    hips_mid = next(mid for mid, nm in bone_names.items() if nm == "mixamorig:Hips")
    hips_trans_m = None
    hips_rest_pos_m = None

    for mid, mnode in models.items():
        p70 = {p[1][0]: p[1][4:] for p in next((c[2] for c in mnode[2] if c[0] == "Properties70"), [])}
        pre = R.from_euler("xyz", p70.get("PreRotation", [0.0, 0.0, 0.0]), degrees=True)
        lcl_r_def = p70.get("Lcl Rotation", [0.0, 0.0, 0.0])
        lcl_t_def = np.array(p70.get("Lcl Translation", [0.0, 0.0, 0.0]), dtype=np.float64)
        base_r = RX_NEG90 if (rx_neg90_root and mid == hips_mid) else R.identity()
        rest_local[mid] = base_r * pre * R.from_euler("xyz", lcl_r_def, degrees=True)

        props = model_anim.get(mid, {})
        if "Lcl Rotation" in props:
            rvals = eval_curve_vec(props["Lcl Rotation"], lcl_r_def)
            anim_local[mid] = base_r * pre * R.from_euler("xyz", rvals, degrees=True)
        else:
            anim_local[mid] = R.concatenate([rest_local[mid]] * len(times))

        if mid == hips_mid:
            hips_rest_pos_m = (RX_NEG90.apply(lcl_t_def) if rx_neg90_root else lcl_t_def) * 0.01
            if "Lcl Translation" in props:
                tvals = eval_curve_vec(props["Lcl Translation"], lcl_t_def)
                hips_trans_m = (RX_NEG90.apply(tvals) if rx_neg90_root else tvals) * 0.01
            else:
                hips_trans_m = np.tile(hips_rest_pos_m, (len(times), 1))

    # Forward kinematics
    rest_world = {}
    anim_world = {}

    def solve_bone(mid: int):
        if mid in rest_world:
            return
        pa = parent_of.get(mid)
        if pa in models:
            solve_bone(pa)
            rest_world[mid] = rest_world[pa] * rest_local[mid]
            anim_world[mid] = anim_world[pa] * anim_local[mid]
        else:
            rest_world[mid] = rest_local[mid]
            anim_world[mid] = anim_local[mid]

    for mid in models:
        solve_bone(mid)

    rest_map = {}
    anim_map = {}
    for mid, nm in bone_names.items():
        if nm in MIXAMO_TO_CC:
            rest_map[nm] = rest_world[mid]
            anim_map[nm] = anim_world[mid]

    # Neutral Idle's mixamorig FBX hips height is ~202-209cm; use frame 0 Y height when rest is close to zero
    src_h = float(hips_rest_pos_m[1]) if hips_rest_pos_m[1] > 0.2 else float(np.mean(hips_trans_m[:, 1]))
    # Normalize lateral drift on Neutral Idle / Injured Run relative to frame mean while keeping vertical motion
    anchor = np.array([float(np.mean(hips_trans_m[:, 0])), float(np.mean(hips_trans_m[:, 1])), float(np.mean(hips_trans_m[:, 2]))])
    return {
        "name": clip_name,
        "times": times,
        "duration": duration,
        "rest_world": rest_map,
        "anim_world": anim_map,
        "hips_world_pos": hips_trans_m,
        "hips_rest_world_pos": anchor,
        "hips_src_height": max(0.2, src_h),
    }


def retarget_clip_to_gltf_skeleton(clip: dict, nodes: list[dict], bone_name_to_node_idx: dict[str, int], bone_map: dict[str, str], rest_world_rots: dict[int, R], rest_world_positions: dict[int, np.ndarray], hips_target_name: str, is_idle: bool = False):
    """Solve target local quaternions and Hips translation using FK world-space delta retargeting."""
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    # Topological bone list
    order = []

    def visit(i: int):
        order.append(i)
        for c in nodes[i].get("children", []):
            visit(c)

    root_nodes = [i for i in range(len(nodes)) if i not in parents]
    for r in root_nodes:
        visit(r)

    rev_map = {dst: src for src, dst in bone_map.items() if src in clip["anim_world"] and dst in bone_name_to_node_idx}
    rest_local_rot = [R.from_quat(n.get("rotation", [0.0, 0.0, 0.0, 1.0])) for n in nodes]
    times = clip["times"]
    n_frames = len(times)

    # Compute target world orientation per frame
    target_world = {}
    for nid in order:
        if "mesh" in nodes[nid]:
            continue
        nm = nodes[nid].get("name", "")
        if nm in rev_map:
            src_nm = rev_map[nm]
            delta_w = clip["anim_world"][src_nm] * clip["rest_world"][src_nm].inv()
            target_world[nid] = delta_w * rest_world_rots[nid]
        else:
            # Propagate animated parent onto unmapped child (e.g. Twist/Pelvis/NeckTwist02)
            pa = parents.get(nid)
            if pa in target_world:
                target_world[nid] = target_world[pa] * rest_local_rot[nid]
            else:
                target_world[nid] = R.concatenate([rest_world_rots.get(nid, R.identity())] * n_frames)

    tracks = []
    # 1. Hips translation
    hips_nid = bone_name_to_node_idx[hips_target_name]
    hips_rest_p = rest_world_positions[hips_nid]
    target_h = max(0.2, float(hips_rest_p[1]))
    scale = target_h / clip["hips_src_height"]
    delta_p = (clip["hips_world_pos"] - clip["hips_rest_world_pos"]) * scale
    if is_idle:
        # Keep Idle centered horizontally on the podium while preserving subtle weight shift and bounce
        delta_p[:, 0] *= 0.35
        delta_p[:, 2] *= 0.35
    parent_rest_rot = rest_world_rots[parents[hips_nid]] if hips_nid in parents else R.identity()
    # Parent node is root (identity), or Armature (+90X, scale 0.01) for v6
    parent_scale = np.array(nodes[parents[hips_nid]].get("scale", [1.0, 1.0, 1.0]), dtype=np.float64) if hips_nid in parents else np.ones(3)
    hip_local_pos = np.array(nodes[hips_nid].get("translation", [0.0, 0.0, 0.0]), dtype=np.float64) + parent_rest_rot.inv().apply(delta_p) / parent_scale

    # 2. Local rotations for mapped bones
    rot_tracks = {}
    for dst_nm in rev_map:
        nid = bone_name_to_node_idx[dst_nm]
        pa = parents.get(nid)
        pa_w = target_world[pa] if pa in target_world else R.concatenate([R.identity()] * n_frames)
        loc_r = pa_w.inv() * target_world[nid]
        q = loc_r.as_quat()
        for k in range(1, len(q)):
            if np.dot(q[k - 1], q[k]) < 0:
                q[k] = -q[k]
        rot_tracks[nid] = q.astype(np.float32)

    return times.astype(np.float32), hips_nid, hip_local_pos.astype(np.float32), rot_tracks


def extract_actor_from_zip(zip_path: Path, fbx_rel: str, diffuse_rel: str, normal_rel: str):
    """Parse an ActorCore zip (FBX + PBR textures) into mesh data and Y-up meter skeleton."""
    with zipfile.ZipFile(zip_path) as z:
        fbx_bytes = z.read(fbx_rel)
        diffuse_bytes = z.read(diffuse_rel)
        normal_bytes = z.read(normal_rel)

    # Compress diffuse 1024x1024 & normal 512x512 JPEG for crisp lightweight mobile GLB
    diff_img = Image.open(io.BytesIO(diffuse_bytes)).convert("RGB").resize((1024, 1024), Image.LANCZOS)
    diff_buf = io.BytesIO()
    diff_img.save(diff_buf, format="JPEG", quality=86, optimize=True)
    norm_img = Image.open(io.BytesIO(normal_bytes)).convert("RGB").resize((512, 512), Image.LANCZOS)
    norm_buf = io.BytesIO()
    norm_img.save(norm_buf, format="JPEG", quality=82, optimize=True)

    nodes = parse_fbx_nodes(fbx_bytes)
    objs = {c[1][0]: c for c in next(n for n in nodes if n[0] == "Objects")[2]}
    conns = next(n for n in nodes if n[0] == "Connections")[2]
    children_of = {}
    for cn in conns:
        if cn[1][0] == "OO":
            children_of.setdefault(cn[1][2], []).append(cn[1][1])

    # Main Geometry (non-empty PolygonVertexIndex)
    geo_id = next(k for k, v in objs.items() if v[0] == "Geometry" and any(s[0] == "PolygonVertexIndex" and len(s[1][0]) > 0 for s in v[2]))
    geo = objs[geo_id]
    raw_verts = np.array(next(s[1][0] for s in geo[2] if s[0] == "Vertices"), dtype=np.float64).reshape(-1, 3)
    polys = np.array(next(s[1][0] for s in geo[2] if s[0] == "PolygonVertexIndex"), dtype=np.int32)
    uv_node = next(s for s in geo[2] if s[0] == "LayerElementUV")
    raw_uvs = np.array(next(s[1][0] for s in uv_node[2] if s[0] == "UV"), dtype=np.float64).reshape(-1, 2)
    uv_idx = np.array(next(s[1][0] for s in uv_node[2] if s[0] == "UVIndex"), dtype=np.int32)
    norm_node = next(s for s in geo[2] if s[0] == "LayerElementNormal")
    raw_norms = np.array(next(s[1][0] for s in norm_node[2] if s[0] == "Normals"), dtype=np.float64).reshape(-1, 3)

    # Skin deformer & bone weights per original vertex
    skin_id = next(ch for ch in children_of[geo_id] if objs[ch][0] == "Deformer" and objs[ch][1][2] == "Skin")
    cluster_ids = [ch for ch in children_of[skin_id] if objs[ch][0] == "Deformer" and objs[ch][1][2] == "Cluster"]

    bone_weights_raw = [[] for _ in range(len(raw_verts))]
    mesh_world_fbx = None
    joint_bind_world_m = {}

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

    # Transform vertices & normals into Y-up meters
    rot_m = mesh_world_fbx[:3, :3]
    verts_m = (raw_verts @ rot_m.T + mesh_world_fbx[:3, 3]) * 0.01
    norms_m = raw_norms @ rot_m.T
    norms_len = np.linalg.norm(norms_m, axis=1, keepdims=True)
    norms_m /= np.maximum(norms_len, 1e-8)

    # Extract full PoseNode world matrices in Y-up meters
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

    # Build topological bone hierarchy starting from 'root'
    root_id = next(k for k, v in objs.items() if v[0] == "Model" and v[1][1].split("\x00")[0] == "root")
    bone_nodes = []
    bone_name_to_idx = {}
    bone_world_mats = {}
    bone_world_rots = {}
    bone_world_pos = {}

    def add_bone_tree(mid: int, parent_gltf_idx: int | None):
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

        if parent_gltf_idx is not None:
            p_rot = bone_world_rots[parent_gltf_idx]
            p_pos = bone_world_pos[parent_gltf_idx]
            l_rot = p_rot.inv() * w_rot
            l_pos = p_rot.inv().apply(w_pos - p_pos)
        else:
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

    add_bone_tree(root_id, None)

    # Triangulate polygons and deduplicate split vertices (pos_idx, rounded normal, rounded UV)
    split_verts = {}
    out_pos = []
    out_norm = []
    out_uv = []
    out_joints = []
    out_weights = []
    out_indices = []

    def corner_index(v_i: int, pv_i: int) -> int:
        n = norms_m[pv_i]
        uv = raw_uvs[uv_idx[pv_i]]
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

        # Top 4 weights
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


def build_glb(actor: dict, clips: list[dict], mesh_name: str, out_path: Path):
    """Assemble a complete binary glTF 2.0 (.glb) with mesh, skin, PBR material, and animations."""
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

    # Inverse bind matrices (column-major float32 for each joint 0..N-1)
    n_bones = len(actor["bone_nodes"])
    ibms = np.zeros((n_bones, 4, 4), dtype=np.float32)
    for j in range(n_bones):
        # Store column-major in buffer -> transpose row-major numpy inv
        ibms[j] = np.linalg.inv(actor["bone_world_mats"][j]).T.astype(np.float32)
    ibm_acc = add_accessor(add_view(ibms.tobytes()), 5126, "MAT4", n_bones)

    # Images
    diff_bv = add_view(actor["diffuse_jpg"])
    norm_bv = add_view(actor["normal_jpg"])

    # Nodes: [bones 0..n_bones-1, mesh_node n_bones]
    nodes = [dict(b) for b in actor["bone_nodes"]]
    mesh_node_idx = len(nodes)
    nodes.append({"name": mesh_name, "mesh": 0, "skin": 0})

    # Animations
    gltf_anims = []
    for clip in clips:
        times, hips_nid, hip_pos, rot_tracks = retarget_clip_to_gltf_skeleton(
            clip,
            nodes,
            actor["bone_name_to_idx"],
            MIXAMO_TO_CC,
            actor["bone_world_rots"],
            actor["bone_world_pos"],
            "CC_Base_Hip",
            is_idle=(clip["name"] == "Idle"),
        )
        t_acc = add_accessor(add_view(times.tobytes()), 5126, "SCALAR", len(times), [times.min()], [times.max()])
        samplers = []
        channels = []

        # Hip position track
        hp_acc = add_accessor(add_view(hip_pos.tobytes()), 5126, "VEC3", len(times))
        samplers.append({"input": t_acc, "interpolation": "LINEAR", "output": hp_acc})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": hips_nid, "path": "translation"}})

        for nid, quats in rot_tracks.items():
            q_acc = add_accessor(add_view(quats.tobytes()), 5126, "VEC4", len(times))
            samplers.append({"input": t_acc, "interpolation": "LINEAR", "output": q_acc})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": nid, "path": "rotation"}})

        gltf_anims.append({"name": clip["name"], "samplers": samplers, "channels": channels})

    bin_blob = b"".join(bin_chunks)
    gltf = {
        "asset": {"version": "2.0", "generator": "LMSK LifeRush College Actor Exporter"},
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
        "skins": [{"inverseBindMatrices": ibm_acc, "skeleton": 0, "joints": list(range(n_bones))}],
        "materials": [
            {
                "name": "Character_Pbr",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0.04,
                    "roughnessFactor": 0.78,
                },
                "normalTexture": {"index": 1, "scale": 0.7},
            }
        ],
        "textures": [{"sampler": 0, "source": 0}, {"sampler": 0, "source": 1}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "images": [
            {"bufferView": diff_bv, "mimeType": "image/jpeg"},
            {"bufferView": norm_bv, "mimeType": "image/jpeg"},
        ],
        "buffers": [{"byteLength": len(bin_blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "animations": gltf_anims,
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((-len(json_bytes)) % 4)
    bin_blob += b"\x00" * ((-len(bin_blob)) % 4)
    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
    out_path.write_bytes(
        struct.pack("<4sII", b"glTF", 2, total_len)
        + struct.pack("<I4s", len(json_bytes), b"JSON")
        + json_bytes
        + struct.pack("<I4s", len(bin_blob), b"BIN\0")
        + bin_blob
    )
    print(f"Wrote {out_path.name}: {out_path.stat().st_size / 1024:.1f} KB, {len(pos)} verts, {n_bones} bones, {len(gltf_anims)} animations")


def build_json_clip(clip: dict, nodes: list[dict], bone_map: dict[str, str], hips_target_name: str, is_idle: bool):
    """Build Three.js AnimationClip JSON tracks for a target skeleton."""
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    name_to_idx = {n.get("name", ""): i for i, n in enumerate(nodes)}
    rest_rots = {}
    rest_pos = {}
    scales = {}

    def solve(i: int):
        if i in rest_rots:
            return
        lr = R.from_quat(nodes[i].get("rotation", [0.0, 0.0, 0.0, 1.0]))
        lt = np.array(nodes[i].get("translation", [0.0, 0.0, 0.0]), dtype=np.float64)
        ls = np.array(nodes[i].get("scale", [1.0, 1.0, 1.0]), dtype=np.float64)
        if i in parents:
            p = parents[i]
            solve(p)
            rest_rots[i] = rest_rots[p] * lr
            scales[i] = scales[p] * ls
            rest_pos[i] = rest_pos[p] + rest_rots[p].apply(scales[p] * lt)
        else:
            rest_rots[i] = lr
            scales[i] = ls
            rest_pos[i] = lt

    for i in range(len(nodes)):
        solve(i)

    times, hips_nid, hip_pos, rot_tracks = retarget_clip_to_gltf_skeleton(
        clip, nodes, name_to_idx, bone_map, rest_rots, rest_pos, hips_target_name, is_idle=is_idle
    )
    times_list = [round(float(x), 5) for x in times]
    tracks = [
        {
            "name": f"{sanitize_bone(hips_target_name)}.position",
            "type": "vector",
            "times": times_list,
            "values": [round(float(v), 5) for v in hip_pos.reshape(-1)],
        }
    ]
    for nid, quats in rot_tracks.items():
        b_name = sanitize_bone(nodes[nid]["name"])
        tracks.append(
            {
                "name": f"{b_name}.quaternion",
                "type": "quaternion",
                "times": times_list,
                "values": [round(float(v), 6) for v in quats.reshape(-1)],
            }
        )
    return tracks


def main():
    print("Extracting animations from Neutral Idle.fbx, runverse-schoolboy.glb, and Injured Run.fbx...")
    boy_gltf, boy_buf = decode_glb_full(BOY_GLB)
    neutral_idle = mixamo_fbx_fk_clip(NEUTRAL_IDLE_FBX, "Idle", target_fps=18.0, rx_neg90_root=False)
    injured_clip = mixamo_fbx_fk_clip(INJURED_FBX, "InjuredRun", target_fps=None, rx_neg90_root=False)

    clip_names = ["Run", "Jump", "Slide", "Roll", "Stumble", "HeadHit", "Fall", "ShoulderSweep"]
    clips_for_actors = [neutral_idle] + [gltf_fk_clip(boy_gltf, boy_buf, nm) for nm in clip_names]

    print("Building college-man.glb (character3_man.zip)...")
    man = extract_actor_from_zip(
        MAN_ZIP,
        "Actor/party-m-0001/party-m-0001.fbx",
        "Actor/party-m-0001/party-m-0001.fbm/Character_Pbr_Diffuse.png",
        "Actor/party-m-0001/party-m-0001.fbm/Character_Pbr_Normal.jpg",
    )
    build_glb(man, clips_for_actors, "College_Man_Mesh", ASSETS / "college-man.glb")

    print("Building college-woman.glb (charater2_Women.zip)...")
    woman = extract_actor_from_zip(
        WOMAN_ZIP,
        "Actor/party-f-0001/party-f-0001.fbx",
        "Actor/party-f-0001/party-f-0001.fbm/Character_Pbr_Diffuse.png",
        "Actor/party-f-0001/party-f-0001.fbm/Character_Pbr_Normal.jpg",
    )
    build_glb(woman, clips_for_actors, "College_Woman_Mesh", ASSETS / "college-woman.glb")

    # Export Neutral Idle for college-male (runverse-runner-v6.glb) -> college-idle.json
    v6_gltf = load_glb_json(V6_GLB)
    v6_map = {k: k for k in MIXAMO_TO_CC if any(n.get("name") == k for n in v6_gltf["nodes"])}
    v6_idle_tracks = build_json_clip(neutral_idle, v6_gltf["nodes"], v6_map, "mixamorig:Hips", is_idle=True)
    college_idle_path = ASSETS / "college-idle.json"
    college_idle_path.write_text(
        json.dumps({"name": "Idle", "duration": round(neutral_idle["duration"], 6), "college-male": v6_idle_tracks}, separators=(",", ":"))
    )
    print(f"Wrote {college_idle_path.name}: {len(v6_idle_tracks)} tracks, duration={neutral_idle['duration']:.3f}s")

    # Append CC_Base tracks (college-man & college-woman) into injured-run.json
    injured_path = ASSETS / "injured-run.json"
    injured_payload = json.loads(injured_path.read_text())
    man_gltf = load_glb_json(ASSETS / "college-man.glb")
    woman_gltf = load_glb_json(ASSETS / "college-woman.glb")
    injured_payload["college-man"] = build_json_clip(injured_clip, man_gltf["nodes"], MIXAMO_TO_CC, "CC_Base_Hip", is_idle=False)
    injured_payload["college-woman"] = build_json_clip(injured_clip, woman_gltf["nodes"], MIXAMO_TO_CC, "CC_Base_Hip", is_idle=False)
    injured_path.write_text(json.dumps(injured_payload, separators=(",", ":")))
    print(f"Updated {injured_path.name}: added college-man ({len(injured_payload['college-man'])}) & college-woman ({len(injured_payload['college-woman'])}) tracks")


if __name__ == "__main__":
    main()
