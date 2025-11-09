import next from "eslint-config-next"

const config = [
  ...next,
  {
    ignores: ["dist/**", "beta/**"],
  },
]

export default config
