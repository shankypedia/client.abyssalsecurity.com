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
  Globe
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
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MCBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Profile Header Section */}
            <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 rounded-2xl p-8 border border-white/10 backdrop-blur-sm mb-8 hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="h-20 w-20 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:shadow-xl group-hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105">
                      {user.firstName && user.lastName 
                        ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` 
                        : user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center animate-pulse">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.username}
                    </h1>
                    <div className="flex items-center space-x-4 text-gray-300">
                      <div className="flex items-center space-x-2 hover:text-white transition-colors">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 hover:text-violet-400 transition-colors">
                        <UserCheck className="h-4 w-4" />
                        <span>@{user.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
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
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/20 border border-green-500/30 mb-2 hover:bg-green-500/30 transition-colors">
                    <CheckCircle className="h-3 w-3 mr-1 animate-pulse" />
                    Active Account
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    ID: {user.id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
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
                  <Settings className="h-4 w-4 text-gray-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                      <p className="text-xs text-red-400 flex items-center space-x-1">
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
                    className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Change Password */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group hover:border-cyan-500/30">
              <CardHeader className="pb-6">
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-cyan-600/30 transition-colors">
                      <Lock className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold">Security Settings</span>
                      <p className="text-sm text-gray-400 font-normal">Update your password</p>
                    </div>
                  </div>
                  <Key className="h-4 w-4 text-gray-500" />
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
                      <p className="text-xs text-red-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                    className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          {/* Account Information & Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                  <span>Account Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Account Created</span>
                    </div>
                    <p className="text-white font-semibold">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.createdAt ? `${Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago` : ''}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Account Status</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-green-400 font-semibold">Active</p>
                    </div>
                    <p className="text-xs text-gray-500">Full access granted</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Account ID</span>
                    </div>
                    <p className="text-gray-300 font-mono text-sm bg-white/5 px-2 py-1 rounded border">{user.id}</p>
                    <p className="text-xs text-gray-500">Unique identifier</p>
                  </div>
                </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Email Verification</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400">Verified</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Two-Factor Auth</span>
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Not Enabled</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Password Strength</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400">Strong</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <Button
                    onClick={() => {
                      toast({
                        title: "Security Settings",
                        description: "Advanced security features coming in Month 3!",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/30 transition-all duration-300"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Enhance Security
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;