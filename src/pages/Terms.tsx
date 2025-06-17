import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-violet-500/20 rounded-xl">
              <Shield className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AbyssalSecurity</h1>
              <p className="text-violet-400 text-sm">Terms of Service</p>
            </div>
          </div>
          
          <Button asChild variant="outline" className="border-white/20 text-gray-300 hover:text-white">
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Portal</span>
            </Link>
          </Button>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white text-center">
              Terms of Service
            </CardTitle>
            <p className="text-gray-300 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          
          <CardContent className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the AbyssalSecurity client portal ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p>
                AbyssalSecurity provides enterprise cybersecurity services including but not limited to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Security monitoring and threat detection</li>
                <li>Vulnerability assessments and penetration testing</li>
                <li>Security consulting and advisory services</li>
                <li>Incident response and forensic analysis</li>
                <li>Compliance and risk management solutions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
              <p>
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your password</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using our Service, you agree to the collection and use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
              <p>
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Attempt to gain unauthorized access to systems</li>
                <li>Upload malicious content or malware</li>
                <li>Impersonate others or provide false information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive property of AbyssalSecurity and its licensors. The Service is protected by copyright, trademark, and other laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall AbyssalSecurity, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-white/5 p-4 rounded-lg mt-3">
                <p><strong>Email:</strong> legal@abyssalsecurity.com</p>
                <p><strong>Address:</strong> AbyssalSecurity Legal Department</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </section>

            <div className="border-t border-white/20 pt-6 mt-8">
              <p className="text-sm text-gray-400 text-center">
                By continuing to use our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;