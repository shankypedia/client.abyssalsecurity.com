import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MEBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="text-center max-w-lg mx-auto z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-12">
          <div className="p-4 bg-violet-500/10 rounded-3xl mr-4 backdrop-blur-sm border border-violet-500/20">
            <Shield className="h-14 w-14 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              AbyssalSecurity
            </h1>
            <p className="text-violet-400 font-semibold">Enterprise Security Portal</p>
          </div>
        </div>

        {/* 404 Content */}
        <div className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl p-8 mb-8">
          <div className="text-8xl font-bold text-violet-400 mb-6">404</div>
          <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>
          <p className="text-gray-300 text-lg mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm mb-2">You tried to access:</p>
            <code className="bg-gray-800/50 text-violet-300 px-3 py-1 rounded text-sm break-all">
              {location.pathname}
            </code>
          </div>

          <Button 
            asChild
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-semibold"
          >
            <Link to="/" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Link>
          </Button>
        </div>

        <div className="text-gray-400 text-sm">
          Need help? Contact{' '}
          <a href="mailto:support@abyssalsecurity.com" className="text-violet-400 hover:text-violet-300">
            support@abyssalsecurity.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
