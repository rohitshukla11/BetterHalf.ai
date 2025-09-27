/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add global polyfills
    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        child_process: false,
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        os: false,
        path: require.resolve('path-browserify'),
        http2: false,
        worker_threads: false,
        'node-domexception': false,
        'node:crypto': require.resolve('crypto-browserify'),
        'node:buffer': require.resolve('buffer'),
        'node:stream': require.resolve('stream-browserify'),
        'node:util': require.resolve('util'),
        'node:path': require.resolve('path-browserify'),
        process: require.resolve('process/browser'),
      };
    }
    return config;
  },
  // BetterHalf.ai configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Application-Name',
            value: 'BetterHalf.ai',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
