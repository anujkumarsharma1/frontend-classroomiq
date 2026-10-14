# ClassroomIQ v3 — Architecture (multi-camera IoT monitoring)

Status: **design + frontend prototype**. The frontend on branch `v3` runs on a simulated event stream ("Demo data"). No edge code, MQTT broker, or v3 backend API exists yet. Any number below without a source is labelled *estimate*.

## 1. Concept

Two modes on the same pipeline:

| Mode | What is measured |
|---|---|
| **Classroom** (fixed room cameras) | face-based attendance on entry (with time), late / early-exit flags vs timetable, blink rate, attention toward the board, exit time, zone/seat occupancy, unknown-face alerts |
| **Office** | time at desk looking at screen ("working") vs at desk not looking vs roaming / away, tracked across cameras |

This replaces the old "student webcam in an online class" design.

## 2. Edge vs server split

```
RTSP IP camera(s) ──► Edge device (Raspberry Pi 5 + Hailo-8L / Jetson Orin Nano)
                       decode → detect → track → align → embed → landmarks
                       → per-track state machines → JSON events
                       ──MQTT (TLS, QoS 1)──► Broker (Mosquitto / EMQX)
                                               │
                                     Ingest service (Node, existing backend)
                                     → MongoDB (events, sessions)  + vector index (embeddings)
                                     → socket.io ──► Dashboard (this repo)
```

**Edge does all video work.** Raw frames never leave the room; only events and (at enrollment/matching) 512-d embeddings do. Reasons: bandwidth (an RTSP 1080p stream is several Mbit/s, *estimate*), privacy (no video storage), and latency.

