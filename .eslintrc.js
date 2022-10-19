module.exports = {
  'env': {
    'es2018': true,
    'node': true
  },
  "plugins": [
    "jest"
  ],
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 2018,
    'sourceType': 'module',
    'project': './tsconfig.json'
  },
  'settings': {
    'import/resolver': {
      'typescript': {
        'project': './tsconfig.json'
      }
    }  
  },
  'plugins': [
    '@typescript-eslint',
    'import'
  ],
  'rules': {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'array-element-newline': [
      "error",
      {
        'ArrayExpression': 'consistent',
        'ArrayPattern': {
          'multiline': true
        }
      }
    ],
    'jest/valid-title': ['off']
  }
};
