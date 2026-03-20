import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-internal-modules': ['error', {
        forbid: [
          'src/systems/*/*',
          'src/ai/*/*',
          'src/generation/*/*',
          'src/content/*/*',
          'src/ui/*/*',
          'src/scenes/*/*',
          'src/rendering/*/*',
          'src/persistence/*/*',
          'src/input/*/*',
          'src/traits/*/*',
          'src/relations/*/*',
          'src/shared/*/*',
          'src/behaviors/*/*',
        ],
      }],
    },
  },
  { ignores: ['dist/', 'node_modules/', '*.config.*'] },
);
