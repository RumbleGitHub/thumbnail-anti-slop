# Thumbnail Quality Lab

Answers one question: **did this change make the prompts better or worse?**

```bash
npm run lab                       # engine pipeline (generateSimpleThumbnail), complementary off
npm run lab -- --pipeline=route   # what POST /api/ai/simple-create returns offline (no AI director)
npm run lab -- --complementary    # same checks with COMPLEMENTARY_ENGINES_ENABLED=true
npm run lab -- --strict           # exit 1 on any FAIL check or regression vs. baseline
npm run lab -- --save-baseline    # store this run as reports/baseline(.route).{json,md}
```

- `golden-cases.mjs`: 14 creator requests (PS2 + covers, game world, product with and without reference,
  explicit bedroom, no environment, TARGET image, exact Portuguese text, simple request, food, analyze, improve)
  run against 5 target models.
- Checks are deterministic text assertions grouped by dimension (intent, reference, product, coherence,
  anti-slop, typography, usability). `FAIL` = defect, `WARN` = likely weakness.
- `reports/before-cycle1*.md` = state at `b4f7cc0`; `reports/baseline*.{json,md}` = current accepted state
  (with full prompts) that new runs are compared against. `latest.*` is scratch output and is git-ignored.

**Limits.** These checks read prompt text only. No images are generated, so a passing lab does not prove
that the resulting thumbnail looks good. Use it to catch contradictions, lost intent, and leaked template
content, then confirm visually with real generations.

To turn creator feedback into a regression case ("wrong console", "invented background", "wrong text"),
add a case to `golden-cases.mjs` with the input and a `mustInclude` / `mustNotIncludePositive` expectation.
