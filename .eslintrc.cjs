/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "prettier",
  ],
  globals: {
    shopify: "readonly",
    globalThis: "readonly",
  },
  ignorePatterns: [
    "node_modules/",
    "build/",
    "dist/",
    "extensions/*/dist/",
    "**/*.d.ts",
  ],
};
