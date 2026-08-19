# Commercial Quality Gate

> Status: active development gate. The commercial-alpha branch must not be promoted to main until every mandatory item below is verified.

## Character art

- [ ] Cao Cao, Xiahou Dun, Dian Wei, Guo Jia, Guan Yu, and Zhang Fei are recognizable without name labels.
- [ ] Dialogue bust portraits and battlefield SD units are separate assets.
- [ ] Placeholder pixel/CSS-token art is removed from the final presentation.
- [ ] Every core officer has idle, walk, attack, skill, hit, guard, victory, and retreat states.
- [ ] Movement visibly follows the actual route with intermediate frames.
- [ ] Sword, spear, arrow, and strategy attacks have distinct effects.
- [ ] Hit stop, screen shake, damage numbers, counters, and critical effects connect naturally.
- [ ] Touch selection remains accurate at a 390×844 viewport.

## Game loop

- [ ] One chapter completes story → city preparation → roster selection → tactical battle → rewards → next branch.
- [ ] A complete chapter lasts approximately 15–25 minutes for a first-time player.
- [ ] Four entry plans and four formations materially change battle outcomes.
- [ ] Forecasts show damage, accuracy, counter risk, terrain, and class advantage.
- [ ] Mid-battle choices alter resources, officer state, and later records.
- [ ] Save and reload restores the same tactical state.
- [ ] Rule-based AI uses only legal movement, attacks, and skills.

## Automated validation

- [ ] Engine, state, and victory-condition regression tests pass.
- [ ] 1,000 deterministic simulations end without illegal state.
- [ ] Auto-play win-rate proxy remains within the agreed range.
- [ ] Mobile Chromium smoke test passes.
- [ ] Character render fingerprints differ between core officers.
- [ ] At least three intermediate movement frames are observed.
- [ ] Browser errors and failed requests are zero.

## Current milestone

Commercial Art Alpha v0.8 replaces the pixel renderer with smooth original vector silhouettes and adds an eight-scene branching story director. This milestone is an alpha benchmark, not a commercial-quality pass.
