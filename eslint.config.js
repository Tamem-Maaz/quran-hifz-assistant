import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        crypto: "readonly",
        fetch: "readonly",
        console: "readonly",
        DOMException: "readonly",
        TextEncoder: "readonly",
        URL: "readonly",
        Blob: "readonly",
      },
    },
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "*",
          property: "innerHTML",
          message: "ممنوع استخدام innerHTML — استخدم textContent أو DOM APIs الآمنة (القسم 14 من خطة المشروع).",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: "ممنوع استخدام innerHTML — استخدم textContent أو DOM APIs الآمنة (القسم 14 من خطة المشروع).",
        },
      ],
    },
  },
  {
    files: ["playwright.config.js", "vitest.config.js", "tests/e2e/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**", "src/data/surahs.json"],
  },
];
