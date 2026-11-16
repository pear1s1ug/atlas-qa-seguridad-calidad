const js = require("@eslint/js");
const globals = require("globals");
const security = require("eslint-plugin-security");

module.exports = [
  { ignores: ["node_modules/**", "reports/**", "uploads/**"] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "no-unused-vars": ["error", { args: "after-used", caughtErrors: "none" }],
      "no-console": "warn",
    },
  },
  {
    // En pruebas los nombres de archivo y expresiones dinámicas son datos controlados del propio test
    files: ["tests/**/*.js"],
    rules: { "security/detect-non-literal-fs-filename": "off", "security/detect-non-literal-regexp": "off", "security/detect-object-injection": "off" },
  },
];
