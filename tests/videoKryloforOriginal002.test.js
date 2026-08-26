import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  KRYLOFOR_GENOME,
  KRYLOFOR_GENOME_CHARACTERS
} from "../src/data/kryloforGenome.js";

const asset = name => new URL(`../public/videos/krylofor-original-002/${name}`, import.meta.url);

test("Original 002 packages the exact autonomous Krylofor root", () => {
  const genome = readFileSync(asset("genome.js"), "utf8").trimEnd();
  const caption = readFileSync(asset("caption.txt"), "utf8");
  const manifest = JSON.parse(readFileSync(asset("manifest.json"), "utf8"));

  assert.equal(KRYLOFOR_GENOME_CHARACTERS, 280);
  assert.equal(genome, KRYLOFOR_GENOME);
  assert.equal(manifest.series, "Form / Field Originals");
  assert.equal(manifest.number, 2);
  assert.equal(manifest.genome.origin, "form-field-synthesis");
  assert.equal(manifest.genome.characters, 280);
  assert.equal(manifest.genome.completeWingbeats, 4);
  assert.equal(manifest.genome.internalOrbit, true);
  assert.equal(manifest.genome.sourceMechanicsChanged, false);
  assert.equal(manifest.presentation.externalToGenome, true);
  assert.deepEqual(manifest.presentation.safeZone.renderRect, [120, 240, 660, 1020]);
  assert.ok(manifest.presentation.essentialTextMinimumPixels >= 46);
  assert.ok(manifest.presentation.codeTextPixels >= 38);
  assert.match(caption, /form=krylofor/);
});

test("Original 002 includes a TikTok-ready MP4 and cover", () => {
  const video = readFileSync(asset("krylofor-original-002.mp4"));
  const cover = readFileSync(asset("cover.png"));

  assert.ok(statSync(asset("krylofor-original-002.mp4")).size > 1_000_000);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
