module.exports = {
  // Override TypeScript config
  typescript: {
    // Use faster, looser checking
    ignoreBuildErrors: true,
  },
  // Override webpack config
  webpackOverride: (config) => {
    // Disable TypeScript loader errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};
