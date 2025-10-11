/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ignore React Native async-storage (not needed in browser)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    // Externalize pino-pretty (optional dependency)
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
};

module.exports = nextConfig;
