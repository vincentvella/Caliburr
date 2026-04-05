import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const SUPPORT_URL = 'https://caliburr.coffee/support';

const EFFECTIVE_DATE = 'April 4, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text
        style={{
          color: '#f5ede4',
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#2e2017',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text style={[{ color: '#a89080', fontSize: 15, lineHeight: 26, marginBottom: 12 }, style]}>
      {children}
    </Text>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8, paddingLeft: 4 }}>
      <Text style={{ color: '#6e5a47', marginRight: 10, marginTop: 1 }}>•</Text>
      <Text style={{ color: '#a89080', fontSize: 15, lineHeight: 26, flex: 1 }}>{children}</Text>
    </View>
  );
}

function Strong({ children }: { children: string }) {
  return <Text style={{ color: '#d4bfaa', fontWeight: '600' }}>{children}</Text>;
}

function SupportLink({ children }: { children: string }) {
  return (
    <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} style={{ marginBottom: 12 }}>
      <Text style={{ color: '#ff9d37', fontWeight: '600', textDecorationLine: 'underline', fontSize: 15 }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy — Caliburr' }} />
      <ScrollView style={{ flex: 1, backgroundColor: '#0e0a07' }}>
        <View
          style={{
            maxWidth: 680,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 24,
            paddingTop: 64,
            paddingBottom: 96,
          }}
        >
          {/* Header */}
          <Text style={{ color: '#f5ede4', fontSize: 32, fontWeight: '700', marginBottom: 6 }}>
            Privacy Policy
          </Text>
          <Text style={{ color: '#6e5a47', fontSize: 14, marginBottom: 48 }}>
            Caliburr — Last updated {EFFECTIVE_DATE}
          </Text>

          <P>
            Caliburr ("we", "us", or "our") operates the Caliburr mobile application. This policy
            explains what information we collect, how we use it, and your rights regarding your
            data.
          </P>

          <Section title="Information We Collect">
            <P>We collect only what is necessary to provide the service:</P>
            <Li>
              <Strong>Email address</Strong> — used to create and authenticate your account.
              Provided directly by you at sign-up.
            </Li>
            <Li>
              <Strong>User-generated content</Strong> — grind recipes, equipment entries (grinders
              and brew machines), upvotes, and verification actions you submit within the app.
            </Li>
            <Li>
              <Strong>Account metadata</Strong> — flags such as onboarding completion status,
              stored in your authentication profile.
            </Li>
            <P style={{ marginTop: 8 }}>
              We do not collect your location, contacts, camera roll, or any device identifiers. We
              do not run third-party advertising or analytics SDKs.
            </P>
          </Section>

          <Section title="How We Use Your Information">
            <Li>To authenticate you and maintain your account session.</Li>
            <Li>
              To associate recipes and gear entries with your account so you can manage them.
            </Li>
            <Li>
              To display community-contributed recipes and equipment to other users. Recipes are
              attributed to your account; if you delete your account, recipes are anonymised rather
              than removed so community data is preserved.
            </Li>
            <Li>To process account deletion requests when you initiate them.</Li>
          </Section>

          <Section title="Data Storage and Security">
            <P>
              Your data is stored and processed by Supabase (supabase.com), our backend
              infrastructure provider. Supabase stores data in the United States. Authentication
              tokens are stored securely on-device using the platform's secure storage APIs and are
              never transmitted beyond what is necessary for authentication.
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
              Recipes and equipment entries you submit are visible to all users of Caliburr as part
              of the community feed. Do not include personal information in recipe notes or
              equipment descriptions.
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
            <Li>
              Your email address and authentication credentials are permanently removed.
            </Li>
            <Li>
              Your equipment entries are anonymised — the association with your account is removed
              but the equipment records remain for community use.
            </Li>
            <Li>
              Your recipes are anonymised — they remain in the community feed without attribution
              to preserve the dial-in data for other users.
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
              We may update this policy from time to time. We will notify you of significant
              changes by updating the date at the top of this page. Continued use of the app after
              changes constitutes acceptance of the updated policy.
            </P>
          </Section>

          {/* Contact */}
          <View
            style={{
              marginTop: 16,
              padding: 24,
              backgroundColor: '#16100b',
              borderWidth: 1,
              borderColor: '#2e2017',
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: '#f5ede4',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Contact
            </Text>
            <P>If you have questions or requests regarding your data:</P>
            <SupportLink>Open support form</SupportLink>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
