
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  Home, 
  Activity,
  Menu,
  X,
  TrendingUp,
  CheckCircle,
  BarChart3,
  Search,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const { toast } = useToast();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Load services and dashboard stats
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [servicesResponse, statsResponse] = await Promise.all([
          apiService.getServices(),
          apiService.getDashboardStats()
        ]);
        
        if (servicesResponse.success && servicesResponse.services) {
          setServices(servicesResponse.services.slice(0, 3)); // Show only first 3 on dashboard
        }
        
        if (statsResponse.success && statsResponse.stats) {
          setDashboardStats(statsResponse.stats);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    if (isAuthenticated) {
      loadDashboardData();
      
      // Refresh stats every 30 seconds for dynamic feel
      const interval = setInterval(async () => {
        try {
          const statsResponse = await apiService.getDashboardStats();
          if (statsResponse.success && statsResponse.stats) {
            setDashboardStats(statsResponse.stats);
          }
        } catch (error) {
          console.error('Failed to refresh stats:', error);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', active: true, path: '/dashboard' },
    { icon: Shield, label: 'Security', active: false, path: '/security' },
    { icon: Layers, label: 'Services', active: false, path: '/services' },
    { icon: Activity, label: 'Monitoring', active: false, path: '/monitoring' },
    { icon: BarChart3, label: 'Analytics', active: false, path: '/analytics' },
    { icon: User, label: 'Profile', active: false, path: '/profile' },
    { icon: Settings, label: 'Settings', active: false, path: '/settings' },
  ];

  const Sidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-50 w-60 xl:w-72 bg-gray-950/95 backdrop-blur-xl border-r border-white/10 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-violet-400" />
          <span className="text-lg font-semibold text-white">AbyssalSecurity</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-auto text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => {
                  if (item.path === '/services' || item.path === '/profile') {
                    navigate(item.path);
                  } else {
                    toast({
                      title: "Navigation",
                      description: `${item.label} - Coming soon in Month 3!`,
                    });
                  }
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  item.active 
                    ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-6 left-4 right-4">
        <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="h-10 w-10 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user.username}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 relative overflow-hidden scroll-smooth">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MCBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 animate-pulse"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 animate-float-${i % 3 + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 80 + 40}px`,
              height: `${Math.random() * 80 + 40}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 15}s`
            }}
          />
        ))}
      </div>
      
      <Sidebar />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="lg:ml-60 xl:ml-72 relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Security Dashboard</h1>
                <p className="text-sm text-gray-400">Welcome back, {user.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent backdrop-blur-sm transition-all"
                  onFocus={(e) => {
                    toast({
                      title: "Search",
                      description: "Search functionality coming soon!",
                    });
                  }}
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative text-gray-400 hover:text-white p-2"
                onClick={() => {
                  toast({
                    title: "Notifications",
                    description: "You have no new notifications.",
                  });
                }}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 xl:p-8">
          <div className="w-full space-y-4 sm:space-y-6">
            
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 rounded-2xl p-6 border border-white/10 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-500 animate-fade-in-up hover:scale-[1.02] group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl xl:text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent animate-shimmer">Welcome back, {user.username}!</h2>
                  <p className="text-gray-300 text-base xl:text-lg group-hover:text-gray-200 transition-colors duration-300">Your security infrastructure is operating at peak performance.</p>
                </div>
                <div className="hidden md:block">
                  <div className="p-6 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all duration-300 hover:rotate-6 hover:scale-110">
                    <Shield className="h-16 w-16 text-violet-400 group-hover:text-violet-300 transition-colors duration-300 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:scale-105 animate-fade-in-up group" style={{ animationDelay: '100ms' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors">Security Status</p>
                      <p className="text-2xl font-bold text-green-400 mt-1 capitalize group-hover:text-green-300 transition-colors">
                        {dashboardStats?.securityStatus || 'Secure'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-full group-hover:bg-green-500/30 group-hover:scale-110 transition-all duration-300">
                      <CheckCircle className="h-6 w-6 text-green-400 group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 hover:scale-105 animate-fade-in-up group" style={{ animationDelay: '200ms' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors">Active Monitors</p>
                      <p className="text-2xl font-bold text-white mt-1 group-hover:text-violet-200 transition-colors">
                        {dashboardStats?.activeMonitors || '247'}
                      </p>
                    </div>
                    <div className="p-3 bg-violet-500/20 rounded-full group-hover:bg-violet-500/30 group-hover:scale-110 transition-all duration-300">
                      <Activity className="h-6 w-6 text-violet-400 group-hover:animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1 group-hover:scale-110 transition-transform" />
                    <span className="text-sm text-green-400 group-hover:text-green-300 transition-colors">+12% from last week</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 animate-fade-in-up group" style={{ animationDelay: '300ms' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors">Response Time</p>
                      <p className="text-2xl font-bold text-white mt-1 group-hover:text-cyan-200 transition-colors">
                        {dashboardStats?.responseTime || '0.3s'}
                      </p>
                    </div>
                    <div className="p-3 bg-cyan-500/20 rounded-full group-hover:bg-cyan-500/30 group-hover:scale-110 transition-all duration-300">
                      <BarChart3 className="h-6 w-6 text-cyan-400 group-hover:-rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 group-hover:text-gray-300 transition-colors">Optimal performance</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:scale-105 animate-fade-in-up group" style={{ animationDelay: '400ms' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors">Uptime</p>
                      <p className="text-2xl font-bold text-white mt-1 group-hover:text-green-200 transition-colors">
                        {dashboardStats?.uptime || '99.98%'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-full group-hover:bg-green-500/30 group-hover:scale-110 transition-all duration-300">
                      <Shield className="h-6 w-6 text-green-400 group-hover:rotate-180 transition-transform duration-500" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 group-hover:text-gray-300 transition-colors">Enterprise grade</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Security Overview */}
              <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-white flex items-center space-x-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Shield className="h-5 w-5 text-violet-400" />
                    </div>
                    <span>Security Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">Firewall Status</span>
                        <span className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/20 rounded-full border border-green-500/30">ACTIVE</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">DDoS Protection</span>
                        <span className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/20 rounded-full border border-green-500/30">ENABLED</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">SSL Certificate</span>
                        <span className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/20 rounded-full border border-green-500/30">VALID</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">Intrusion Detection</span>
                        <span className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/20 rounded-full border border-green-500/30">MONITORING</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">Vulnerability Scans</span>
                        <span className="px-3 py-1 text-xs font-medium text-cyan-300 bg-cyan-500/20 rounded-full border border-cyan-500/30">SCHEDULED</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sm font-medium text-gray-300">Backup Systems</span>
                        <span className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/20 rounded-full border border-green-500/30">OPERATIONAL</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Activity */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-white flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Activity className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: '2m ago', action: 'Security scan completed', status: 'success' },
                      { time: '15m ago', action: 'SSL certificate renewed', status: 'success' },
                      { time: '1h ago', action: 'Firewall rules updated', status: 'info' },
                      { time: '3h ago', action: 'Vulnerability assessment', status: 'warning' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          item.status === 'success' ? 'bg-green-400' :
                          item.status === 'warning' ? 'bg-yellow-400' : 'bg-cyan-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{item.action}</p>
                          <p className="text-xs text-gray-400">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Available Services Section */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center space-x-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Layers className="h-5 w-5 text-violet-400" />
                    </div>
                    <span>Available Services</span>
                  </CardTitle>
                  <Button
                    onClick={() => navigate('/services')}
                    variant="ghost"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {services.map((service: any) => (
                      <div 
                        key={service.id}
                        className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => navigate('/services')}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Shield className="h-5 w-5 text-violet-400" />
                          <h4 className="font-medium text-white text-sm">{service.name}</h4>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{service.description}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            service.status === 'available' 
                              ? 'text-green-400 bg-green-500/20' 
                              : 'text-yellow-400 bg-yellow-500/20'
                          }`}>
                            {service.status === 'available' ? 'Available' : 'Coming Soon'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Loading services...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Account Summary */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <User className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span>Account Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Account Holder</h3>
                    <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Member Since</h3>
                    <p className="text-white">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Recent'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Actions</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => navigate('/profile')}
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10 text-xs"
                      >
                        Edit Profile
                      </Button>
                      <Button
                        onClick={() => navigate('/services')}
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white text-xs"
                      >
                        View Services
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
