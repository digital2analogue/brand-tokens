// Custom Elements Manifest analyzer config.
//
// Why this exists: `cem analyze` scans source for custom elements, but its
// default file set pulls in anything under the package — including the
// Storybook *.stories.ts files, which are not components and must not leak
// into custom-elements.json / design-system.json (doing so breaks the CI
// artifact-staleness gate). Pinning globs to src and excluding test, story and
// fixture files keeps the manifest deterministic and limited to real
// components.
//
// *-fixture.ts earns its place in that list the same way the others did: an
// inlined base64 image for the avatar story landed a 564-character data URI
// and its whole docstring into design-system.json, which is the contract
// agents read. Anything that exists only to feed a story belongs outside the
// manifest.

export default {
  globs: ["src/**/*.ts"],
  exclude: ["**/*.test.ts", "**/*.stories.ts", "**/*-fixture.ts"],
  litelement: true,
};