**Server does:** identity matching against the enrolled gallery (so the gallery isn't copied to every device — alternative: push a signed, encrypted gallery to edges for offline matching), timetable joins (late/early), aggregation (heatmaps, weekly trend), alerts, CSV export, auth, retention jobs.

Device management: each edge has a device ID + client certificate; it publishes `ciq/{site}/{room}/{device}/heartbeat` every 10 s with FPS, temperature, camera status. Missing 3 heartbeats → `offline`.

## 3. Event schema (MQTT payload, JSON)

Topic: `ciq/{siteId}/{roomId}/{deviceId}/events`

```json
{
  "v": 1,
  "id": "evt_01J9...",            // ULID, edge-generated, used for dedupe (QoS 1 can redeliver)
  "ts": "2026-10-14T09:02:11.420Z",
  "site": "main-campus", "room": "R-101", "device": "edge-101a", "camera": "cam-1",
  "type": "person.entered",
  "track": "t-8812",               // edge-local track id
  "person": "P-0007",              // null if unknown
  "match": { "score": 0.62, "threshold": 0.45 },
  "data": {}
}
```

| `type` | `data` |
|---|---|
| `person.entered` / `person.exited` | `{ "line": "door-1", "direction": "in" }` |
| `face.unknown` | `{ "bestScore": 0.31, "zone": "door" }` — no image |
| `attention.sample` (every 10 s per track) | `{ "onTargetPct": 0.78, "yaw": -8.1, "pitch": 4.0, "target": "board" }` |
| `blink.sample` (every 60 s) | `{ "blinks": 14, "windowS": 60, "validFaceS": 52 }` |
| `zone.occupancy` (every 30 s) | `{ "zones": { "seat-A1": 1, "seat-A2": 0 } }` |
| `desk.state` | `{ "desk": "D-12", "state": "working" | "at_desk" | "away" }` |
| `reid.handoff` | `{ "fromCamera": "cam-2", "toCamera": "cam-4", "score": 0.71 }` |
| `device.heartbeat` | `{ "fps": 14.8, "tempC": 61, "cameras": {"cam-1": "ok"} }` |

The dashboard consumes exactly these shapes (see `src/data/`).

## 4. Algorithms per feature

| Feature | Algorithm | Library / model |
|---|---|---|
| Face detection | single-stage detector on each frame (or every N frames + tracker in between) | **SCRFD** (InsightFace) or **YuNet** (OpenCV `FaceDetectorYN`) on Pi; RetinaFace on Jetson |
| Face recognition | 5-point alignment → **ArcFace** 512-d embedding → cosine similarity vs enrolled gallery, accept if best ≥ threshold *and* margin over 2nd best | InsightFace `buffalo_l` (ArcFace R50) / ONNX Runtime |
| Anti-spoofing | passive liveness on enrollment and first match | Silent-Face-Anti-Spoofing (MiniFASNet) — note limits below |
| Multi-person tracking | detection → track association, one identity voted per track | **ByteTrack** (default) or DeepSORT |
| Entry / exit | virtual line or door-zone crossing + dwell/absence timeout + debounce | OpenCV geometry / `supervision` LineZone |
| Late / early-exit flags | join first entry & last exit to timetable slot with grace period | server-side (Node) |
| Blink rate | Eye Aspect Ratio over landmarks, threshold + consecutive frames | **MediaPipe Face Mesh** (Face Landmarker) |
| Attention / gaze | head pose via `solvePnP` from 6 landmarks → ray vs board/laptop ROI | OpenCV `solvePnP`, MediaPipe |
| Occupancy heatmap | per-zone/seat polygon, track foot-point-in-polygon, 30 s bins | OpenCV `pointPolygonTest` |
| Office desk time | desk-zone occupancy + head pose toward screen | same as above |
| Cross-camera roaming | person re-identification embeddings | **OSNet** (torchreid), cosine match |
| Time spans | per-person state machine with hysteresis | edge Python, server aggregation |
| Unknown-face alert | best gallery score < threshold for k consecutive frames on a stable track | ArcFace + server alert rule |
| Weekly attention trend | per lecture mean of `onTargetPct`, grouped by ISO week | MongoDB aggregation |
| Attendance CSV | presence intervals joined with timetable → RFC 4180 CSV | server (frontend in demo) |

### 4.1 Face detection
SCRFD-500M/2.5G or YuNet at 640 px input. Run detection every 2–3 frames and let the tracker fill gaps (saves compute on a Pi). Discard faces below ~40 px inter-ocular-ish size (*estimate*) — they are too small for reliable recognition.

### 4.2 Recognition + enrollment
- **Enrollment:** with explicit consent recorded, capture 5–10 frames (frontal, ±20° yaw), run liveness, compute ArcFace embeddings, L2-normalise, store the **mean embedding + the individual ones**. No photo is kept after enrollment (delete the frames).
- **Matching:** `score = cos(e, g_i)`. Accept the top identity if `score ≥ T` and `score − second ≥ m`. T must be calibrated on your own cameras (start ≈0.4–0.5 for buffalo_l, *estimate*), m ≈ 0.05 (*estimate*).
- **Per-track voting:** a track is assigned an identity only after ≥3 agreeing frames; that identity sticks to the track (one identity per track), which suppresses flicker.
- **Anti-spoofing:** passive liveness models reduce printed-photo/screen attacks but are not reliable against good replays or masks; for attendance this is a deterrent, not a guarantee. Don't use the system for anything high-stakes on that basis.

### 4.3 Tracking
ByteTrack associates high- and low-confidence detections with a Kalman motion model; cheap and good for fixed cameras. DeepSORT adds an appearance embedding (useful when people cross). Track lost > `T_lost` (e.g. 3 s) → closed.

### 4.4 Entry / exit
- Draw a line (or polygon) at the door per camera. Crossing direction = sign change of the cross product of the track foot-point relative to the line.
- **Debounce:** require the point to stay on the new side for ≥1 s, and ignore re-crossings within 5 s (people pause in doorways).
- **Absence timeout:** if an identified person isn't seen by any camera in the room for `T_absent` (e.g. 120 s, configurable), emit `person.exited` with the last-seen time — covers missed door crossings.
- Rooms without a door view: presence = seen in room, exit = absence timeout.

### 4.5 Late and early-exit flags
Server joins each person's first `person.entered` and last `person.exited` in a slot to the room timetable `{room, start, end, course}`:
- `late` if `firstEntry > start + grace` (grace configurable per room, default 5 min).
- `early_exit` if `lastExit < end − grace` and no later re-entry.
- `absent` if no presence interval overlaps the slot.
Re-entries are merged as intervals; total presence minutes are also reported.

### 4.6 Blink rate
- MediaPipe Face Mesh landmarks; per eye **EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2‖p1−p4‖)** (Soukupová & Čech, *Real-Time Eye Blink Detection using Facial Landmarks*, CVWW 2016).
- Blink = EAR below threshold (≈0.2, calibrate per camera, *estimate*) for 2–3 consecutive frames, then back above.
- **Blinks/min = blinks / valid-face-seconds × 60**, computed only over frames where both eyes are visible and yaw < 30°. Needs ≥ ~15 fps and enough eye pixels — a ceiling camera at the back of a classroom often **cannot** do this; front-row or desk cameras can. Report "insufficient data" instead of a number when valid time is low.

