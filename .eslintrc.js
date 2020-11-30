module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    // disable extra semicolon report at the end of expressions
    // comment out to report extra semicolon
    semi: 0
  }
}
