#!/usr/bin/env python3
"""Frame-indexed, auditable renderer for Form / Field videos."""

from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import version as package_version
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
from threading import Thread

from playwright.sync_api import sync_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RENDERER_VERSION = "form-field-frame-indexed-v1"
PINNED_PLAYWRIGHT = "1.58.0"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        return


def file_sha256(path):
    digest = sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative_path(path):
    return Path(path).resolve().relative_to(PROJECT_ROOT).as_posix()


def command_version(command):
    process = subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )
    return process.stdout.splitlines()[0]


def encoding_recipe(fps, frame_count):
    return [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", str(fps),
        "-start_number", "0",
        "-i", "frame-%04d.png",
        "-an",
        "-frames:v", str(frame_count),
        "-vf", "format=yuv420p",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "20",
        "-profile:v", "high",
        "-level", "4.2",
        "-g", "300",
        "-keyint_min", "300",
        "-sc_threshold", "0",
        "-threads", "1",
        "-x264-params", "threads=1:lookahead_threads=1:sliced_threads=0:sync-lookahead=0",
        "-map_metadata", "-1",
        "-metadata", "creation_time=1970-01-01T00:00:00Z",
        "-fflags", "+bitexact",
        "-flags:v", "+bitexact",
        "-video_track_timescale", "30000",
        "-movflags", "+faststart+use_metadata_tags",
        "OUTPUT.mp4",
    ]


def encode_frames(frames_dir, mp4_path, fps, frame_count):
    recipe = encoding_recipe(fps, frame_count)
    actual = [
        str(frames_dir / "frame-%04d.png") if part == "frame-%04d.png"
        else str(mp4_path) if part == "OUTPUT.mp4"
        else part
        for part in recipe
    ]
    subprocess.run(actual, check=True)
    return recipe


