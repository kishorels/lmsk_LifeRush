"""Parse Mixamo 'Injured Run.fbx', convert bone tracks to Boy GLB space and retarget to Girl GLB space.

Usage:
    python art/export_injured_run.py "C:/Users/kishore/Downloads/Injured Run.fbx" dist/assets/injured-run.json
"""

from __future__ import annotations

import json
import struct
import sys
import zlib
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parent.parent
BOY_GLB = ROOT / "dist" / "assets" / "runverse-schoolboy.glb"
GIRL_GLB = ROOT / "dist" / "assets" / "schoolgirl.glb"
DEFAULT_FBX = Path(r"C:\Users\kishore\Downloads\Injured Run.fbx")
DEFAULT_OUT = ROOT / "dist" / "assets" / "injured-run.json"

FBX_TIME_UNIT = 46186158000.0
RX_NEG90 = R.from_euler("x", -90.0, degrees=True)


def parse_fbx_nodes(data: bytes):
    version = struct.unpack_from("<I", data, 23)[0]
    is64 = version >= 7500
    sentinel_len = 25 if is64 else 13
    hdr_fmt = "<QQQB" if is64 else "<IIIB"

    def read_node(pos: int):
        end, nprops, plen, nlen = struct.unpack_from(hdr_fmt, data, pos)
        pos += sentinel_len
        if end == 0:
            return None, pos
        name = data[pos : pos + nlen].decode("latin1")
        pos += nlen
        props = []
        p_end = pos + plen
        for _ in range(nprops):
            t = chr(data[pos])
            pos += 1
            if t in "YCI":
                fmt = {"Y": "<h", "C": "<?", "I": "<i"}[t]
                props.append(struct.unpack_from(fmt, data, pos)[0])
                pos += struct.calcsize(fmt)
            elif t in "FDL":
                fmt = {"F": "<f", "D": "<d", "L": "<q"}[t]
                props.append(struct.unpack_from(fmt, data, pos)[0])
                pos += struct.calcsize(fmt)
            elif t in "SR":
                length = struct.unpack_from("<I", data, pos)[0]
                pos += 4
                raw = data[pos : pos + length]
                pos += length
                props.append(raw.decode("utf8", "ignore") if t == "S" else raw)
            elif t in "fdlib":
                _, enc, clen = struct.unpack_from("<III", data, pos)
                pos += 12
                raw = zlib.decompress(data[pos : pos + clen]) if enc else data[pos : pos + clen]
                pos += clen
                dtype = {"f": "<f4", "d": "<f8", "l": "<i8", "i": "<i4", "b": "u1"}[t]
                props.append(np.frombuffer(raw, dtype=dtype))
        pos = p_end
        children = []
        while pos < end - sentinel_len:
            child, pos = read_node(pos)
            if child is None:
                break
            children.append(child)
        return (name, props, children), end

    pos = 27
    top = []
    while pos < len(data) - sentinel_len:
        node, pos = read_node(pos)
        if node is None:
            break
        top.append(node)
    return top


def load_glb_json(path: Path) -> dict:
    raw = path.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    return json.loads(raw[20 : 20 + size])


def glb_rest_frames(gltf: dict):
    nodes = gltf["nodes"]
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    world = {}

    def rot(i: int):
        if i not in world:
            p = rot(parents[i]) if i in parents else R.identity()
            world[i] = p * R.from_quat(nodes[i].get("rotation", [0.0, 0.0, 0.0, 1.0]))
        return world[i]

    return [(rot(parents[i]) if i in parents else R.identity(), rot(i)) for i in range(len(nodes))]


def sanitize_bone(name: str) -> str:
    return name.replace(":", "")


