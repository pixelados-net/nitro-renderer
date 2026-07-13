import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'docs/**']
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            'indent': [
                'error',
                4,
                {
                    'SwitchCase': 1
                }
            ],
            'no-multi-spaces': ['error'],
            'no-trailing-spaces': [
                'error',
                {
                    'skipBlankLines': false,
                    'ignoreComments': true
                }
            ],
            'linebreak-style': ['off'],
            'quotes': [
                'error',
                'single'
            ],
            'semi': [
                'error',
                'always'
            ],
            'brace-style': [
                'error',
                'allman'
            ],
            'object-curly-spacing': [
                'error',
                'always'
            ],
            'keyword-spacing': [
                'error',
                {
                    'overrides': {
                        'if': { 'after': false },
                        'for': { 'after': false },
                        'while': { 'after': false },
                        'switch': { 'after': false }
                    }
                }
            ],
            '@typescript-eslint/no-explicit-any': ['off'],
            '@typescript-eslint/explicit-module-boundary-types': ['off'],
            '@typescript-eslint/ban-ts-comment': ['off'],
            '@typescript-eslint/no-unsafe-function-type': ['off'],
            '@typescript-eslint/no-unused-expressions': ['off'],
            '@typescript-eslint/no-wrapper-object-types': ['off'],
            '@typescript-eslint/no-empty-object-type': ['off'],
            '@typescript-eslint/no-empty-function': [
                'error',
                {
                    'allow': [
                        'functions',
                        'arrowFunctions',
                        'generatorFunctions',
                        'methods',
                        'generatorMethods',
                        'constructors'
                    ]
                }
            ],
            '@typescript-eslint/no-unused-vars': ['off'],
            '@typescript-eslint/no-inferrable-types': [
                'error',
                {
                    'ignoreParameters': true,
                    'ignoreProperties': true
                }
            ],
            '@typescript-eslint/no-restricted-types': [
                'error',
                {
                    'types': {
                        'String': { 'message': 'Use string instead', 'fixWith': 'string' },
                        'Boolean': { 'message': 'Use boolean instead', 'fixWith': 'boolean' },
                        'Number': { 'message': 'Use number instead', 'fixWith': 'number' },
                        'Symbol': { 'message': 'Use symbol instead', 'fixWith': 'symbol' }
                    }
                }
            ]
        }
    }
);
