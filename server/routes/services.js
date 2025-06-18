import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Mock services data - in a real app this would come from a database
const mockServices = [
  {
    id: 'penetration-testing',
    name: 'Penetration Testing',
    description: 'Comprehensive security assessments to identify vulnerabilities in your infrastructure before attackers do.',
    status: 'available',
    category: 'Security Assessment',
    icon: 'shield-check',
    features: ['Network Testing', 'Web Application Testing', 'Mobile App Testing', 'Detailed Reports'],
    pricing: 'Starting at $2,500',
    estimatedTime: '2-4 weeks'
  },
  {
    id: 'vulnerability-scanning',
    name: 'Vulnerability Scanning',
    description: 'Automated and manual scanning to discover security weaknesses across your digital assets.',
    status: 'available', 
    category: 'Security Assessment',
    icon: 'bug',
    features: ['Automated Scanning', 'Manual Testing', 'Priority Ranking', 'Remediation Guidance'],
    pricing: 'Starting at $800',
    estimatedTime: '1-2 weeks'
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Auditing',
    description: 'Ensure your organization meets industry standards and regulatory requirements.',
    status: 'available',
    category: 'Compliance',
    icon: 'clipboard-check',
    features: ['ISO 27001', 'SOC 2', 'GDPR Compliance', 'Industry Standards'],
    pricing: 'Starting at $3,500',
    estimatedTime: '3-6 weeks'
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    description: 'Expert assistance when security incidents occur, minimizing damage and recovery time.',
    status: 'coming-soon',
    category: 'Emergency Response',
    icon: 'shield-alert',
    features: ['24/7 Response', 'Forensic Analysis', 'Recovery Planning', 'Post-Incident Review'],
    pricing: 'Contact for pricing',
    estimatedTime: 'Immediate response'
  },
  {
    id: 'security-training',
    name: 'Security Training',
    description: 'Comprehensive training programs to educate your team on cybersecurity best practices.',
    status: 'coming-soon',
    category: 'Education',
    icon: 'graduation-cap',
    features: ['Custom Curricula', 'Hands-on Labs', 'Phishing Simulations', 'Certification Prep'],
    pricing: 'Starting at $1,200',
    estimatedTime: '1-4 weeks'
  },
  {
    id: 'managed-security',
    name: 'Managed Security',
    description: 'Ongoing security monitoring and management for continuous protection.',
    status: 'coming-soon',
    category: 'Managed Services',
    icon: 'monitor',
    features: ['24/7 Monitoring', 'Threat Detection', 'Response Management', 'Monthly Reports'],
    pricing: 'Starting at $5,000/month',
    estimatedTime: 'Ongoing service'
  }
];

// Get all services
router.get('/', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Services retrieved successfully',
      services: mockServices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve services',
      error: error.message
    });
  }
});

// Get specific service by ID
router.get('/:serviceId', authenticateToken, (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = mockServices.find(s => s.id === serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service retrieved successfully',
      service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve service',
      error: error.message
    });
  }
});

// Mock dashboard stats endpoint
router.get('/stats/dashboard', authenticateToken, (req, res) => {
  try {
    // Mock dynamic stats that would normally come from real data
    const stats = {
      securityStatus: 'secure',
      activeMonitors: 247 + Math.floor(Math.random() * 20) - 10, // Slight variation
      responseTime: (0.2 + Math.random() * 0.3).toFixed(1) + 's', // 0.2-0.5s
      uptime: (99.95 + Math.random() * 0.05).toFixed(2) + '%', // 99.95-100%
      threatsPrevented: 1247 + Math.floor(Math.random() * 50),
      lastScanTime: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(), // Last hour
      vulnerabilitiesFound: Math.floor(Math.random() * 5), // 0-4 vulnerabilities
      complianceScore: 95 + Math.floor(Math.random() * 5) // 95-99%
    };
    
    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats',
      error: error.message
    });
  }
});

export default router;