#!/usr/bin/env python3
"""Render the Sketch 36 small-code director cut."""

from argparse import ArgumentParser
from pathlib import Path

from render_video import PROJECT_ROOT, render


def main():
    parser = ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "public/videos/sketch-36-small-code",
    )
    parser.add_argument("--keep-webm", action="store_true")
    arguments = parser.parse_args()
    render(
        scene_path=Path("scripts/video/sketch-36-small-code.html"),
        output_dir=arguments.output_dir.resolve(),
        output_name="sketch-36-small-code",
        cover_time=6.4,
        keep_webm=arguments.keep_webm,
    )


if __name__ == "__main__":
    main()
