
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  Home, 
  FileText, 
  Activity,
  Calendar,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Globe,
  Zap,
  BarChart3,
  Eye,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

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
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: Shield, label: 'Security Overview', href: '/security' },
    { icon: Activity, label: 'Threat Monitor', href: '/threats' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: FileText, label: 'Reports', href: '/reports' },
    { icon: Calendar, label: 'Incidents', href: '/incidents' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const Sidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-950/95 backdrop-blur-xl border-r border-white/10 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-violet-500/20 rounded-xl">
            <Shield className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">AbyssalSecurity</span>
            <p className="text-xs text-gray-400">Enterprise Portal</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              <Link
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  item.active 
                    ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.active && <ChevronRight className="h-3 w-3 ml-auto text-violet-400" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-4 left-3 right-3">
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 mb-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5 h-9"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900">
      <Sidebar />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30">
          <div className="flex items-center justify-between h-20 px-4 lg:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white p-2"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Security Dashboard</h1>
                <p className="text-xs lg:text-sm text-gray-400">Real-time threat monitoring & analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 lg:space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white relative p-2">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-white">{user.username}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 rounded-2xl p-6 lg:p-8 border border-white/10 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Welcome back, {user.username}!</h2>
                  <p className="text-gray-300 text-base lg:text-lg">Your security infrastructure is operating at peak performance.</p>
                </div>
                <div className="hidden md:block">
                  <div className="p-4 bg-white/10 rounded-2xl">
                    <Shield className="h-12 w-12 lg:h-16 lg:w-16 text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-300">Threat Level</CardTitle>
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-green-400 mb-1">LOW</div>
                  <p className="text-xs text-gray-400">All systems secure</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-300">Active Monitors</CardTitle>
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Activity className="h-5 w-5 text-violet-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1">247</div>
                  <p className="text-xs text-violet-400 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% from last week
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-300">Response Time</CardTitle>
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Zap className="h-5 w-5 text-cyan-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1">0.3s</div>
                  <p className="text-xs text-cyan-400">Optimal performance</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-300">Uptime</CardTitle>
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Globe className="h-5 w-5 text-green-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1">99.98%</div>
                  <p className="text-xs text-green-400">Enterprise grade</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Security Overview */}
              <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Shield className="h-5 w-5 text-violet-400" />
                    </div>
                    <span>Security Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Firewall Status</span>
                        <span className="text-green-400 text-sm font-medium">ACTIVE</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">DDoS Protection</span>
                        <span className="text-green-400 text-sm font-medium">ENABLED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">SSL Certificate</span>
                        <span className="text-green-400 text-sm font-medium">VALID</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Intrusion Detection</span>
                        <span className="text-green-400 text-sm font-medium">MONITORING</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Vulnerability Scans</span>
                        <span className="text-cyan-400 text-sm font-medium">SCHEDULED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Backup Systems</span>
                        <span className="text-green-400 text-sm font-medium">OPERATIONAL</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white flex-1 sm:flex-none">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" className="border-white/20 text-gray-300 hover:text-white flex-1 sm:flex-none">
                        <Lock className="h-4 w-4 mr-2" />
                        Security Scan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Zap className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 h-12">
                    <Shield className="h-5 w-5 mr-3 text-violet-400" />
                    Run Security Audit
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 h-12">
                    <FileText className="h-5 w-5 mr-3 text-cyan-400" />
                    Generate Report
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 h-12">
                    <Calendar className="h-5 w-5 mr-3 text-violet-400" />
                    Schedule Scan
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 h-12">
                    <Users className="h-5 w-5 mr-3 text-cyan-400" />
                    Contact Support
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 h-12">
                    <Settings className="h-5 w-5 mr-3 text-violet-400" />
                    Configure Alerts
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activity */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-violet-400" />
                  </div>
                  <span>Recent Security Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: '2 minutes ago', action: 'Threat detection scan completed - All clear', status: 'success', icon: CheckCircle },
                    { time: '15 minutes ago', action: 'SSL certificate renewed successfully', status: 'success', icon: Lock },
                    { time: '1 hour ago', action: 'Firewall rules updated and deployed', status: 'info', icon: Shield },
                    { time: '3 hours ago', action: 'Vulnerability assessment initiated', status: 'warning', icon: AlertTriangle },
                    { time: '6 hours ago', action: 'Backup verification completed', status: 'success', icon: CheckCircle },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        item.status === 'success' ? 'bg-green-500/20' :
                        item.status === 'warning' ? 'bg-yellow-500/20' : 'bg-cyan-500/20'
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.status === 'success' ? 'text-green-400' :
                          item.status === 'warning' ? 'text-yellow-400' : 'text-cyan-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium break-words">{item.action}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <p className="text-gray-400 text-xs">{item.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
