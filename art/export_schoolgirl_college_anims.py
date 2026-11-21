"""Retarget the exact College Blue-Dress Woman (college-woman.glb) animation set onto casual-schoolgirl.glb.

Usage:
    python art/export_schoolgirl_college_anims.py

Writes dist/assets/female-college-anims.json containing all 9 animations
(Idle, Run, Jump, Slide, Roll, Stumble, HeadHit, Fall, ShoulderSweep)
cleanly retargeted from college-woman.glb onto casual-schoolgirl.glb's Mixamo skeleton.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_college_actors import (
    ASSETS,
    MIXAMO_TO_CC,
    decode_glb_full,
    read_accessor,
)
from export_injured_run import sanitize_bone

GIRL_GLB = ASSETS / "casual-schoolgirl.glb"
WOMAN_GLB = ASSETS / "college-woman.glb"
OUT_JSON = ASSETS / "female-college-anims.json"


def solve_fk(nodes: list[dict], local_r: list[R], local_t: list[np.ndarray], local_s: list[np.ndarray] | None = None):
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    wr = [None] * len(nodes)
    wp = [None] * len(nodes)

    if local_s is None:
        local_s = [np.array(n.get("scale", [1.0, 1.0, 1.0]), dtype=np.float64) for n in nodes]

    def solve_full(i: int):
        if wr[i] is None:
            if i in parents:
                pr, pp, ps = solve_full(parents[i])
                wr[i] = pr * local_r[i]
                wp[i] = pp + pr.apply(ps * local_t[i])
                ws = ps * local_s[i]
            else:
                wr[i] = local_r[i]
                wp[i] = local_t[i].copy()
                ws = local_s[i].copy()
        else:
            ws = local_s[i].copy()
            cur = parents.get(i)
            while cur is not None:
                ws = ws * local_s[cur]
                cur = parents.get(cur)
        return wr[i], wp[i], ws

    for i in range(len(nodes)):
        solve_full(i)
    return wr, wp


def extract_gltf_clip_fk(glb_path: Path, clip_name: str):
    gltf, buf = decode_glb_full(glb_path)
    nodes = gltf["nodes"]
    name_to_idx = {n.get("name", ""): i for i, n in enumerate(nodes)}

    rest_t = [np.array(n.get("translation", [0.0, 0.0, 0.0]), dtype=np.float64) for n in nodes]
    rest_r = [R.from_quat(n.get("rotation", [0.0, 0.0, 0.0, 1.0])) for n in nodes]
    rest_s = [np.array(n.get("scale", [1.0, 1.0, 1.0]), dtype=np.float64) for n in nodes]

    rest_wr, rest_wp = solve_fk(nodes, rest_r, rest_t, rest_s)

    anim = next((a for a in gltf.get("animations", []) if a["name"] == clip_name), None)
    if anim is None:
        raise ValueError(f"Clip '{clip_name}' not found in {glb_path.name}")

    chan_data = {}
    all_times = set()
    for ch in anim["channels"]:
        nid = ch["target"].get("node")
        path = ch["target"].get("path")
        if nid is None or path not in ("rotation", "translation"):
            continue
        sampler = anim["samplers"][ch["sampler"]]
        t = read_accessor(gltf, buf, sampler["input"]).ravel()
        v = read_accessor(gltf, buf, sampler["output"])
        chan_data[(nid, path)] = (t, v)
        all_times.update(np.round(t, 6).tolist())

    times = np.array(sorted(all_times), dtype=np.float64)
    duration = float(times[-1]) if len(times) > 0 else 0.0

    eval_r = {}
    eval_t = {}
    for (nid, path), (ct, cv) in chan_data.items():
        if path == "translation":
            cols = [np.interp(times, ct, cv[:, k]) for k in range(3)]
            eval_t[nid] = np.column_stack(cols)
        elif path == "rotation":
            q = cv.copy()
            for k in range(1, len(q)):
                if np.dot(q[k - 1], q[k]) < 0:
                    q[k] = -q[k]
            cols = [np.interp(times, ct, q[:, k]) for k in range(4)]
            qm = np.column_stack(cols)
            qm /= np.linalg.norm(qm, axis=1, keepdims=True)
            eval_r[nid] = R.from_quat(qm)

    n_frames = len(times)
    all_anim_wr = [[] for _ in range(len(nodes))]
    all_anim_wp = [[] for _ in range(len(nodes))]

    for fi in range(n_frames):
        lr = list(rest_r)
        lt = list(rest_t)
        for nid, rots in eval_r.items():
            lr[nid] = rots[fi]
        for nid, ts in eval_t.items():
            lt[nid] = ts[fi]
        f_wr, f_wp = solve_fk(nodes, lr, lt, rest_s)
        for nid in range(len(nodes)):
            all_anim_wr[nid].append(f_wr[nid])
            all_anim_wp[nid].append(f_wp[nid])

    return {
        "name": clip_name,
        "times": times,
        "duration": duration,
        "nodes": nodes,
        "name_to_idx": name_to_idx,
        "rest_wr": rest_wr,
        "rest_wp": rest_wp,
        "all_anim_wr": [R.concatenate(rots) for rots in all_anim_wr],
        "all_anim_wp": [np.array(pos) for pos in all_anim_wp],
    }


def retarget_woman_clip_to_girl(
    woman_clip: dict,
    girl_nodes: list[dict],
    girl_name_to_idx: dict[str, int],
    girl_parents: dict[int, int],
    girl_order: list[int],
    girl_rest_t: list[np.ndarray],
    girl_rest_r: list[R],
    girl_rest_s: list[np.ndarray],
    girl_rest_wr: list[R],
    girl_rest_wp: list[np.ndarray],
    bone_map: dict[str, str],
    is_idle: bool = False,
) -> dict:
    times = woman_clip["times"]
    n_frames = len(times)

    girl_target_wr = {}
    bone_mapping = {}
    for mix_name, cc_name in bone_map.items():
        if mix_name in girl_name_to_idx and cc_name in woman_clip["name_to_idx"]:
            girl_nid = girl_name_to_idx[mix_name]
            woman_nid = woman_clip["name_to_idx"][cc_name]
            bone_mapping[girl_nid] = (mix_name, cc_name, woman_nid)

            delta_w = woman_clip["all_anim_wr"][woman_nid] * woman_clip["rest_wr"][woman_nid].inv()
            girl_target_wr[girl_nid] = delta_w * girl_rest_wr[girl_nid]

    # Propagate unmapped bones
    for nid in girl_order:
        if nid not in girl_target_wr:
            pa = girl_parents.get(nid)
            if pa in girl_target_wr:
                girl_target_wr[nid] = girl_target_wr[pa] * girl_rest_r[nid]
            else:
                girl_target_wr[nid] = R.concatenate([girl_rest_wr[nid]] * n_frames)

    # Solve local rotations for target bones: local_r = wr[pa].inv() * wr[nid]
    rot_tracks = {}
    for nid in bone_mapping:
        pa = girl_parents.get(nid)
        if pa is not None:
            local_r = girl_target_wr[pa].inv() * girl_target_wr[nid]
        else:
            local_r = girl_target_wr[nid]
        rot_tracks[nid] = local_r.as_quat()

    # Hips translation
    girl_hips_nid = girl_name_to_idx["mixamorig:Hips"]
    woman_hips_nid = woman_clip["name_to_idx"]["CC_Base_Hip"]

    woman_hips_anim_p = woman_clip["all_anim_wp"][woman_hips_nid]
    woman_hips_rest_p = woman_clip["rest_wp"][woman_hips_nid]
    girl_hips_rest_p = girl_rest_wp[girl_hips_nid]

    scale_y = (girl_hips_rest_p[1] / woman_hips_rest_p[1]) if woman_hips_rest_p[1] > 0.1 else 1.0
    delta_p = (woman_hips_anim_p - woman_hips_rest_p) * scale_y

    if is_idle:
        delta_p[:, 0] *= 0.35
        delta_p[:, 2] *= 0.35

    pa = girl_parents.get(girl_hips_nid)
    pa_wr = girl_rest_wr[pa] if pa is not None else R.identity()
    pa_scale = girl_rest_s[pa] if pa is not None else np.ones(3)
    girl_hip_local_pos = girl_rest_t[girl_hips_nid] + pa_wr.inv().apply(delta_p) / pa_scale

    times_list = [round(float(x), 5) for x in times]
    hips_bone_name = girl_nodes[girl_hips_nid]["name"]
    tracks = [
        {
            "name": f"{hips_bone_name}.position",
            "type": "vector",
            "times": times_list,
            "values": [round(float(v), 5) for v in girl_hip_local_pos.reshape(-1)],
        }
    ]
    for nid, quats in rot_tracks.items():
        b_name = girl_nodes[nid]["name"]
        tracks.append({
            "name": f"{b_name}.quaternion",
            "type": "quaternion",
            "times": times_list,
            "values": [round(float(v), 6) for v in quats.reshape(-1)],
        })

    return {
        "duration": round(float(woman_clip["duration"]), 5),
        "tracks": tracks,
    }


def main():
    print(f"Loading {GIRL_GLB.name} and {WOMAN_GLB.name}...")
    girl_gltf, _ = decode_glb_full(GIRL_GLB)
    girl_nodes = girl_gltf["nodes"]
    girl_name_to_idx = {n.get("name", ""): i for i, n in enumerate(girl_nodes)}
    girl_parents = {c: i for i, n in enumerate(girl_nodes) for c in n.get("children", [])}

    girl_rest_t = [np.array(n.get("translation", [0.0, 0.0, 0.0]), dtype=np.float64) for n in girl_nodes]
    girl_rest_r = [R.from_quat(n.get("rotation", [0.0, 0.0, 0.0, 1.0])) for n in girl_nodes]
    girl_rest_s = [np.array(n.get("scale", [1.0, 1.0, 1.0]), dtype=np.float64) for n in girl_nodes]

    girl_rest_wr, girl_rest_wp = solve_fk(girl_nodes, girl_rest_r, girl_rest_t, girl_rest_s)

    girl_order = []
    def visit(i: int):
        girl_order.append(i)
        for c in girl_nodes[i].get("children", []):
            visit(c)
    for r in [i for i in range(len(girl_nodes)) if i not in girl_parents]:
        visit(r)

    clip_names = ["Idle", "Run", "Jump", "Slide", "Roll", "Stumble", "HeadHit", "Fall", "ShoulderSweep"]
    payload = {"clips": {}}

    for nm in clip_names:
        print(f"Extracting '{nm}' from {WOMAN_GLB.name}...")
        woman_clip = extract_gltf_clip_fk(WOMAN_GLB, nm)
        retargeted = retarget_woman_clip_to_girl(
            woman_clip,
            girl_nodes,
            girl_name_to_idx,
            girl_parents,
            girl_order,
            girl_rest_t,
            girl_rest_r,
            girl_rest_s,
            girl_rest_wr,
            girl_rest_wp,
            MIXAMO_TO_CC,
            is_idle=(nm == "Idle"),
        )
        payload["clips"][nm] = retargeted
        print(f"  -> Retargeted {nm:14s}: {len(retargeted['tracks']):2d} tracks, duration={retargeted['duration']:.3f}s")

    OUT_JSON.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {OUT_JSON.name}: {OUT_JSON.stat().st_size / 1024:.1f} KB ({len(payload['clips'])} clips)")


if __name__ == "__main__":
    main()
