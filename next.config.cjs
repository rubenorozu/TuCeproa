/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  // Añadir esta configuración para excluir public/uploads del bundle de las funciones Serverless
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals,
        {
          'public/uploads': 'public/uploads', // Excluir el directorio public/uploads
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
