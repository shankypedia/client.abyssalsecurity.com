import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Privacy = () => {
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
              <p className="text-violet-400 text-sm">Privacy Policy</p>
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
              Privacy Policy
            </CardTitle>
            <p className="text-gray-300 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          
          <CardContent className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, use our services, or communicate with us.
              </p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">Personal Information:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username, encrypted passwords)</li>
                <li>Company information and job title</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Technical Information:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>IP addresses and browser information</li>
                <li>Device identifiers and operating system</li>
                <li>Usage data and service interactions</li>
                <li>Security logs and audit trails</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and security alerts</li>
                <li>Respond to comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Detect, investigate, and prevent fraudulent transactions</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing and Disclosure</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy:
              </p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">We may share information:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>With your consent or at your direction</li>
                <li>With service providers who assist in our operations</li>
                <li>To comply with laws, regulations, or legal requests</li>
                <li>To protect rights, property, and safety</li>
                <li>In connection with business transfers or mergers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication requirements</li>
                <li>Employee training on data protection</li>
                <li>Incident response and breach notification procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
              </p>
              <div className="bg-white/5 p-4 rounded-lg mt-3">
                <p><strong>Account Data:</strong> Retained while your account is active</p>
                <p><strong>Security Logs:</strong> Retained for 7 years for compliance</p>
                <p><strong>Communication Records:</strong> Retained for 3 years</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights and Choices</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Access and review your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your personal information</li>
                <li>Object to processing of your personal information</li>
                <li>Request data portability</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Essential cookies for service functionality</li>
                <li>Authentication and security cookies</li>
                <li>Analytics cookies to improve our services</li>
                <li>Preference cookies to remember your settings</li>
              </ul>
              <p className="mt-3">
                You can manage cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Standard contractual clauses</li>
                <li>Adequacy decisions by regulatory authorities</li>
                <li>Other lawful transfer mechanisms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices:
              </p>
              <div className="bg-white/5 p-4 rounded-lg mt-3">
                <p><strong>Email:</strong> privacy@abyssalsecurity.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@abyssalsecurity.com</p>
                <p><strong>Address:</strong> AbyssalSecurity Privacy Office</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </section>

            <div className="border-t border-white/20 pt-6 mt-8">
              <p className="text-sm text-gray-400 text-center">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;