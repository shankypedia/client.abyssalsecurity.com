import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Shield, RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

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
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-red-500/20 rounded-full">
                    <AlertTriangle className="h-12 w-12 text-red-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-white mb-2">
                  Something went wrong
                </CardTitle>
                <p className="text-gray-300 text-lg">
                  An unexpected error occurred. Our team has been notified.
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="text-left bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <h4 className="text-red-400 font-semibold mb-2">Error Details (Development Mode):</h4>
                    <pre className="text-xs text-red-300 overflow-auto max-h-40">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                )}

                <div className="text-center text-gray-400">
                  <p>You can try the following:</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li>• Refresh the page</li>
                    <li>• Go back to the homepage</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={this.handleReload}
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-semibold"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-gray-400 text-sm">
              Error ID: {new Date().getTime().toString(36)} |{' '}
              Contact support at{' '}
              <a href="mailto:support@abyssalsecurity.com" className="text-violet-400 hover:text-violet-300">
                support@abyssalsecurity.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;