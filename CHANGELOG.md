# Changelog

All notable changes to this distribution are documented here. Versions follow Semantic Versioning.

## [0.7.7] - 2026-08-25

### Fixed

- Write GitHub branch-protection payloads as UTF-8 without a byte-order mark on Windows PowerShell 5.1.
- Add a regression test that parses the generated payload and rejects UTF-8 BOM bytes.

## [0.7.6] - 2026-08-25

### Added

- Windows CI coverage for junction creation and Gemini duplicate reconciliation.
- Public repository discovery and native Gemini smoke-test evidence.
- A preserved local NVIDIA plugin manifest under `automation/`.

### Fixed

- Removed duplicate Gemini junctions while preserving independent Gemini skills.
- Corrected new-junction verification on Windows PowerShell 5.1.
- Restored clean fast-forward updates for the local NVIDIA skills checkout.

## [0.7.5] - 2026-08-25

### Added

- Automated GitHub Releases for semantic-version tags.
- Buildable Heru skill bundles and distribution validation.

### Fixed

- Public installation guides now target `heruumhmd/my-agent-skills`.
- Windows audit and updater exit-code handling were hardened.
- Distribution tests now use portable paths on Windows and Linux.
