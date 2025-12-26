import next from "eslint-config-next"
import security from "eslint-plugin-security"

const config = [
  {
    ignores: ["dist/**", "beta/**", ".vercel/**", "public/**", "**/*.js", "node_modules/**"],
  },
  ...next,
  security.configs.recommended,
  {
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-unsafe-regex": "off",
      "security/detect-possible-timing-attacks": "off",
    },
  },
]

export default config
