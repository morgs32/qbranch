import { baseConfig, defineConfig } from '@morgs32/eslint-config';

const eslintConfig = defineConfig(
  {
    ignores: [
      'dist',
      'node_modules',
      '.tsup',
    ],
  },
  baseConfig,
);

export default eslintConfig;
