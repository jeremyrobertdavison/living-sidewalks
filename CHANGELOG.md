# 2.0.0 — Foundry 14 distribution

- Set module version to 2.0.0 and release tag to v2.0.0.
- Add stable manifest, repository, and version-specific download URLs.
- Provide separate source and installable ZIPs, plus standalone module.json.
- Place module.json at the root of the installable ZIP.
- Include public installation and browser-only GitHub publishing instructions.
- Runtime is unchanged from the v14 0.2.0 preview; live Foundry validation remains pending.

# 0.2.0 — Foundry 14 preview

- Target Foundry 14 in the manifest; keep the existing module ID and route flags.
- Replace legacy Dialog/jQuery with DialogV2 and native form controls.
- Preserve dialog form content through v14 HTML cleaning.
- Record route positions using the v14 moveToken hook and committed source coordinates.
- Wait for each pedestrian movement to finish before sending another step.
- Stop owned ambient movement operations on combat, pause, control, or scene/GM changes.
- Keep manually initiated combat movement available.
- Include elevation in wall checks and reject invalid route speed/point data.
- Fourteen automated tests pass. No licensed Foundry or Marvel system integration run performed.
