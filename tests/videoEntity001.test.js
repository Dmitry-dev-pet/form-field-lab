import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  inspectSketch36Genome,
  sketch36Defaults,
  sketch36Original
} from "../src/data/sketch36Genome.js";

const asset = name => new URL(`../public/videos/entity-001/${name}`, import.meta.url);

test("Entity 001 preserves the attributed original and packages one portable mutation", () => {
  const genome = readFileSync(asset("genome.js"), "utf8").trimEnd();
  const caption = readFileSync(asset("caption.txt"), "utf8");
  const manifest = JSON.parse(readFileSync(asset("manifest.json"), "utf8"));
  const expected = inspectSketch36Genome({
    ...sketch36Defaults,
    mode: "memory",
    depth: "orbit"
  });

  assert.equal(sketch36Original.code.length, 273);
  assert.equal(genome, expected.code);
  assert.equal(genome.length, 263);
  assert.equal(manifest.source.author, "@yuruyurau");
  assert.equal(manifest.source.characters, 273);
  assert.equal(manifest.mutation.characters, 263);
  assert.equal(manifest.presentation.externalToGenome, true);
  assert.match(caption, /@yuruyurau/);
  assert.match(caption, /form-field-lab\/#\/lab\/36/);
});

test("Entity 001 includes a social-ready MP4 and PNG cover", () => {
  const video = readFileSync(asset("entity-001.mp4"));
  const cover = readFileSync(asset("cover.png"));

  assert.ok(statSync(asset("entity-001.mp4")).size > 1_000_000);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
