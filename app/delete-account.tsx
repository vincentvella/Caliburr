import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';

const SUPPORT_EMAIL = 'support@caliburr.coffee';

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

function EmailLink() {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request`)}
      className="mb-3"
    >
      <Text className="text-harvest-400 font-semibold underline text-sm">{SUPPORT_EMAIL}</Text>
    </TouchableOpacity>
  );
}

export default function DeleteAccountScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Delete Your Account — Caliburr' }} />
      <ScrollView className="flex-1 bg-ristretto-950">
        <View className="max-w-2xl w-full self-center px-6 pt-16 pb-24">
          <Text className="text-latte-100 text-3xl font-bold mb-1">Delete Your Account</Text>
          <Text className="text-latte-700 text-sm mb-12">
            Caliburr — account and data deletion
          </Text>

          <P>
            You can delete your Caliburr account at any time. There are two ways to do it:
          </P>

          <Section title="Option 1 — Delete from inside the app">
            <P>
              <Strong>Recommended.</Strong> The fastest way, and you don&apos;t have to wait for us
              to act on a request.
            </P>
            <Li>Open the Caliburr app and sign in.</Li>
            <Li>
              Go to the <Strong>Profile</Strong> tab.
            </Li>
            <Li>
              Scroll to the bottom and tap <Strong>Delete Account</Strong>.
            </Li>
            <Li>Confirm in the dialog that appears.</Li>
            <P className="mt-2">
              Your account is deleted immediately. You will be signed out and your account is
              removed from our authentication system within seconds.
            </P>
          </Section>

          <Section title="Option 2 — Email us">
            <P>
              If you can&apos;t access the app — for example, you&apos;ve uninstalled it or lost
              access to your sign-in email — send a deletion request to:
            </P>
            <EmailLink />
            <P>
              From the email address associated with your Caliburr account. Subject line:{' '}
              <Strong>Account deletion request</Strong>. We will verify the request, delete your
              account, and confirm via reply within 7 business days.
            </P>
          </Section>

          <Section title="What gets deleted">
            <Li>
              <Strong>Your account credentials</Strong> — email, password, and authentication
              session are removed from our authentication system.
            </Li>
            <Li>
              <Strong>Your profile</Strong> — handle, avatar, and any personal settings.
            </Li>
            <Li>
              <Strong>Your equipment list</Strong> — your &quot;My Gear&quot; entries (which
              grinders and brew machines you own).
            </Li>
            <Li>
              <Strong>Your upvotes</Strong> and <Strong>recipe edit history</Strong>.
            </Li>
            <Li>
              <Strong>Your &quot;Tried this&quot; entries</Strong> — the worked/didn&apos;t-work
              signals you submitted on others&apos; recipes are removed.
            </Li>
            <Li>
              <Strong>Your push tokens</Strong> — you stop receiving notifications immediately.
            </Li>
          </Section>

          <Section title="What is retained">
            <P>
              The following <Strong>community-contributed data</Strong> is retained in
              anonymised form so other users continue to benefit from it:
            </P>
            <Li>
              <Strong>Recipes you submitted</Strong> — kept in the public recipe database with
              your authorship anonymised. The recipe data itself (grind setting, dose, yield,
              ratio, brew method) remains available.
            </Li>
            <Li>
              <Strong>Equipment you contributed</Strong> — community-verified grinders and brew
              machines stay in the catalogue with creator attribution removed.
            </Li>
            <P className="mt-2">
              If you require these contributions to be removed entirely rather than anonymised,
              please mention this in your email to {SUPPORT_EMAIL}.
            </P>
          </Section>

          <Section title="Retention timeline">
            <P>
              Anonymised contributions (above) are retained indefinitely as part of the community
              dataset. Backups containing your personal data are purged within 30 days of
              deletion.
            </P>
          </Section>

          <Section title="Questions?">
            <P>
              For anything related to your data or this process, contact us at:
            </P>
            <EmailLink />
          </Section>
        </View>
      </ScrollView>
    </>
  );
}
