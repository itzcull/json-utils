// @ts-check
import itzcull from '@itzcull/eslint-config'

export default itzcull(
  {
    type: 'lib',
    pnpm: true,
    rules: {
      'style/indent-binary-ops': 'off',
    },
  },
)
