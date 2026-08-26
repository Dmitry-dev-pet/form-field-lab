#!/usr/bin/env python3
"""Deterministically render Form / Field Original 004: Pelagion."""

from argparse import ArgumentParser
from pathlib import Path

from deterministic_video import PROJECT_ROOT, render


def main():
    parser = ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "public/videos/pelagion-original-004",
    )
    parser.add_argument("--keep-frames", action="store_true")
    parser.add_argument("--verify", action="store_true")
    arguments = parser.parse_args()
    render(
        scene_path=Path("scripts/video/pelagion-original-004.html"),
        output_dir=arguments.output_dir.resolve(),
        output_name="pelagion-original-004",
        cover_time=7.8,
        input_paths=(
            Path("src/data/pelagionGenome.js"),
            Path("public/fonts/form-field/BarlowCondensed-Regular.ttf"),
            Path("public/fonts/form-field/BarlowCondensed-SemiBold.ttf"),
            Path("public/fonts/form-field/CormorantGaramond-Italic-wght.ttf"),
            Path("public/fonts/form-field/IBMPlexMono-Regular.ttf"),
        ),
        keep_frames=arguments.keep_frames,
        verify=arguments.verify,
    )


if __name__ == "__main__":
    main()
