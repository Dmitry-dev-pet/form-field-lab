import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  BLASTOPHORE_GENOME,
  BLASTOPHORE_GENOME_CHARACTERS
} from "../src/data/blastophoreGenome.js";

const asset = name => new URL(`../public/videos/blastophore-original-001/${name}`, import.meta.url);

test("Original 001 packages the exact autonomous Blastophore root", () => {
  const genome = readFileSync(asset("genome.js"), "utf8").trimEnd();
  const caption = readFileSync(asset("caption.txt"), "utf8");
  const manifest = JSON.parse(readFileSync(asset("manifest.json"), "utf8"));

  assert.equal(BLASTOPHORE_GENOME_CHARACTERS, 279);
  assert.equal(genome, BLASTOPHORE_GENOME);
  assert.equal(manifest.series, "Form / Field Originals");
  assert.equal(manifest.genome.origin, "form-field-synthesis");
  assert.equal(manifest.genome.characters, 279);
  assert.equal(manifest.genome.completeLifeCycle, true);
  assert.equal(manifest.genome.sourceMechanicsChanged, false);
  assert.equal(manifest.presentation.externalToGenome, true);
  assert.deepEqual(manifest.presentation.safeZone.renderRect, [120, 240, 660, 1020]);
  assert.ok(manifest.presentation.essentialTextMinimumPixels >= 44);
  assert.match(caption, /form=blastophore/);
});

test("Original 001 includes a TikTok-ready MP4 and cover", () => {
  const video = readFileSync(asset("blastophore-original-001.mp4"));
  const cover = readFileSync(asset("cover.png"));

  assert.ok(statSync(asset("blastophore-original-001.mp4")).size > 1_000_000);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
