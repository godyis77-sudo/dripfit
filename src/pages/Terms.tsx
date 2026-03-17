import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import BottomTabBar from '@/components/BottomTabBar';

const Terms = () => {
  const navigate = useNavigate();
  usePageTitle('Terms of Service');

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground" aria-label="Go back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[15px] font-bold text-foreground">Terms of Service</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-4">Last updated: March 2026</p>

        <p className="text-sm text-foreground/90 mb-6 leading-relaxed">
          Welcome to DripFitCheck. By accessing or using our application, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>

        <Accordion type="multiple" className="space-y-1">
          <AccordionItem value="acceptance" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              1. Acceptance of Terms
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>By creating an account or using DripFitCheck, you agree to these Terms and our Privacy Policy. If you do not agree, you may not use the service.</p>
              <p>We may update these Terms from time to time. Continued use after changes constitutes acceptance of the updated Terms.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="account" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              2. Your Account
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
              <p>You must provide accurate information during registration and keep it up to date. You must be at least 13 years old to use the service.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="service" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              3. Use of the Service
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>DripFitCheck provides AI-powered body measurement analysis, virtual try-on previews, and community fit feedback. These features are provided "as is" for informational and entertainment purposes.</p>
              <p>You agree not to:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Use the service for any unlawful purpose.</li>
                <li>Upload content that is offensive, harmful, or infringes on others' rights.</li>
                <li>Attempt to reverse-engineer, scrape, or interfere with the service.</li>
                <li>Create multiple accounts to circumvent usage limits.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              4. User Content
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>You retain ownership of photos and content you upload. By posting content publicly (e.g., Style Check posts), you grant DripFitCheck a non-exclusive, worldwide license to display that content within the app.</p>
              <p>We reserve the right to remove content that violates these Terms or our community guidelines without prior notice.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="accuracy" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              5. Accuracy &amp; Disclaimers
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>Body measurements and size recommendations are AI-generated estimates and may not be perfectly accurate. Virtual try-on previews are approximations and actual fit, drape, and color may vary.</p>
              <p>DripFitCheck is not liable for purchasing decisions made based on our recommendations. We encourage you to check retailer return policies.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              6. Premium Subscriptions
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>Premium features are available via paid subscriptions processed through Stripe. Subscriptions auto-renew unless cancelled before the current period ends.</p>
              <p>Free trial periods, if offered, will convert to a paid subscription at the end of the trial unless cancelled. Refund requests are handled on a case-by-case basis.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="termination" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              7. Termination
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>You may delete your account at any time from Settings. This permanently removes all your data, including scans, posts, and preferences.</p>
              <p>We may suspend or terminate your account if you violate these Terms, with or without notice.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="liability" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              8. Limitation of Liability
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
              <p>To the maximum extent permitted by law, DripFitCheck shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</p>
              <p>Our total liability shall not exceed the amount you paid us in the 12 months prior to the claim.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contact" className="border-border/50">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              9. Contact Us
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground/80 leading-relaxed">
              If you have questions about these Terms, please contact us at <span className="text-primary font-medium">legal@dripfitcheck.com</span>.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Terms;
