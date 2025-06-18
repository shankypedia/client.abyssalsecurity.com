import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Shield, Home, ArrowLeft, Search, ExternalLink, HelpCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Common pages/links that users might be looking for
  const commonPages = [
    { name: 'Dashboard', path: '/dashboard', description: 'Main application dashboard' },
    { name: 'Login', path: '/', description: 'Sign in to your account' },
    { name: 'Support', path: 'mailto:support@abyssalsecurity.com', description: 'Get help from our team', external: true }
  ];

  // Suggested actions based on the current path
  const getSuggestions = () => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('dashboard')) {
      return ['Try going to the main dashboard', 'Check if you are logged in'];
    }
    if (path.includes('profile') || path.includes('account')) {
      return ['Access your profile from the dashboard', 'Make sure you are authenticated'];
    }
    if (path.includes('admin')) {
      return ['Check if you have admin privileges', 'Contact your administrator'];
    }
    return [
      'Check the URL for typos',
      'Try using the search function below',
      'Navigate using the main menu'
    ];
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Simple search logic - in a real app this would search your actual content
      if (searchQuery.toLowerCase().includes('dashboard')) {
        navigate('/dashboard');
      } else if (searchQuery.toLowerCase().includes('login') || searchQuery.toLowerCase().includes('signin')) {
        navigate('/');
      } else {
        // For demo purposes, just show an alert
        alert(`Search functionality would look for: "${searchQuery}"`);
      }
    }
  };

  useEffect(() => {
    // Log 404 error for analytics
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // In a real application, you might want to send this to your analytics service
    // analytics.track('404_error', { path: location.pathname, referrer: document.referrer });
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
            {/* Current path information */}
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">You tried to access:</p>
              <code className="bg-gray-800/50 text-violet-300 px-3 py-1 rounded text-sm break-all">
                {location.pathname}
              </code>
            </div>

            {/* Dynamic suggestions */}
            <div className="text-center text-gray-400">
              <div className="flex items-center justify-center mb-3">
                <HelpCircle className="h-4 w-4 mr-2" />
                <span className="font-medium">What you can try:</span>
              </div>
              <ul className="space-y-1 text-sm">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>

            {/* Search functionality */}
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Search className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">Quick Search</span>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search for pages or features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400 flex-1"
                />
                <Button 
                  type="submit" 
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Common pages */}
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">Popular Pages</span>
              </div>
              <div className="grid gap-2">
                {commonPages.map((page, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm">{page.name}</h4>
                        <p className="text-gray-400 text-xs mt-1">{page.description}</p>
                      </div>
                      {page.external ? (
                        <Button asChild size="sm" variant="ghost" className="text-violet-400 hover:text-violet-300">
                          <a href={page.path} className="flex items-center">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost" className="text-violet-400 hover:text-violet-300">
                          <Link to={page.path}>
                            <ArrowLeft className="h-3 w-3 rotate-180" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t border-white/10">
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