### 4.7 Attention / gaze
- 2D landmarks (nose tip, chin, eye corners, mouth corners) + generic 3D face model → `cv2.solvePnP` → rotation → yaw/pitch.
- Cast the head-direction ray in the room's calibrated frame; **on target** if it falls inside the board ROI (classroom) or screen ROI (office) within a tolerance cone.
- `attention % = on-target seconds / visible seconds`, smoothed over 10 s windows.
- This is **head pose, not eye gaze, and not "attention" in a cognitive sense**. Writing notes looks "off-board". Present it as "facing the board %", never as a grade.

### 4.8 Zone / seat occupancy heatmap
Per camera, polygons for zones or seats in image coordinates. Every frame each track's foot point (or face centre for seated people) is tested with `pointPolygonTest`; per 30 s bin a zone is occupied if occupied > 50% of the bin. Server stores `zone × time-bin` counts; the dashboard renders a zone × hour heatmap.

### 4.9 Unknown-face alert
On a stable track (≥ k = 5 frames, face size OK, liveness OK), if the best gallery score < T for every enrolled person, emit one `face.unknown` per track (rate-limited, e.g. one per track per 10 min). **No snapshot is stored by default**; the dashboard shows a placeholder icon. If a site needs evidence images that's a separate, consented, short-retention policy decision.

### 4.10 Office mode
- **Desk occupancy:** desk polygon; person at desk if a track's point is in it.
- **Working:** at desk AND head pose toward the screen ROI.
- **Roaming / away:** not at their own desk. Cross-camera continuity via **OSNet** re-ID embeddings (body appearance) matched at camera hand-off with cosine similarity + time/topology gating (which cameras are adjacent). Re-ID is brittle across lighting and clothing changes; keep it to same-day.

### 4.11 Time spans: state machine with hysteresis
Per person: `ABSENT → PRESENT{WORKING | AT_DESK | AWAY}`. A transition happens only when the new state is observed continuously for `t_enter` (e.g. 5 s) and the old one is gone for `t_exit` (e.g. 20 s) — different thresholds give hysteresis so a head turn doesn't split a "working" span. Spans `{state, start, end}` are emitted on each transition; totals are sums of spans, clipped to the timetable slot.

### 4.12 Weekly attention trend and CSV
Server aggregation: `group by course, isoWeek(ts)` → mean `onTargetPct` weighted by visible seconds; lectures with < X minutes of valid data are excluded. CSV columns: `date, room, course, person_id, name, first_entry, last_exit, minutes_present, status(on_time|late|early_exit|absent), attention_pct`.

