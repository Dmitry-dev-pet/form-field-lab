import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import { sketch36Original } from "../src/data/sketch36Genome.js";

const asset = name => new URL(`../public/videos/sketch-36-small-code/${name}`, import.meta.url);

test("Small Code packages the exact attributed Sketch 36 source without mutation", () => {
  const genome = readFileSync(asset("genome.js"), "utf8").trimEnd();
  const caption = readFileSync(asset("caption.txt"), "utf8");
  const manifest = JSON.parse(readFileSync(asset("manifest.json"), "utf8"));

  assert.equal(sketch36Original.code.length, 273);
  assert.equal(genome, sketch36Original.code);
  assert.equal(manifest.source.author, "@yuruyurau");
  assert.equal(manifest.source.characters, 273);
  assert.equal(manifest.mutation, null);
  assert.equal(manifest.presentation.externalToGenome, true);
  assert.equal(manifest.presentation.sourceMechanicsChanged, false);
  assert.match(caption, /@yuruyurau/);
  assert.match(caption, /form-field-lab\/#\/lab\/36/);
});

test("Small Code includes a social-ready MP4 and PNG cover", () => {
  const video = readFileSync(asset("sketch-36-small-code.mp4"));
  const cover = readFileSync(asset("cover.png"));

  assert.ok(statSync(asset("sketch-36-small-code.mp4")).size > 1_000_000);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
