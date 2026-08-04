# Changelog

User-facing changes to the design system. Internal-only changes (tests, CI,
build tooling, pure refactors) are not recorded here — see `docs/decisions.md`
for the full decision log, including internal ones.

Entries are dated, newest first, and grouped as New, Improved, Fixed, or Breaking.

---

## 2026-07-28

### Fixed
- Colored status badges in the decision-engine theme (green, violet, and
  amber) are now easy to read — their text was previously too low-contrast
  against its background to meet accessibility standards in some cases. No
  action is needed; the fix is included automatically once you're on the
  latest version. ([#184](https://github.com/digital2analogue/parsimony/pull/184))
