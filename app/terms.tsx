import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const SUPPORT_URL = 'https://caliburr.coffee/support';
const PRIVACY_URL = 'https://caliburr.coffee/privacy';

const EFFECTIVE_DATE = 'April 7, 2026';

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

function InlineLink({ children, url }: { children: string; url: string }) {
  return (
    <Text
      className="text-harvest-400 font-semibold"
      onPress={() => WebBrowser.openBrowserAsync(url)}
    >
      {children}
    </Text>
  );
}

function SupportLink({ children }: { children: string }) {
  return (
    <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} className="mb-3">
      <Text className="text-harvest-400 font-semibold underline text-sm">{children}</Text>
    </TouchableOpacity>
  );
}

export default function TermsOfServiceScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Service — Caliburr' }} />
      <ScrollView className="flex-1 bg-ristretto-950">
        <View className="max-w-2xl w-full self-center px-6 pt-16 pb-24">
          {/* Header */}
          <Text className="text-latte-100 text-3xl font-bold mb-1">Terms of Service</Text>
          <Text className="text-latte-700 text-sm mb-12">
            Caliburr — Last updated {EFFECTIVE_DATE}
          </Text>

          <P>
            Welcome to Caliburr. By creating an account or using the app, you agree to these Terms
            of Service. Please read them carefully. If you do not agree, do not use the service.
          </P>

          <Section title="The Service">
            <P>
              Caliburr is a community-driven database for coffee brews and equipment. It lets you
              log and share espresso and brew dials, discover settings from other users, and
              contribute to a shared library of grinder and machine data.
            </P>
            <P>
              We reserve the right to modify, suspend, or discontinue any part of the service at any
              time with or without notice.
            </P>
          </Section>

          <Section title="Your Account">
            <Li>You must be at least 13 years old to use Caliburr.</Li>
            <Li>
              You are responsible for keeping your account credentials secure. Do not share your
              password.
            </Li>
            <Li>You are responsible for all activity that occurs under your account.</Li>
            <Li>
              You must provide a valid email address. We use it solely to authenticate you — see our{' '}
              <InlineLink url={PRIVACY_URL}>Privacy Policy</InlineLink> for details.
            </Li>
          </Section>

          <Section title="User Content">
            <P>
              You retain ownership of the content you submit — brews, notes, and equipment entries.
              By submitting content, you grant Caliburr a worldwide, royalty-free licence to store,
              display, and distribute it to other users of the service.
            </P>
            <P>
              When you delete your account, your brews and equipment entries are{' '}
              <Strong>anonymised</Strong> rather than deleted — the association with your account is
              removed but the data remains in the community database. This preserves dial-in
              information for other users.
            </P>
            <P>You are responsible for ensuring the content you submit is accurate and your own.</P>
          </Section>

          <Section title="Community Guidelines">
            <P>You agree not to:</P>
            <Li>Submit false or deliberately misleading equipment specifications or brew data.</Li>
            <Li>
              Abuse the verification system — verifying equipment you have not personally used.
            </Li>
            <Li>Use the app to harass, impersonate, or harm other users.</Li>
            <Li>
              Attempt to access, modify, or disrupt any part of the service or its infrastructure.
            </Li>
            <Li>Use automated scripts or bots to interact with the service.</Li>
            <P className="mt-2">
              We reserve the right to remove content or terminate accounts that violate these
              guidelines, at our sole discretion.
            </P>
          </Section>

          <Section title="Equipment Verification">
            <P>
              The community verification system (5 unique user confirmations) is intended to surface
              accurate equipment data. Verified equipment becomes read-only. We do not guarantee the
              accuracy of any community-submitted or verified data — use it as a starting point, not
              a substitute for your own dialling in.
            </P>
          </Section>

          <Section title="Intellectual Property">
            <P>
              The Caliburr name, logo, and app design are our intellectual property. You may not
              reproduce or use them without our written permission.
            </P>
            <P>
              Community-contributed brew and equipment data is owned by its respective contributors
              and shared under the licence described in the User Content section above.
            </P>
            <P>
              Equipment image URLs submitted by users link to third-party content. Caliburr does not
              own, host, or claim any rights to those images. By submitting an image URL, you
              confirm you have permission to share it. We will remove links to infringing content
              upon request.
            </P>
          </Section>

          <Section title="Disclaimers">
            <P>
              Caliburr is provided <Strong>&quot;as is&quot;</Strong> without warranties of any
              kind. We do not guarantee that the service will be uninterrupted, error-free, or that
              any brew data will produce a specific result in your cup.
            </P>
            <P>
              Coffee outcomes depend on many variables beyond grind setting — water quality,
              freshness, machine condition, and technique. Community data is a starting point, not a
              guarantee.
            </P>
          </Section>

          <Section title="Caliburr Backer Subscription">
            <P>
              Caliburr Backer is an optional, auto-renewing subscription available on monthly and
              annual plans. Payment is charged to your Apple ID account at confirmation of purchase.
            </P>
            <Li>
              Subscriptions automatically renew unless cancelled at least 24 hours before the end of
              the current period.
            </Li>
            <Li>
              Your account will be charged for renewal within 24 hours prior to the end of the
              current period at the rate of your selected plan.
            </Li>
            <Li>
              You can manage or cancel your subscription at any time in your App Store account
              settings. Cancellation takes effect at the end of the current billing period — you
              retain backer status until then.
            </Li>
            <Li>
              Backer status (badge and perks) is tied to an active subscription. Status is removed
              when the subscription expires.
            </Li>
            <P>
              Caliburr Backer grants cosmetic benefits only. No core features of the app are locked
              behind the subscription.
            </P>
          </Section>

          <Section title="Limitation of Liability">
            <P>
              To the maximum extent permitted by law, Caliburr and its operators shall not be liable
              for any indirect, incidental, special, or consequential damages arising from your use
              of the service or reliance on community-contributed data.
            </P>
          </Section>

          <Section title="Termination">
            <P>
              You may delete your account at any time from{' '}
              <Strong>Profile → Account Settings → Delete Account</Strong>.
            </P>
            <P>
              We may suspend or terminate your account if you violate these terms. Upon termination,
              your right to use the service ceases immediately. The anonymisation policy for your
              content applies as described in the User Content section.
            </P>
          </Section>

          <Section title="Changes to These Terms">
            <P>
              We may update these terms from time to time. We will notify you of significant changes
              by updating the date at the top of this page. Continued use of the app after changes
              constitutes acceptance of the updated terms.
            </P>
          </Section>

          {/* Contact */}
          <View className="mt-4 p-6 bg-ristretto-900 border border-ristretto-800 rounded-xl">
            <Text className="text-latte-100 text-base font-semibold mb-2">Contact</Text>
            <P>If you have questions about these terms:</P>
            <SupportLink>Open support form</SupportLink>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
