/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        buffer: false,
        stream: false,
        util: false,
        os: false,
        path: false,
        http2: false,
        worker_threads: false,
        'node-domexception': false,
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
