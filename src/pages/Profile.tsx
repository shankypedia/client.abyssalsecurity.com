import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Save, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Shield, 
  Calendar, 
  Mail, 
  UserCheck, 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Key,
  Globe,
  Bell,
  Moon,
  Sun,
  Languages,
  Download,
  Trash2,
  Smartphone,
  Monitor,
  Palette,
  Volume2,
  VolumeX,
  MapPin,
  Wifi,
  Database,
  FileText,
  LogOut,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';

const Profile = () => {
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      sms: false,
      security: true
    },
    privacy: {
      profileVisibility: 'private',
      activityTracking: true,
      analyticsOptIn: false
    }
  });
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const profileSections = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security Settings', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'sessions', label: 'Active Sessions', icon: Monitor },
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset any previous username errors
    setUsernameError('');
    
    // Validate username before sending
    if (profileData.username && profileData.username !== user?.username) {
      if (profileData.username.length < 3 || profileData.username.length > 20) {
        setUsernameError('Username must be between 3 and 20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(profileData.username)) {
        setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        return;
      }
    }
    
    setIsProfileLoading(true);

    try {
      const response = await apiService.updateUserProfile(
        profileData.firstName,
        profileData.lastName,
        profileData.username
      );

      if (response.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        
        // Update local storage with new user data
        if (response.user) {
          const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(response.user));
          
          // Update the profile data state with the response
          setProfileData({
            firstName: response.user.firstName || '',
            lastName: response.user.lastName || '',
            username: response.user.username || '',
            email: response.user.email || ''
          });
          
          // Force a page refresh to update the useAuth hook
          setTimeout(() => window.location.reload(), 500);
        }
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
      
      if (error.message.includes('Username')) {
        setUsernameError(error.message);
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await apiService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (response.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        toast({
          title: "Password Changed",
          description: "Your password has been successfully updated.",
        });
      } else {
        throw new Error(response.message || "Failed to change password");
      }
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
          <p className="animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 relative overflow-hidden scroll-smooth">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MCBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 animate-pulse"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 animate-float-${i + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex min-h-screen">
        {/* Enhanced Sidebar Navigation */}
        <div className="w-80 bg-white/5 border-r border-white/10 backdrop-blur-xl p-6 overflow-y-auto">
          <div className="mb-8">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-gray-400 hover:text-white transition-all duration-300 hover:bg-white/10 mb-6 group"
            >
              <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-6">
              <Clock className="h-4 w-4" />
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Account Settings
            </h2>
            <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
          </div>

          <nav className="space-y-2">
            {profileSections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all duration-300 hover:bg-white/10 group ${
                  activeSection === section.id 
                    ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30 shadow-lg shadow-violet-500/10' 
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-center space-x-3">
                  <section.icon className={`h-5 w-5 transition-all duration-300 ${
                    activeSection === section.id ? 'text-violet-400' : 'text-gray-400 group-hover:text-white'
                  }`} />
                  <span className="font-medium">{section.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-all duration-300 ${
                  activeSection === section.id ? 'rotate-90 text-violet-400' : 'text-gray-500 group-hover:text-white'
                }`} />
              </button>
            ))}
          </nav>

          {/* User Info Card */}
          <div className="mt-8 p-4 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-12 w-12 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.firstName && user.lastName 
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` 
                  : user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username}
                </p>
                <p className="text-xs text-gray-400">@{user.username}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-3 w-3" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-3 w-3" />
                <span>Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short'
                }) : 'Recently'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 space-y-12">
            
            {/* Profile Information Section */}
            <section id="profile" className="space-y-8 animate-fade-in-up">
              <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 rounded-2xl p-8 border border-white/10 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-500">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-6">
                    <div className="relative group">
                      <div className="h-24 w-24 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg group-hover:shadow-xl group-hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 cursor-pointer">
                        {user.firstName && user.lastName 
                          ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` 
                          : user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center animate-pulse">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white text-xs font-medium">
                        Change Photo
                      </button>
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.username}
                      </h1>
                      <div className="flex items-center space-x-6 text-gray-300 mb-3">
                        <div className="flex items-center space-x-2 hover:text-white transition-colors">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 hover:text-violet-400 transition-colors">
                          <UserCheck className="h-4 w-4" />
                          <span>@{user.username}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-green-400 bg-green-500/20 border border-green-500/30 mb-3 hover:bg-green-500/30 transition-colors">
                      <CheckCircle className="h-4 w-4 mr-2 animate-pulse" />
                      Active Account
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      ID: {user.id}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Profile Information Form */}
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 group hover:border-violet-500/30">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-r from-violet-500/20 to-violet-600/20 rounded-xl group-hover:from-violet-500/30 group-hover:to-violet-600/30 transition-colors">
                            <User className="h-6 w-6 text-violet-400" />
                          </div>
                          <div>
                            <span className="text-lg font-semibold">Profile Information</span>
                            <p className="text-sm text-gray-400 font-normal">Update your personal details</p>
                          </div>
                        </div>
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>First Name</span>
                            </label>
                            <Input
                              type="text"
                              value={profileData.firstName}
                              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                              placeholder="Enter first name"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>Last Name</span>
                            </label>
                            <Input
                              type="text"
                              value={profileData.lastName}
                              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                              placeholder="Enter last name"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                            <UserCheck className="h-4 w-4 text-gray-400" />
                            <span>Username</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="text"
                              value={profileData.username}
                              onChange={(e) => {
                                const newUsername = e.target.value;
                                setProfileData(prev => ({ ...prev, username: newUsername }));
                                setUsernameError('');
                                
                                // Real-time validation feedback
                                if (newUsername && newUsername !== user?.username) {
                                  if (newUsername.length < 3 || newUsername.length > 20) {
                                    setUsernameError('Username must be between 3 and 20 characters');
                                  } else if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
                                    setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
                                  }
                                }
                              }}
                              className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all ${
                                usernameError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50' : ''
                              }`}
                              placeholder="Enter username (3-20 characters)"
                            />
                            {isCheckingUsername && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="h-4 w-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          {usernameError ? (
                            <p className="text-xs text-red-400 flex items-center space-x-1 animate-shake">
                              <AlertCircle className="h-3 w-3" />
                              <span>{usernameError}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">Username must be 3-20 characters, case-sensitive, alphanumeric with underscore/hyphen allowed</p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>Email Address</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="email"
                              value={profileData.email}
                              disabled
                              className="bg-white/5 border-white/10 text-gray-400 cursor-not-allowed"
                              placeholder="Email cannot be changed"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <AlertCircle className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center space-x-1">
                            <Lock className="h-3 w-3" />
                            <span>Email address cannot be modified for security reasons</span>
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={isProfileLoading || isCheckingUsername || !!usernameError}
                          className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/30"
                        >
                          {isProfileLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Updating Profile...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Save className="h-4 w-4" />
                              <span>Update Profile</span>
                            </div>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group hover:border-cyan-500/30">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-white flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-cyan-600/30 transition-colors">
                          <Settings className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                          <span className="text-lg font-semibold">Quick Actions</span>
                          <p className="text-sm text-gray-400 font-normal">Common account tasks</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => scrollToSection('security')}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 text-left group/item"
                        >
                          <Lock className="h-6 w-6 text-violet-400 mb-2 group-hover/item:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-white">Security</p>
                          <p className="text-xs text-gray-400">Change password</p>
                        </button>
                        
                        <button
                          onClick={() => scrollToSection('notifications')}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 text-left group/item"
                        >
                          <Bell className="h-6 w-6 text-cyan-400 mb-2 group-hover/item:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-white">Notifications</p>
                          <p className="text-xs text-gray-400">Manage alerts</p>
                        </button>
                        
                        <button
                          onClick={() => scrollToSection('privacy')}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 text-left group/item"
                        >
                          <Shield className="h-6 w-6 text-green-400 mb-2 group-hover/item:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-white">Privacy</p>
                          <p className="text-xs text-gray-400">Data settings</p>
                        </button>
                        
                        <button
                          onClick={() => {
                            toast({
                              title: "Export Data",
                              description: "Data export functionality coming soon!",
                            });
                          }}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 transition-all duration-300 text-left group/item"
                        >
                          <Download className="h-6 w-6 text-yellow-400 mb-2 group-hover/item:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-white">Export</p>
                          <p className="text-xs text-gray-400">Download data</p>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* Security Settings Section */}
            <section id="security" className="space-y-6 animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-xl">
                  <Lock className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                  <p className="text-gray-400">Manage your account security and authentication</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Password Change */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group hover:border-cyan-500/30">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-cyan-600/30 transition-colors">
                          <Key className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                          <span className="text-lg font-semibold">Change Password</span>
                          <p className="text-sm text-gray-400 font-normal">Update your account password</p>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      {/* Password Strength Requirements */}
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>Password Requirements</span>
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-400" />
                            <span>At least 8 characters long</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-400" />
                            <span>Strong password recommended</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <span>Current Password</span>
                        </label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-12 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            placeholder="Enter current password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                          <Key className="h-4 w-4 text-gray-400" />
                          <span>New Password</span>
                        </label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-12 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            placeholder="Enter new password (min 8 characters)"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-gray-400" />
                          <span>Confirm New Password</span>
                        </label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                          placeholder="Confirm new password"
                          required
                        />
                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                          <p className="text-xs text-red-400 flex items-center space-x-1 animate-shake">
                            <AlertCircle className="h-3 w-3" />
                            <span>Passwords do not match</span>
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                        className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30"
                      >
                        {isPasswordLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Changing Password...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Lock className="h-4 w-4" />
                            <span>Change Password</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Security Status */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 hover:border-yellow-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Shield className="h-5 w-5 text-yellow-400" />
                      </div>
                      <span>Security Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <span className="text-sm text-gray-300">Email Verification</span>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">Verified</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <span className="text-sm text-gray-300">Two-Factor Authentication</span>
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs text-yellow-400">Not Enabled</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <span className="text-sm text-gray-300">Password Strength</span>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">Strong</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <span className="text-sm text-gray-300">Last Login</span>
                        <span className="text-xs text-gray-400">Today at {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <Button
                        onClick={() => {
                          toast({
                            title: "2FA Setup",
                            description: "Two-factor authentication setup coming in Month 3!",
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/30 transition-all duration-300"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Enable 2FA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Notifications Section */}
            <section id="notifications" className="space-y-6 animate-fade-in-up" style={{animationDelay: '400ms'}}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Bell className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
                  <p className="text-gray-400">Configure how you receive updates and alerts</p>
                </div>
              </div>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/30">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {[
                      { 
                        key: 'email', 
                        label: 'Email Notifications', 
                        description: 'Receive updates via email',
                        icon: Mail 
                      },
                      { 
                        key: 'push', 
                        label: 'Push Notifications', 
                        description: 'Browser and mobile push alerts',
                        icon: Smartphone 
                      },
                      { 
                        key: 'sms', 
                        label: 'SMS Notifications', 
                        description: 'Text message alerts for critical events',
                        icon: Wifi 
                      },
                      { 
                        key: 'security', 
                        label: 'Security Alerts', 
                        description: 'Login attempts and security events',
                        icon: Shield 
                      }
                    ].map((notification) => (
                      <div 
                        key={notification.key}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                            <notification.icon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{notification.label}</p>
                            <p className="text-sm text-gray-400">{notification.description}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notifications[notification.key as keyof typeof preferences.notifications]}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                [notification.key]: e.target.checked
                              }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Preferences Section */}
            <section id="preferences" className="space-y-6 animate-fade-in-up" style={{animationDelay: '600ms'}}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-xl">
                  <Settings className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Preferences</h2>
                  <p className="text-gray-400">Customize your experience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 hover:border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Palette className="h-5 w-5 text-purple-400" />
                      <span>Appearance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-3 block">Theme</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'light', label: 'Light', icon: Sun }
                        ].map((theme) => (
                          <button
                            key={theme.value}
                            onClick={() => setPreferences(prev => ({ ...prev, theme: theme.value }))}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              preferences.theme === theme.value
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <theme.icon className="h-5 w-5 mx-auto mb-1" />
                            <p className="text-sm">{theme.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:border-green-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-green-400" />
                      <span>Localization</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-3 block">Language</label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-3 block">Timezone</label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time</option>
                        <option value="PST">Pacific Time</option>
                        <option value="CET">Central European Time</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Privacy & Data Section */}
            <section id="privacy" className="space-y-6 animate-fade-in-up" style={{animationDelay: '800ms'}}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-xl">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Privacy & Data</h2>
                  <p className="text-gray-400">Control your data and privacy settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:border-green-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Database className="h-5 w-5 text-green-400" />
                      <span>Data Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        label: 'Download Your Data',
                        description: 'Export all your account data',
                        icon: Download,
                        action: () => toast({ title: "Export Data", description: "Data export feature coming soon!" })
                      },
                      {
                        label: 'Delete Account',
                        description: 'Permanently delete your account',
                        icon: Trash2,
                        action: () => toast({ title: "Account Deletion", description: "Account deletion requires email verification. Contact support." }),
                        danger: true
                      }
                    ].map((item, index) => (
                      <button
                        key={index}
                        onClick={item.action}
                        className={`w-full p-4 rounded-lg border transition-all duration-300 text-left hover:bg-white/10 ${
                          item.danger
                            ? 'border-red-500/30 hover:border-red-500/50 group'
                            : 'border-white/10 hover:border-green-500/30 group'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <item.icon className={`h-5 w-5 transition-colors ${
                            item.danger ? 'text-red-400 group-hover:text-red-300' : 'text-green-400 group-hover:text-green-300'
                          }`} />
                          <div>
                            <p className={`font-medium ${item.danger ? 'text-red-400' : 'text-white'}`}>{item.label}</p>
                            <p className="text-sm text-gray-400">{item.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Eye className="h-5 w-5 text-blue-400" />
                      <span>Privacy Controls</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: 'activityTracking',
                        label: 'Activity Tracking',
                        description: 'Track your usage for analytics'
                      },
                      {
                        key: 'analyticsOptIn',
                        label: 'Analytics Opt-in',
                        description: 'Help improve our services'
                      }
                    ].map((privacy) => (
                      <div 
                        key={privacy.key}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div>
                          <p className="font-medium text-white">{privacy.label}</p>
                          <p className="text-sm text-gray-400">{privacy.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.privacy[privacy.key as keyof typeof preferences.privacy]}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              privacy: {
                                ...prev.privacy,
                                [privacy.key]: e.target.checked
                              }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Active Sessions Section */}
            <section id="sessions" className="space-y-6 animate-fade-in-up" style={{animationDelay: '1000ms'}}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl">
                  <Monitor className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Active Sessions</h2>
                  <p className="text-gray-400">Manage your logged-in devices and sessions</p>
                </div>
              </div>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 hover:border-orange-500/30">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      {
                        device: 'Current Session',
                        location: 'New York, US',
                        browser: 'Chrome on Windows',
                        lastActive: 'Now',
                        current: true
                      },
                      {
                        device: 'Mobile Device',
                        location: 'New York, US',
                        browser: 'Safari on iPhone',
                        lastActive: '2 hours ago',
                        current: false
                      }
                    ].map((session, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${session.current ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                            <Monitor className={`h-5 w-5 ${session.current ? 'text-green-400' : 'text-orange-400'}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-white">{session.device}</p>
                              {session.current && (
                                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Current</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{session.browser}</p>
                            <p className="text-xs text-gray-500">{session.location} • Last active {session.lastActive}</p>
                          </div>
                        </div>
                        {!session.current && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                            onClick={() => {
                              toast({
                                title: "Session Terminated",
                                description: "The selected session has been terminated.",
                              });
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Terminate
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Button
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                      onClick={() => {
                        toast({
                          title: "All Sessions Terminated",
                          description: "All other sessions have been terminated. You will need to log in again on other devices.",
                        });
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Terminate All Other Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;