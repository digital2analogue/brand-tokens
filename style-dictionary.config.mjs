export default {
  usesDtcg: true,
  source: [
    'tokens/primitives/**/*.tokens.json',
    'tokens/semantic/**/*.tokens.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },
  },
};
