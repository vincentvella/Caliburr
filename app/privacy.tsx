import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const SUPPORT_URL = 'https://caliburr.coffee/support';

const EFFECTIVE_DATE = 'April 4, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-latte-100 text-base font-semibold mb-3 pb-2 border-b border-ristretto-800">
        {title}
      </Text>
      {children}
    </View>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-latte-500 text-sm leading-7 mb-3 ${className ?? ''}`}>{children}</Text>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row mb-2 pl-1">
      <Text className="text-latte-700 mr-2.5 mt-0.5">•</Text>
      <Text className="text-latte-500 text-sm leading-7 flex-1">{children}</Text>
    </View>
  );
}

function Strong({ children }: { children: string }) {
  return <Text className="text-latte-300 font-semibold">{children}</Text>;
}

function SupportLink({ children }: { children: string }) {
  return (
    <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} className="mb-3">
      <Text className="text-harvest-400 font-semibold underline text-sm">{children}</Text>
    </TouchableOpacity>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy — Caliburr' }} />
      <ScrollView className="flex-1 bg-ristretto-950">
        <View className="max-w-2xl w-full self-center px-6 pt-16 pb-24">
          {/* Header */}
          <Text className="text-latte-100 text-3xl font-bold mb-1">Privacy Policy</Text>
          <Text className="text-latte-700 text-sm mb-12">
            Caliburr — Last updated {EFFECTIVE_DATE}
          </Text>

          <P>
            Caliburr (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Caliburr
            mobile application. This policy explains what information we collect, how we use it, and
            your rights regarding your data.
          </P>

          <Section title="Information We Collect">
            <P>We collect only what is necessary to provide the service:</P>
            <Li>
              <Strong>Email address</Strong> — used to create and authenticate your account.
              Provided directly by you at sign-up.
            </Li>
            <Li>
              <Strong>User-generated content</Strong> — grind brews, equipment entries (grinders and
              brew machines), upvotes, and verification actions you submit within the app.
            </Li>
            <Li>
              <Strong>Account metadata</Strong> — flags such as onboarding completion status, stored
              in your authentication profile.
            </Li>
            <P className="mt-2">
              We do not collect your location, contacts, camera roll, or any device identifiers. We
              do not run third-party advertising or analytics SDKs.
            </P>
          </Section>

          <Section title="How We Use Your Information">
            <Li>To authenticate you and maintain your account session.</Li>
            <Li>To associate brews and gear entries with your account so you can manage them.</Li>
            <Li>
              To display community-contributed brews and equipment to other users. Brews are
              attributed to your account; if you delete your account, brews are anonymised rather
              than removed so community data is preserved.
            </Li>
            <Li>To process account deletion requests when you initiate them.</Li>
          </Section>

          <Section title="Data Storage and Security">
            <P>
              Your data is stored and processed by Supabase (supabase.com), our backend
              infrastructure provider. Supabase stores data in the United States. Authentication
              tokens are stored securely on-device using the platform&apos;s secure storage APIs and
              are never transmitted beyond what is necessary for authentication.
            </P>
          </Section>

          <Section title="Data Sharing">
            <P>
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes. Your data is shared only with Supabase as our infrastructure
              provider, and only as required to operate the service.
            </P>
          </Section>

          <Section title="Community Content">
            <P>
              Brews and equipment entries you submit are visible to all users of Caliburr as part of
              the community feed. Do not include personal information in brew notes or equipment
              descriptions.
            </P>
            <P>
              We reserve the right to remove content that violates our Terms of Service or that is
              otherwise harmful, misleading, or inappropriate.
            </P>
          </Section>

          <Section title="Account Deletion">
            <P>
              You can delete your account at any time from{' '}
              <Strong>Profile → Account Settings → Delete Account</Strong> within the app. Upon
              deletion:
            </P>
            <Li>Your email address and authentication credentials are permanently removed.</Li>
            <Li>
              Your equipment entries are anonymised — the association with your account is removed
              but the equipment records remain for community use.
            </Li>
            <Li>
              Your brews are anonymised — they remain in the community feed without attribution to
              preserve the dial-in data for other users.
            </Li>
            <Li>Your upvotes and gear collections are permanently deleted.</Li>
          </Section>

          <Section title="Children's Privacy">
            <P>
              You must be at least 13 years old to create a Caliburr account. By creating an
              account, you represent that you are 13 or older.
            </P>
            <P>
              Caliburr is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with
              personal information, please contact us via the link below and we will delete the
              account and associated data promptly.
            </P>
            <SupportLink>Contact us about a privacy concern</SupportLink>
          </Section>

          <Section title="Changes to This Policy">
            <P>
              We may update this policy from time to time. We will notify you of significant changes
              by updating the date at the top of this page. Continued use of the app after changes
              constitutes acceptance of the updated policy.
            </P>
          </Section>

          {/* Contact */}
          <View className="mt-4 p-6 bg-ristretto-900 border border-ristretto-800 rounded-xl">
            <Text className="text-latte-100 text-base font-semibold mb-2">Contact</Text>
            <P>If you have questions or requests regarding your data:</P>
            <SupportLink>Open support form</SupportLink>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
