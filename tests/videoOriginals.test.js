import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  findVideoOriginal,
  videoAssetPath,
  videoOriginals
} from "../src/data/videoOriginals.js";

test("video catalog exposes five sequential Form / Field Originals", () => {
  assert.equal(videoOriginals.length, 5);
  assert.deepEqual(videoOriginals.map(original => original.number), [1, 2, 3, 4, 5]);
  assert.equal(new Set(videoOriginals.map(original => original.id)).size, videoOriginals.length);
  assert.equal(findVideoOriginal("pelagion-original-004").labForm, "pelagion");
  assert.equal(findVideoOriginal("missing").id, "chronophore-original-005");
});

test("every catalog entry resolves to its published MP4 and cover", () => {
  for (const original of videoOriginals) {
    const video = new URL(`../public/${videoAssetPath(original, `${original.id}.mp4`)}`, import.meta.url);
    const cover = new URL(`../public/${videoAssetPath(original, "cover.png")}`, import.meta.url);
    assert.ok(statSync(video).size > 1_000_000);
    assert.ok(statSync(cover).size > 100_000);
  }
});

test("SPA video player carries the complete inline loop contract", () => {
  const source = readFileSync(new URL("../src/views/VideoView.vue", import.meta.url), "utf8");
  const router = readFileSync(new URL("../src/router.js", import.meta.url), "utf8");
  const header = readFileSync(new URL("../src/components/AppHeader.vue", import.meta.url), "utf8");

  for (const attribute of ["autoplay", "muted", "loop", "playsinline", "controls"]) {
    assert.match(source, new RegExp(`\\b${attribute}\\b`));
  }
  assert.match(source, /download=/);
  assert.match(router, /\/video\/:id\?/);
  assert.match(header, /to: "\/video"/);
});
