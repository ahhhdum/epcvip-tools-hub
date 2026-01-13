import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// KaPlay game engine globals
const kaplayGlobals = {
  add: 'readonly',
  anchor: 'readonly',
  area: 'readonly',
  body: 'readonly',
  camPos: 'readonly',
  camScale: 'readonly',
  center: 'readonly',
  circle: 'readonly',
  clamp: 'readonly',
  color: 'readonly',
  debug: 'readonly',
  destroy: 'readonly',
  dt: 'readonly',
  fixed: 'readonly',
  get: 'readonly',
  go: 'readonly',
  height: 'readonly',
  isKeyDown: 'readonly',
  kaplay: 'readonly',
  lerp: 'readonly',
  lifespan: 'readonly',
  loadSprite: 'readonly',
  loadSound: 'readonly',
  loop: 'readonly',
  mousePos: 'readonly',
  move: 'readonly',
  offscreen: 'readonly',
  onClick: 'readonly',
  onHover: 'readonly',
  onHoverEnd: 'readonly',
  onKeyDown: 'readonly',
  onKeyPress: 'readonly',
  onKeyRelease: 'readonly',
  onLoad: 'readonly',
  onScroll: 'readonly',
  onUpdate: 'readonly',
  opacity: 'readonly',
  outline: 'readonly',
  play: 'readonly',
  polygon: 'readonly',
  pos: 'readonly',
  quad: 'readonly',
  rand: 'readonly',
  rect: 'readonly',
  Rect: 'readonly',
  rng: 'readonly',
  rgb: 'readonly',
  rotate: 'readonly',
  scale: 'readonly',
  scene: 'readonly',
  sprite: 'readonly',
  text: 'readonly',
  time: 'readonly',
  vec2: 'readonly',
  wait: 'readonly',
  width: 'readonly',
  z: 'readonly',
};

export default [
  // Recommended rules
  js.configs.recommended,

  // Prettier compatibility (disables conflicting rules)
  prettier,

  // Main config for JS files
  {
    files: ['js/**/*.js', 'tools/js/**/*.js'],
    ignores: ['**/*.test.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...kaplayGlobals,
      },
    },
    rules: {
      // Start minimal - only catch real bugs
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off', // Allow console for debugging
      'prefer-const': 'warn',
    },
  },

  // Test files - Jest globals
  {
    files: ['**/*.test.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },

  // Ignore patterns
  {
    ignores: ['node_modules/**', 'server/**', 'public/**', 'dist/**'],
  },
];