## 5. Realistic accuracy limits
- ArcFace reports 99.83% on LFW (Deng et al., *ArcFace*, CVPR 2019). LFW is frontal, well-lit web photos; overhead classroom CCTV at distance will be **substantially worse** — measure on your own data before claiming any number.
- Expect failures with masks, strong backlight at windows, faces < ~40 px, occlusion by other students, and identical twins.
- Head pose ≠ attention (see 4.7). Blink rate at classroom distance is often unmeasurable (4.6).
- Re-ID across cameras confuses people in similar clothes (uniforms!) — in schools, rely on face identity, use re-ID only as a hint.
- Demographic bias in face recognition is documented (NIST FRVT demographic effects report, NISTIR 8280, 2019). Provide a manual correction path for every attendance record.

## 6. Privacy and legal (India)
Not legal advice; get it reviewed.
- **DPDP Act 2023**: processing personal data needs a lawful basis — consent (s.6) with a clear notice (s.5) of what is collected and why. Facial embeddings and behavioural metrics are personal data.
- **Children (s.9):** under-18 students need **verifiable parental consent**, and the Act prohibits tracking/behavioural monitoring of children (s.9(3)) unless exempted. Attention/blink tracking of school students is therefore high-risk; for schools consider attendance-only, and run attention features only for adults (college/office) with consent.
- **Purpose limitation & erasure (s.8(7)):** delete data when the purpose is served or consent is withdrawn. Proposed retention: raw events 30 days, daily aggregates 1 academic year, embeddings until un-enrollment (*policy proposal*).
- **Store embeddings, not images.** Encrypt embeddings at rest; embeddings are still biometric-derived and must be treated as sensitive.
- Signage at every camera, opt-out path (manual attendance), access logs, role-based access, breach notification process. Check the DPDP Rules (notified Nov 2025, phased commencement) for operational deadlines.
- Offices: employee monitoring needs a notice + policy; "time looking at laptop" must not be the sole basis for HR action.

## 7. Hardware cost per room (*estimates*, Indian retail, Oct 2026 — verify before buying)
| Item | Estimate |
|---|---|
| 1080p PoE RTSP IP camera (e.g. CP Plus / Hikvision class) | ₹2,500–5,000 |
| Raspberry Pi 5 (8 GB) + case/PSU + SD | ₹9,000–11,000 |
| Hailo-8L AI Kit for Pi 5 (optional, for >10 fps) | ₹7,000–9,000 |
| *or* Jetson Orin Nano Super dev kit (handles 2–4 cameras) | ₹25,000–30,000 |
| PoE switch / injector, cabling | ₹1,500–4,000 |
| Server: one small VM (broker + backend + DB) for a pilot | ₹1,000–3,000 / month |

Pilot of 1 room ≈ ₹15–25k; office floor with 4 cameras on one Jetson ≈ ₹45–60k (*estimates*).

## 8. Solo-buildable MVP
1. **One room, one camera, one Pi 5 (or a laptop + USB webcam to start).** Python: OpenCV RTSP → YuNet → ByteTrack → InsightFace ArcFace → door line → MQTT (`paho-mqtt`) to Mosquitto.
2. Enrollment CLI + dashboard page (consent checkbox, embeddings only).
3. Backend: MQTT subscriber in the existing Express app → Mongo `events` + `presence_intervals` → socket.io to the dashboard; timetable CRUD; late/early rule; CSV export endpoint.
4. Swap the dashboard data source from demo to API (`VITE_DATA_SOURCE=api`).
5. Only then: head-pose attention, occupancy zones, unknown-face alerts.
6. Later / stretch: blink rate (needs close cameras), office mode, OSNet re-ID, Jetson multi-camera.

Out of scope for MVP: anti-spoofing hardening, multi-site, re-ID.

## 9. Frontend (branch v3)
- `src/data/schema.js` — event types above.
- `src/data/mockStream.js` — simulated MQTT stream (people entering/leaving, samples, heartbeats, unknown faces).
- `src/data/source.js` — `demo` vs `api` data source behind one interface; `api` is a stub to be wired to socket.io.
- Every screen shows a **Demo data** badge while the demo source is active.
