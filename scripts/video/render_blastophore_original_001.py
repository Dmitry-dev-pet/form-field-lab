#!/usr/bin/env python3
"""Render Form / Field Original 001: Blastophore."""

from argparse import ArgumentParser
from pathlib import Path

from render_video import PROJECT_ROOT, render


def main():
    parser = ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "public/videos/blastophore-original-001",
    )
    parser.add_argument("--keep-webm", action="store_true")
    arguments = parser.parse_args()
    render(
        scene_path=Path("scripts/video/blastophore-original-001.html"),
        output_dir=arguments.output_dir.resolve(),
        output_name="blastophore-original-001",
        cover_time=7.5,
        keep_webm=arguments.keep_webm,
    )


if __name__ == "__main__":
    main()
