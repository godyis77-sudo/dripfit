import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import BottomTabBar from '@/components/BottomTabBar';

const Privacy = () => {
  const navigate = useNavigate();
  usePageTitle('Privacy Policy');

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg text-muted-foreground" aria-label="Go back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-[15px] font-bold text-foreground">Privacy Policy</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-4">Last updated: March 6, 2026</p>

        <p className="text-sm text-foreground/90 mb-6 leading-relaxed">
          DripFitCheck ("we", "us", or "our") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our mobile application and website.
        </p>

        <Accordion type="multiple" className="space-y-1">
          <AccordionItem value="data-collected" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              1. Information We Collect
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p><strong>Account Information:</strong> Email address, display name, and optional Instagram handle when you create an account.</p>
              <p><strong>Body Measurements:</strong> Height, shoulder, chest, bust, waist, hip, sleeve, and inseam measurements derived from photos you submit during the body scan process.</p>
              <p><strong>Photos:</strong> Front and side body photos used for measurement analysis, clothing photos for virtual try-on, and optional profile avatars.</p>
              <p><strong>Usage Data:</strong> Anonymized analytics events such as feature usage, scan completions, and navigation patterns.</p>
              <p><strong>Preferences:</strong> Fit preference (slim/regular/relaxed), favorite retailers, preferred brands, and unit system choice.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="photo-processing" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              2. Photo Processing &amp; Body Scan Data
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>Photos submitted for body scanning are processed by our secure backend AI service to extract body measurements. Key details:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Photos are transmitted over encrypted connections (HTTPS/TLS).</li>
                <li>Body photos are used solely for measurement extraction and are not shared with third parties.</li>
                <li>Extracted measurements are stored in your private profile and are never visible to other users.</li>
                <li>Virtual try-on photos are stored in private, access-controlled storage buckets accessible only to you.</li>
                <li>You may delete all scan data and photos at any time from Settings.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-use" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              3. How We Use Your Data
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>We use your information to:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Provide personalized size recommendations across retailers and brands.</li>
                <li>Generate virtual try-on previews of clothing items.</li>
                <li>Display your community posts to other users (only when you explicitly choose to share).</li>
                <li>Improve our measurement accuracy and recommendation algorithms.</li>
                <li>Send transactional emails related to your account (e.g., password resets).</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-sharing" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              4. Data Sharing &amp; Third Parties
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>We do not sell your personal data. We may share limited data with:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong>Infrastructure providers:</strong> Cloud hosting and database services that process data on our behalf under strict data processing agreements.</li>
                <li><strong>Analytics:</strong> Anonymized, non-personally-identifiable usage metrics.</li>
                <li><strong>Payment processors:</strong> Stripe processes subscription payments; we do not store credit card details.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-retention" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              5. Data Retention &amp; Deletion
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>We retain your data for as long as your account is active. You have the right to:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong>Delete scan data:</strong> Remove all body scan measurements and photos from Settings at any time.</li>
                <li><strong>Delete your account:</strong> Permanently delete your account and all associated data (profiles, posts, scans, photos, preferences) from Settings. This action is irreversible.</li>
                <li><strong>Export your data:</strong> Download a copy of your scan data in JSON format from Settings.</li>
              </ul>
              <p>When you delete your account, we perform a cascading deletion across all database records and remove all files from storage within 30 days.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="security" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              6. Security
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>We implement industry-standard security measures including:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Encryption in transit (TLS 1.2+) and at rest.</li>
                <li>Row-level security policies ensuring users can only access their own data.</li>
                <li>Signed URLs with expiration for private image access.</li>
                <li>Secure authentication with email verification.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="children" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              7. Children's Privacy
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us immediately.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="changes" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              8. Changes to This Policy
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed">
              We may update this policy from time to time. We will notify you of any material changes by posting the updated policy within the app. Your continued use of the app after changes constitutes acceptance of the updated policy.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contact" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              9. Contact Us
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at <span className="text-primary font-medium">privacy@dripfitcheck.com</span>.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Privacy;
