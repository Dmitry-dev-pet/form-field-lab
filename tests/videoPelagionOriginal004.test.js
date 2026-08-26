import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import { PELAGION_LIVING_GENOME } from "../src/data/pelagionGenome.js";

const asset = name => new URL(`../public/videos/pelagion-original-004/${name}`, import.meta.url);

test("Original 004 packages the exact living Pelagion root", () => {
  const genome = readFileSync(asset("genome.js"), "utf8").trimEnd();
  const caption = readFileSync(asset("caption.txt"), "utf8");
  const manifest = JSON.parse(readFileSync(asset("manifest.json"), "utf8"));

  assert.equal(PELAGION_LIVING_GENOME.length, 274);
  assert.equal(genome, PELAGION_LIVING_GENOME);
  assert.equal(manifest.series, "Form / Field Originals");
  assert.equal(manifest.number, 4);
  assert.equal(manifest.genome.characters, 274);
  assert.equal(manifest.genome.singleBodyWave, true);
  assert.equal(manifest.genome.sourceMechanicsChanged, false);
  assert.equal(manifest.deterministicRender.frameIndexed, true);
  assert.equal(manifest.deterministicRender.realtimeCapture, false);
  assert.equal(manifest.deterministicRender.independentRuns, 2);
  assert.deepEqual(manifest.presentation.safeZone.renderRect, [120, 240, 660, 1020]);
  assert.match(caption, /form=pelagion/);
});

test("Original 004 proves two independent renders are byte-identical", () => {
  const provenance = JSON.parse(readFileSync(asset("provenance.json"), "utf8"));
  const repeatability = JSON.parse(readFileSync(asset("repeatability.json"), "utf8"));

  assert.equal(provenance.renderer, "form-field-frame-indexed-v1");
  assert.equal(provenance.determinism.realtimeCapture, false);
  assert.equal(provenance.frames.sha256.length, 450);
  assert.match(provenance.frames.setSha256, /^[a-f0-9]{64}$/);
  assert.equal(repeatability.verified, true);
  assert.equal(repeatability.independentRuns, 2);
  assert.equal(repeatability.matching.frameSetSha256, provenance.frames.setSha256);
  assert.equal(repeatability.matching.videoSha256, provenance.outputs.video.sha256);
  assert.equal(repeatability.matching.coverSha256, provenance.outputs.cover.sha256);
});

test("Original 004 includes a TikTok-ready deterministic MP4 and cover", () => {
  const video = readFileSync(asset("pelagion-original-004.mp4"));
  const cover = readFileSync(asset("cover.png"));

  assert.ok(statSync(asset("pelagion-original-004.mp4")).size > 1_000_000);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
