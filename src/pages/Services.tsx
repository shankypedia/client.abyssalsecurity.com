import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Bug, ClipboardCheck, ArrowLeft, ExternalLink, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';

interface Service {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'coming-soon' | 'maintenance';
  category: string;
  icon: string;
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await apiService.getServices();
        if (response.success && response.services) {
          setServices(response.services);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load services. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadServices();
    }
  }, [isAuthenticated, toast]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield-check':
        return Shield;
      case 'bug':
        return Bug;
      case 'clipboard-check':
        return ClipboardCheck;
      default:
        return Shield;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'coming-soon':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'maintenance':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'coming-soon':
        return 'Coming Soon';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  const handleServiceClick = (service: Service) => {
    if (service.status === 'available') {
      toast({
        title: "Service Integration",
        description: `${service.name} integration coming in Month 3!`,
      });
    } else {
      toast({
        title: "Service Unavailable",
        description: `${service.name} is currently ${service.status.replace('-', ' ')}.`,
        variant: "destructive"
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
          <p>Loading services...</p>
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
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCA1MCA0MCBNIDAgMTAgTCA0MCA1MEBNIDY2IDEwIEwgNDUgMzAiIHN0cm9rZT0iIzMxMzE0MSIgc3Ryb2tlLXdpZHRoPSIwLjUiIGZpbGw9Im5vbmUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="relative z-10 p-6">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Available Services</h1>
              <p className="text-gray-400">Explore AbyssalSecurity's cybersecurity services</p>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const IconComponent = getIcon(service.icon);
              const statusColorClass = getStatusColor(service.status);
              
              return (
                <Card 
                  key={service.id} 
                  className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => handleServiceClick(service)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-violet-500/20 rounded-xl">
                          <IconComponent className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{service.name}</CardTitle>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColorClass} mt-2`}>
                            {service.status === 'available' && <Play className="h-3 w-3 mr-1" />}
                            {service.status === 'coming-soon' && <Clock className="h-3 w-3 mr-1" />}
                            {getStatusText(service.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {service.category}
                      </span>
                      {service.status === 'available' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-violet-400 hover:text-violet-300 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {service.status === 'coming-soon' ? 'Soon' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {services.length === 0 && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Services Available</h3>
                <p className="text-gray-400">Services will be available soon. Check back later!</p>
              </CardContent>
            </Card>
          )}

          {/* Information Card */}
          <Card className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <Shield className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Enterprise Security Solutions</h3>
                  <p className="text-gray-300 leading-relaxed">
                    AbyssalSecurity provides comprehensive cybersecurity services designed to protect your 
                    digital infrastructure. Our expert team delivers cutting-edge security assessments, 
                    penetration testing, and compliance auditing to ensure your organization stays protected 
                    against evolving threats.
                  </p>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        toast({
                          title: "Contact Information",
                          description: "For custom enterprise solutions, contact support@abyssalsecurity.com",
                        });
                      }}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Services;