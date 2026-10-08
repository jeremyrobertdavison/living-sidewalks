# Publish v2.0.0 on GitHub

These files are configured for the public repository:
https://github.com/jeremyrobertdavison/living-sidewalks

If the repository owner or name is different, change `url`, `manifest`, and `download` in module.json and rebuild the release ZIP before publishing. The standalone manifest and the manifest inside the release ZIP must match.

## Source upload

1. Extract `living-sidewalks-source-v2.0.0.zip` on your computer.
2. Open the repository in your browser. Choose **Add file → Upload files**.
3. Upload the extracted contents, including the scripts and tests folders. `module.json`, `README.md`, and `styles.css` must be at the repository root. Do not upload the source ZIP itself as a substitute for the extracted source.
4. Commit these changes to the default branch.

## Release upload

1. Open **Releases → Draft a new release**.
2. Choose/create the exact tag **v2.0.0**, targeting the commit containing the new source.
3. Use **Living Sidewalks v2.0.0 — Foundry 14** as the release title.
4. Attach exactly these supplied assets without renaming them:
   - `module.json`
   - `living-sidewalks-v2.0.0.zip`
5. Publish the release and mark it **Latest**. Do not leave it as a draft or mark it as a prerelease: the stable `/releases/latest/download/module.json` address depends on a published latest release.
6. Confirm both URLs download files without signing in:
   - https://github.com/jeremyrobertdavison/living-sidewalks/releases/latest/download/module.json
   - https://github.com/jeremyrobertdavison/living-sidewalks/releases/download/v2.0.0/living-sidewalks-v2.0.0.zip
7. Install/update through Foundry using the manifest URL above.

GitHub automatically adds Source code (zip) and Source code (tar.gz) assets. Those are separate from the installable module ZIP supplied here. The manifest download field must point to `living-sidewalks-v2.0.0.zip`.

The version inside module.json is `2.0.0` (no v); the Git tag is `v2.0.0`.

## Rebuilding the release ZIP

From the repository root, with the correct module.json in place, run:

```bash
zip -r living-sidewalks-v2.0.0.zip module.json scripts styles.css README.md CHANGELOG.md
```

The ZIP has `module.json`, `scripts/`, and `styles.css` at its root. Do not wrap them in another directory. Source archives additionally include tests and publishing instructions.

## Earlier previews without update URLs

Those installed previews may not discover updates automatically. Install once through the stable manifest URL (see README.md). Future releases should retain the same manifest URL, increase version, and point download to the new tag's ZIP.