def write_json(path, value):
    Path(path).write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def render_once(
    *,
    scene_path,
    output_dir,
    output_name,
    cover_time,
    input_paths=(),
    keep_frames=False,
):
    """Render one scene by explicitly requesting every frame exactly once."""
    scene_path = Path(scene_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    playwright_version = package_version("playwright")
    if playwright_version != PINNED_PLAYWRIGHT:
        raise RuntimeError(
            f"Deterministic renderer requires playwright=={PINNED_PLAYWRIGHT}; "
            f"found {playwright_version}."
        )

    temporary = tempfile.TemporaryDirectory(prefix="form-field-frames-")
    temporary_dir = Path(temporary.name)
    frames_dir = temporary_dir / "frames"
    frames_dir.mkdir()
    mp4_path = output_dir / f"{output_name}.mp4"
    cover_path = output_dir / "cover.png"
    provenance_path = output_dir / "provenance.json"

    handler = partial(QuietHandler, directory=PROJECT_ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()

    frame_hashes = []
    browser_version = None
    browser_source = "playwright-bundled-chromium"
    metadata = None

    try:
        with sync_playwright() as playwright:
            launch_options = {
                "headless": True,
                "args": ["--disable-gpu", "--font-render-hinting=none"],
            }
            chrome_override = os.environ.get("FORM_FIELD_CHROME")
            if chrome_override:
                launch_options["executable_path"] = chrome_override
                browser_source = "FORM_FIELD_CHROME override"

            browser = playwright.chromium.launch(**launch_options)
            browser_version = browser.version
            page = browser.new_page(
                viewport={"width": 1080, "height": 1920},
                device_scale_factor=1,
            )
            page.emulate_media(reduced_motion="reduce")
            page.goto(
                f"http://127.0.0.1:{server.server_port}/{scene_path.as_posix()}?deterministic=1",
                wait_until="networkidle",
            )
            page.evaluate("document.fonts.ready")
            page.wait_for_function("window.__videoReady === true", timeout=30_000)
            page.wait_for_function("typeof window.__renderFrame === 'function'", timeout=30_000)
            metadata = page.evaluate("window.__videoMetadata")
            fps = int(metadata["fps"])
            frame_count = int(metadata["frames"])
            film = page.locator("#film")

            for frame_index in range(frame_count):
                page.evaluate("frame => window.__renderFrame(frame)", frame_index)
                frame_path = frames_dir / f"frame-{frame_index:04d}.png"
                film.screenshot(
                    path=frame_path,
                    type="png",
                    animations="disabled",
                    caret="hide",
                    scale="css",
                )
                frame_hashes.append(file_sha256(frame_path))
                if frame_index == 0 or (frame_index + 1) % 30 == 0 or frame_index + 1 == frame_count:
                    print(f"deterministic frames {frame_index + 1}/{frame_count}", flush=True)

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    frame_set_digest = sha256()
    for frame_hash in frame_hashes:
        frame_set_digest.update(bytes.fromhex(frame_hash))

    fps = int(metadata["fps"])
    frame_count = int(metadata["frames"])
    recipe = encode_frames(frames_dir, mp4_path, fps, frame_count)
    cover_frame = min(frame_count - 1, max(0, round(float(cover_time) * fps)))
    shutil.copyfile(frames_dir / f"frame-{cover_frame:04d}.png", cover_path)

    unique_inputs = []
    seen_inputs = set()
    for path in (scene_path, *input_paths):
        resolved = Path(path).resolve()
        if resolved in seen_inputs:
            continue
        seen_inputs.add(resolved)
        unique_inputs.append({
            "path": relative_path(resolved),
            "sha256": file_sha256(resolved),
        })

    provenance = {
        "schemaVersion": 1,
        "renderer": RENDERER_VERSION,
        "determinism": {
            "frameIndexed": True,
            "realtimeCapture": False,
            "randomClockInputs": False,
            "byteIdentityRequiresPinnedToolchain": True,
        },
        "scene": relative_path(scene_path),
        "inputs": unique_inputs,
        "toolchain": {
            "playwright": playwright_version,
            "browser": browser_version,
            "browserSource": browser_source,
            "ffmpeg": command_version(("ffmpeg", "-version")),
            "platform": platform.platform(),
        },
        "video": {
            "width": int(metadata["width"]),
            "height": int(metadata["height"]),
            "fps": fps,
            "frames": frame_count,
            "durationSeconds": frame_count / fps,
            "coverFrame": cover_frame,
        },
        "encodingRecipe": recipe,
        "frames": {
            "setSha256": frame_set_digest.hexdigest(),
            "sha256": frame_hashes,
        },
        "outputs": {
            "video": {
                "file": mp4_path.name,
                "sha256": file_sha256(mp4_path),
                "bytes": mp4_path.stat().st_size,
            },
            "cover": {
                "file": cover_path.name,
                "sha256": file_sha256(cover_path),
                "bytes": cover_path.stat().st_size,
            },
        },
    }
    write_json(provenance_path, provenance)

    if keep_frames:
        saved_frames = output_dir / "frames"
        if saved_frames.exists():
            raise RuntimeError(f"Refusing to replace existing frame directory: {saved_frames}")
        shutil.copytree(frames_dir, saved_frames)

    result = {
        "videoSha256": provenance["outputs"]["video"]["sha256"],
        "coverSha256": provenance["outputs"]["cover"]["sha256"],
        "frameSetSha256": provenance["frames"]["setSha256"],
        "provenanceSha256": file_sha256(provenance_path),
        "metadata": metadata,
    }
    temporary.cleanup()
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    return result


def render(
    *,
    scene_path,
    output_dir,
    output_name,
    cover_time,
    input_paths=(),
    keep_frames=False,
    verify=False,
):
    """Render once, or prove repeatability with two isolated renders."""
    output_dir = Path(output_dir)
    if not verify:
        return render_once(
            scene_path=scene_path,
            output_dir=output_dir,
            output_name=output_name,
            cover_time=cover_time,
            input_paths=input_paths,
            keep_frames=keep_frames,
        )

    with tempfile.TemporaryDirectory(prefix="form-field-verify-") as verify_root:
        verify_root = Path(verify_root)
        first_dir = verify_root / "run-a"
        second_dir = verify_root / "run-b"
        first = render_once(
            scene_path=scene_path,
            output_dir=first_dir,
            output_name=output_name,
            cover_time=cover_time,
            input_paths=input_paths,
            keep_frames=False,
        )
        second = render_once(
            scene_path=scene_path,
            output_dir=second_dir,
            output_name=output_name,
            cover_time=cover_time,
            input_paths=input_paths,
            keep_frames=False,
        )

        compared = ("videoSha256", "coverSha256", "frameSetSha256", "provenanceSha256")
        mismatches = [key for key in compared if first[key] != second[key]]
        if mismatches:
            raise RuntimeError(f"Deterministic verification failed: {', '.join(mismatches)}")

        output_dir.mkdir(parents=True, exist_ok=True)
        for file_name in (f"{output_name}.mp4", "cover.png", "provenance.json"):
            shutil.copyfile(first_dir / file_name, output_dir / file_name)

    repeatability = {
        "schemaVersion": 1,
        "renderer": RENDERER_VERSION,
        "verified": True,
        "independentRuns": 2,
        "matching": {key: first[key] for key in compared},
    }
    write_json(output_dir / "repeatability.json", repeatability)
    print(json.dumps(repeatability, ensure_ascii=False, indent=2), flush=True)
    return first
