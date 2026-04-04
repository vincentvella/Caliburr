import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: '#a89080', fontSize: 15, lineHeight: 26, marginBottom: 12 }}>
      {children}
    </Text>
  );
}

export default function SupportScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('support_requests').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      user_id: user?.id ?? null,
    });

    setSubmitting(false);
    if (insertError) {
      setError('Something went wrong. Please try again or email support@caliburr.coffee directly.');
    } else {
      setSubmitted(true);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Support — Caliburr' }} />
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
          <Text style={{ color: '#f5ede4', fontSize: 32, fontWeight: '700', marginBottom: 6 }}>
            Support
          </Text>
          <Text style={{ color: '#6e5a47', fontSize: 14, marginBottom: 32 }}>
            Caliburr — We usually respond within 24 hours.
          </Text>

          {submitted ? (
            <View
              style={{
                padding: 24,
                backgroundColor: '#16100b',
                borderWidth: 1,
                borderColor: '#2e2017',
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#f5ede4', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                Message received
              </Text>
              <P>Thanks for reaching out. We'll get back to you at {email} as soon as possible.</P>
            </View>
          ) : (
            <>
              <P>
                Have a question, found a bug, or want to report incorrect equipment data? Fill out
                the form below and we'll get back to you.
              </P>

              <View style={{ gap: 12, marginTop: 8 }}>
                <TextInput
                  placeholder="Name"
                  placeholderTextColor="#6e5a47"
                  value={name}
                  onChangeText={setName}
                  style={{
                    backgroundColor: '#16100b',
                    borderWidth: 1,
                    borderColor: '#2e2017',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#f5ede4',
                    fontSize: 15,
                    lineHeight: undefined,
                  }}
                />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#6e5a47"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    backgroundColor: '#16100b',
                    borderWidth: 1,
                    borderColor: '#2e2017',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#f5ede4',
                    fontSize: 15,
                    lineHeight: undefined,
                  }}
                />
                <TextInput
                  placeholder="How can we help?"
                  placeholderTextColor="#6e5a47"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  style={{
                    backgroundColor: '#16100b',
                    borderWidth: 1,
                    borderColor: '#2e2017',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#f5ede4',
                    fontSize: 15,
                    minHeight: 140,
                    textAlignVertical: 'top',
                    lineHeight: undefined,
                  }}
                />

                {error && (
                  <Text style={{ color: '#f87171', fontSize: 14 }}>{error}</Text>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#ff9d37',
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                      Send Message
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View
                style={{
                  marginTop: 40,
                  padding: 20,
                  backgroundColor: '#16100b',
                  borderWidth: 1,
                  borderColor: '#2e2017',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#a89080', fontSize: 14, lineHeight: 22 }}>
                  You can also reach us directly at{' '}
                  <Text style={{ color: '#d4bfaa', fontWeight: '600' }}>
                    support@caliburr.coffee
                  </Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}
