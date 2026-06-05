const path = require("path");

// babel-preset-expo is nested under expo/node_modules here, so resolve it
// relative to the expo package rather than by bare name.
const babelPresetExpo = require.resolve("babel-preset-expo", {
  paths: [path.dirname(require.resolve("expo/package.json"))],
});

/**
 * Replaces every `import.meta` with a harmless stub object.
 *
 * Some 3D dependencies (zustand, tunnel-rat, three-mesh-bvh, …) ship `import.meta`.
 * Metro loads async web chunks as classic <script> (not type="module"), so a raw
 * `import.meta` throws "Cannot use 'import.meta' outside a module" at runtime and
 * kills the chunk (the 3D room screen). Rewriting it keeps the chunk valid; the
 * stub exposes `.url` (current href on web) and an empty `.env`, which is all
 * those libraries actually read.
 */
function importMetaStub() {
  return {
    name: "import-meta-stub",
    visitor: {
      MetaProperty(p) {
        const node = p.node;
        if (
          node.meta &&
          node.meta.name === "import" &&
          node.property &&
          node.property.name === "meta"
        ) {
          p.replaceWithSourceString(
            "({ url: typeof location !== 'undefined' ? location.href : '', env: {} })"
          );
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [babelPresetExpo],
    plugins: [importMetaStub],
  };
};
