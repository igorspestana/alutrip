module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.test.json']
  },
  env: {
    node: true,
    es6: true,
    jest: true
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-namespace': 'warn',
    
    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': 'off', // Covered by @typescript-eslint/no-unused-vars
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': 'off',
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'no-useless-escape': 'warn',
    
    // Import rules
    'no-duplicate-imports': 'warn',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Code style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'max-len': ['warn', { code: 120, ignoreComments: true, ignoreUrls: true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'space-before-blocks': 'error',
    'arrow-spacing': ['error', { before: true, after: true }]
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.js'
  ]
};

