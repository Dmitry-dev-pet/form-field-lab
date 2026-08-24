import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMUNITY_AUTHORS,
  COMMUNITY_GENES,
  COMMUNITY_SCAN,
  PELAGION_LINEAGE
} from "../src/data/communityDna.js";
import {
  PELAGION_GENOME,
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_LIMIT
} from "../src/data/pelagionGenome.js";

test("the community census is internally complete", () => {
  assert.equal(COMMUNITY_SCAN.sketches, 845);
  assert.equal(COMMUNITY_AUTHORS.length, COMMUNITY_SCAN.authors);
  assert.equal(new Set(COMMUNITY_AUTHORS.map(author => author.handle)).size, COMMUNITY_SCAN.authors);
  assert.equal(COMMUNITY_AUTHORS.reduce((total, author) => total + author.count, 0), COMMUNITY_SCAN.sketches);

  const covered = new Set(COMMUNITY_GENES.flatMap(gene => gene.authors));
  assert.deepEqual(
    [...covered].sort(),
    COMMUNITY_AUTHORS.map(author => author.handle).sort()
  );
});

test("Pelagion lineage keeps direct archive evidence", () => {
  assert.ok(PELAGION_LINEAGE.length >= 6);
  assert.ok(PELAGION_LINEAGE.every(item => /^https:\/\/tsubuyaki\.art\/sketch\.html\?id=\d+$/.test(item.url)));
});

test("the autonomous Pelagion genome stays inside the challenge limit", () => {
  assert.equal(PELAGION_GENOME_CHARACTERS, PELAGION_GENOME.length);
  assert.ok(PELAGION_GENOME_CHARACTERS <= PELAGION_GENOME_LIMIT);
  assert.match(PELAGION_GENOME, /WEBGL/);
  assert.match(PELAGION_GENOME, /point\([^,]+,[^,]+,[^)]+\)/);
  assert.doesNotThrow(() => new Function(PELAGION_GENOME));
});
