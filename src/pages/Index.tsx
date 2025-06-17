
import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle, Zap, Users, Globe, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    acceptTerms: false
  });
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });
  const { toast } = useToast();
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!Object.values(passwordStrength).every(Boolean)) {
        toast({
          title: "Weak Password",
          description: "Please ensure your password meets all requirements.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password, formData.rememberMe);
        toast({
          title: "Login Successful",
          description: "Welcome back to AbyssalSecurity.",
        });
        navigate('/dashboard');
      } else {
        await register(formData.email, formData.username, formData.password, formData.acceptTerms);
        toast({
          title: "Account Created Successfully",
          description: "Welcome to AbyssalSecurity.",
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: mode === 'login' ? "Login Failed" : "Registration Failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'password' && mode === 'register') {
      checkPasswordStrength(value);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center space-x-2 text-xs ${met ? 'text-violet-400' : 'text-gray-400'}`}>
      <CheckCircle className={`h-3 w-3 ${met ? 'text-violet-400' : 'text-gray-600'}`} />
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MCBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 opacity-10 animate-pulse">
        <Shield className="h-20 w-20 text-violet-400" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-10 animate-pulse delay-1000">
        <Lock className="h-16 w-16 text-violet-400" />
      </div>
      <div className="absolute top-1/3 right-1/3 opacity-5 animate-pulse delay-500">
        <Zap className="h-12 w-12 text-violet-400" />
      </div>
      
      <div className="flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto gap-16 z-10">
        {/* Brand Section */}
        <div className="text-center lg:text-left lg:flex-1 max-w-2xl">
          <div className="flex items-center justify-center lg:justify-start mb-8">
            <div className="p-4 bg-violet-500/10 rounded-3xl mr-4 backdrop-blur-sm border border-violet-500/20">
              <Shield className="h-14 w-14 text-violet-400" />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AbyssalSecurity
              </h1>
              <p className="text-violet-400 font-semibold text-lg">Enterprise Security Portal</p>
            </div>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
            Next-Generation
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              {" "}Cybersecurity
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              Intelligence
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-12 leading-relaxed max-w-xl">
            Access your comprehensive security dashboard, real-time threat intelligence, 
            and advanced protection analytics in our enterprise-grade client environment.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-300">
            <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Real-time Monitoring</h3>
                <p className="text-sm text-gray-400">24/7 threat detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Advanced Protection</h3>
                <p className="text-sm text-gray-400">Enterprise security</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Globe className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Global Intelligence</h3>
                <p className="text-sm text-gray-400">Worldwide threat data</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Expert Support</h3>
                <p className="text-sm text-gray-400">Dedicated specialists</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Authentication Card */}
        <div className="w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-violet-500/20 rounded-2xl backdrop-blur-sm border border-violet-500/30">
                  {mode === 'login' ? (
                    <Lock className="h-10 w-10 text-violet-400" />
                  ) : (
                    <User className="h-10 w-10 text-violet-400" />
                  )}
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-3">
                {mode === 'login' ? 'Welcome Back' : 'Join AbyssalSecurity'}
              </CardTitle>
              <p className="text-gray-300 text-lg">
                {mode === 'login' 
                  ? 'Access your security command center' 
                  : 'Create your secure account'
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex bg-white/10 rounded-xl p-1.5 backdrop-blur-sm border border-white/20">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    mode === 'login' 
                      ? 'bg-violet-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    mode === 'register' 
                      ? 'bg-violet-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-200">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-violet-500 focus:ring-violet-500/20 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                {/* Username Field (Register only) */}
                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-200">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Choose a username"
                        className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-violet-500 focus:ring-violet-500/20 backdrop-blur-sm"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-200">
                      Password
                    </label>
                    {mode === 'register' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-gray-400 hover:text-gray-300 transition-colors">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="bg-gray-900 border-gray-700 text-white p-3 max-w-xs">
                            <div className="space-y-2 text-xs">
                              <div className="font-medium mb-2">Password Requirements:</div>
                              <PasswordRequirement met={passwordStrength.hasLength} text="At least 8 characters" />
                              <PasswordRequirement met={passwordStrength.hasUpper} text="One uppercase letter" />
                              <PasswordRequirement met={passwordStrength.hasLower} text="One lowercase letter" />
                              <PasswordRequirement met={passwordStrength.hasNumber} text="One number" />
                              <PasswordRequirement met={passwordStrength.hasSpecial} text="One special character" />
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
                      className="pl-12 pr-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-violet-500 focus:ring-violet-500/20 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Register only) */}
                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-200">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className="pl-12 pr-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-violet-500 focus:ring-violet-500/20 backdrop-blur-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Remember Me / Terms */}
                <div className="flex items-center justify-between">
                  {mode === 'login' ? (
                    <label className="flex items-center space-x-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="rounded border-white/20 bg-white/10 text-violet-500 focus:ring-violet-500/20"
                      />
                      <span>Remember me</span>
                    </label>
                  ) : (
                    <label className="flex items-start space-x-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={handleInputChange}
                        className="mt-1 rounded border-white/20 bg-white/10 text-violet-500 focus:ring-violet-500/20"
                        required
                      />
                      <span className="leading-relaxed">
                        I agree to the Terms of Service and Privacy Policy
                      </span>
                    </label>
                  )}
                  
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading || (mode === 'register' && !formData.acceptTerms)}
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-semibold py-4 h-14 transition-all duration-300 disabled:opacity-50 group shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-3">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
