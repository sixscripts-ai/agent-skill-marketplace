export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/**/*.ts",
      "src/**/*.tsx",
    ],
  },
  {
    files: ["*.mjs", "*.js"],
    rules: {},
  },
];