def convert_injured_run(fbx_path: Path, out_path: Path):
    nodes = parse_fbx_nodes(fbx_path.read_bytes())
    objs = next(n for n in nodes if n[0] == "Objects")[2]
    conns = next(n for n in nodes if n[0] == "Connections")[2]

    models = {c[1][0]: c for c in objs if c[0] == "Model"}
    curve_nodes = {c[1][0]: c for c in objs if c[0] == "AnimationCurveNode"}
    curves = {c[1][0]: c for c in objs if c[0] == "AnimationCurve"}

    model_anim = {}
    cn_axes = {}
    for _, p, _ in conns:
        child, parent = p[1], p[2]
        prop = p[3] if len(p) > 3 else ""
        if child in curve_nodes and parent in models:
            model_anim.setdefault(parent, {})[prop] = child
        elif child in curves and parent in curve_nodes:
            cn_axes.setdefault(parent, {})[prop] = child

    boy_gltf = load_glb_json(BOY_GLB)
    girl_gltf = load_glb_json(GIRL_GLB)
    boy_ids = {n.get("name", ""): i for i, n in enumerate(boy_gltf["nodes"])}
    girl_ids = {n.get("name", ""): i for i, n in enumerate(girl_gltf["nodes"])}
    bf = glb_rest_frames(boy_gltf)
    gf = glb_rest_frames(girl_gltf)

    boy_tracks = []
    girl_tracks = []
    duration = 0.0

    for m_id, props in model_anim.items():
        m = models[m_id]
        name = m[1][1].split("\x00")[0]
        if not name.startswith("mixamorig:") or name not in boy_ids:
            continue

        p70 = {p[1][0]: p[1][4:] for p in next((c[2] for c in m[2] if c[0] == "Properties70"), [])}
        pre_deg = p70.get("PreRotation", [0.0, 0.0, 0.0])
        lcl_rot_def = p70.get("Lcl Rotation", [0.0, 0.0, 0.0])
        lcl_trans_def = p70.get("Lcl Translation", [0.0, 0.0, 0.0])
        pre_rot = R.from_euler("xyz", pre_deg, degrees=True)
        is_hips = name == "mixamorig:Hips"
        track_bone = sanitize_bone(name)

        bi = boy_ids[name]
        gi = girl_ids.get(name)

        def eval_vec3(cn_id, default):
            axes = cn_axes.get(cn_id, {})
            if not axes:
                return None, None
            sample_curve = curves[next(iter(axes.values()))]
            kt = next(c[1][0] for c in sample_curve[2] if c[0] == "KeyTime")
            t_arr = (kt - kt[0]).astype(np.float64) / FBX_TIME_UNIT
            cols = []
            for idx, ax in enumerate(("d|X", "d|Y", "d|Z")):
                cid = axes.get(ax)
                if cid is not None:
                    c_node = curves[cid]
                    c_kt = (next(c[1][0] for c in c_node[2] if c[0] == "KeyTime") - kt[0]).astype(np.float64) / FBX_TIME_UNIT
                    c_vals = next(c[1][0] for c in c_node[2] if c[0] == "KeyValueFloat").astype(np.float64)
                    cols.append(np.interp(t_arr, c_kt, c_vals))
                else:
                    cols.append(np.full(len(t_arr), float(default[idx]), dtype=np.float64))
            return t_arr, np.column_stack(cols)

        if is_hips and "Lcl Translation" in props:
            times, trans_vals = eval_vec3(props["Lcl Translation"], lcl_trans_def)
            if times is not None:
                duration = max(duration, float(times[-1]))
                boy_pos = RX_NEG90.apply(trans_vals)
                # Anchor Hips horizontally in place on frame midpoint so runner never drifts laterally
                boy_node_trans = np.array(boy_gltf["nodes"][bi]["translation"], dtype=np.float64)
                boy_pos[:, 0] -= float(np.mean(boy_pos[:, 0]))
                boy_pos[:, 1] -= float(np.mean(boy_pos[:, 1]))
                boy_pos[:, 1] += boy_node_trans[1]
                times_list = [round(float(x), 6) for x in times]
                boy_tracks.append({
                    "name": f"{track_bone}.position",
                    "type": "vector",
                    "times": times_list,
                    "values": [round(float(v), 5) for v in boy_pos.reshape(-1)],
                })
                if gi is not None:
                    girl_node_trans = np.array(girl_gltf["nodes"][gi]["translation"], dtype=np.float64)
                    girl_pos = (gf[gi][0].inv() * bf[bi][0]).apply(boy_pos - boy_node_trans) * 1.18 + girl_node_trans
                    girl_pos[:, 0] = girl_node_trans[0]
                    girl_pos[:, 1] = girl_node_trans[1]
                    girl_tracks.append({
                        "name": f"{track_bone}.position",
                        "type": "vector",
                        "times": times_list,
                        "values": [round(float(v), 5) for v in girl_pos.reshape(-1)],
                    })

        if "Lcl Rotation" in props:
            times, rot_vals = eval_vec3(props["Lcl Rotation"], lcl_rot_def)
            if times is not None:
                duration = max(duration, float(times[-1]))
                lcl_rots = R.from_euler("xyz", rot_vals, degrees=True)
                boy_rot = (RX_NEG90 * pre_rot * lcl_rots) if is_hips else (pre_rot * lcl_rots)
                boy_q = boy_rot.as_quat()
                # Ensure shortest-path quaternion continuity across frames
                for k in range(1, len(boy_q)):
                    if np.dot(boy_q[k - 1], boy_q[k]) < 0:
                        boy_q[k] = -boy_q[k]
                times_list = [round(float(x), 6) for x in times]
                boy_tracks.append({
                    "name": f"{track_bone}.quaternion",
                    "type": "quaternion",
                    "times": times_list,
                    "values": [round(float(v), 6) for v in boy_q.reshape(-1)],
                })
                if gi is not None:
                    girl_rot = gf[gi][0].inv() * bf[bi][0] * boy_rot * bf[bi][1].inv() * gf[gi][1]
                    girl_q = girl_rot.as_quat()
                    for k in range(1, len(girl_q)):
                        if np.dot(girl_q[k - 1], girl_q[k]) < 0:
                            girl_q[k] = -girl_q[k]
                    girl_tracks.append({
                        "name": f"{track_bone}.quaternion",
                        "type": "quaternion",
                        "times": times_list,
                        "values": [round(float(v), 6) for v in girl_q.reshape(-1)],
                    })

    payload = {
        "name": "InjuredRun",
        "duration": round(duration, 6),
        "male": boy_tracks,
        "female": girl_tracks,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {out_path} ({len(boy_tracks)} male tracks, {len(girl_tracks)} female tracks, duration={duration:.4f}s)")


if __name__ == "__main__":
    fbx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FBX
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    convert_injured_run(fbx, out)
