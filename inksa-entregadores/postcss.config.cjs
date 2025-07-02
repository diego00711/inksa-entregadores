// postcss.config.cjs
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'), // Use require() aqui
    require('autoprefixer'),         // Use require() aqui
  ],
};
