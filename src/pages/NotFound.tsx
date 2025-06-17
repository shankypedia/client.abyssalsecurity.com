import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Shield, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MCBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="text-center max-w-2xl mx-auto z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
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

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="text-8xl font-bold text-violet-400 mb-4">404</div>
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Page Not Found
            </CardTitle>
            <p className="text-gray-300 text-lg">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center text-gray-400">
              <p>This could be due to:</p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>• A mistyped URL</li>
                <li>• An outdated bookmark</li>
                <li>• A broken link</li>
                <li>• Insufficient permissions</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-semibold"
              >
                <Link to="/" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-gray-400 text-sm">
          Need help? Contact support at{' '}
          <a href="mailto:support@abyssalsecurity.com" className="text-violet-400 hover:text-violet-300">
            support@abyssalsecurity.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
