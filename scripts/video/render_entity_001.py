#!/usr/bin/env python3
"""Render the Sketch 36 pilot to a social-ready MP4 and cover image."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from threading import Thread

from playwright.sync_api import sync_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCENE_PATH = Path("scripts/video/entity-001.html")
DEFAULT_OUTPUT = PROJECT_ROOT / "public/videos/entity-001"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        return


def command(*parts):
    subprocess.run(parts, check=True)


def render(output_dir: Path, keep_webm: bool):
    output_dir.mkdir(parents=True, exist_ok=True)
    temporary_dir = Path(tempfile.mkdtemp(prefix="form-field-video-"))
    webm_path = temporary_dir / "entity-001.webm"
    mp4_path = output_dir / "entity-001.mp4"
    cover_path = output_dir / "cover.png"

    handler = partial(QuietHandler, directory=PROJECT_ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        with sync_playwright() as playwright:
            chrome_path = Path(os.environ.get(
                "FORM_FIELD_CHROME",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            ))
            launch_options = {"headless": True}
            if chrome_path.exists():
                launch_options["executable_path"] = str(chrome_path)
            browser = playwright.chromium.launch(**launch_options)
            page = browser.new_page(viewport={"width": 1080, "height": 1920})
            page.goto(
                f"http://127.0.0.1:{server.server_port}/{SCENE_PATH}?record=1",
                wait_until="networkidle",
            )
            page.wait_for_function("window.__videoReady === true", timeout=30_000)
            metadata = page.evaluate("window.__videoMetadata")
            metadata["webmBytes"] = page.evaluate("window.__videoBlobSize")
            with page.expect_download() as download_info:
                page.locator("#download").click()
            download_info.value.save_as(webm_path)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    command(
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(webm_path),
        "-an",
        "-t", "15",
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "20",
        "-profile:v", "high",
        "-level", "4.2",
        "-movflags", "+faststart",
        str(mp4_path),
    )
    command(
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", "13.1",
        "-i", str(mp4_path),
        "-frames:v", "1",
        str(cover_path),
    )

    probe = subprocess.run(
        (
            "ffprobe", "-v", "error",
            "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size",
            "-of", "json",
            str(mp4_path),
        ),
        check=True,
        capture_output=True,
        text=True,
    )
    metadata["output"] = json.loads(probe.stdout)

    if keep_webm:
        shutil.copy2(webm_path, output_dir / "entity-001.webm")
    shutil.rmtree(temporary_dir)
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


def main():
    parser = ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--keep-webm", action="store_true")
    arguments = parser.parse_args()
    render(arguments.output_dir.resolve(), arguments.keep_webm)


if __name__ == "__main__":
    main()
