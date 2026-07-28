import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
    "*.astro": "prettier --write",
  },
  fmt: {
    arrowParens: "always",
    bracketSameLine: true,
    bracketSpacing: true,
    endOfLine: "lf",
    printWidth: 100,
    sortImports: true,
    sortTailwindcss: true,
    tabWidth: 2,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react"],
  },
  run: {
    tasks: {
      vp_build: {
        command: "astro build",
        dependsOn: ["vp_check"],
      },
      vp_check: {
        command: "astro check && vp check --fix && prettier --write **/*.astro",
      },
    },
    // cache: { scripts: true },
  },
});
