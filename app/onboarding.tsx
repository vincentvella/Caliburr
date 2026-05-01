import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { textInputStyle } from '@/lib/styles';
import { useRef, useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { pickAndUploadAvatar } from '@/lib/uploadImage';
import { GrinderModal } from '@/components/equipment/GrinderModal';
import { MachineModal } from '@/components/equipment/MachineModal';
import { EditableAvatar } from '@/components/EditableAvatar';
import * as Sentry from '@sentry/react-native';

type Step = 'welcome' | 'profile' | 'grinder' | 'machine' | 'done';
const STEP_ORDER: Step[] = ['welcome', 'profile', 'grinder', 'machine', 'done'];

async function markOnboardingComplete() {
  await supabase.auth.updateUser({ data: { onboarding_completed: true } });
}

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [grinderModalOpen, setGrinderModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [addedGrinder, setAddedGrinder] = useState(false);
  const [addedMachine, setAddedMachine] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Load the user's current profile (display_name backfilled from email handle)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);
      const { data: profile } = await db
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setDisplayName(profile?.display_name ?? '');
      setAvatarUrl(profile?.avatar_url ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persistProfile(): Promise<boolean> {
    if (!userId) return true;
    const normalized = displayName.trim().toLowerCase();
    if (normalized.length === 0) return true; // no change → just continue
    setSavingProfile(true);
    setNameError(null);
    const { error } = await db
      .from('profiles')
      .update({ display_name: normalized })
      .eq('user_id', userId);
    setSavingProfile(false);
    if (error) {
      if (error.code === '23505') {
        setNameError('That handle is already taken. Try another.');
        return false;
      }
      Sentry.captureException(error, {
        tags: { feature: 'onboarding', stage: 'profile-save' },
      });
      setNameError('Could not save. Please try again.');
      return false;
    }
    setDisplayName(normalized);
    return true;
  }

  async function handlePickAvatar() {
    if (!userId) return;
    setUploadingAvatar(true);
    const url = await pickAndUploadAvatar();
    if (url) {
      const { error } = await db.from('profiles').update({ avatar_url: url }).eq('user_id', userId);
      if (!error) setAvatarUrl(url);
    }
    setUploadingAvatar(false);
  }

  const fadeAnim = useRef(new Animated.Value(1)).current;

  function transition(next: Step) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  async function handleFinish() {
    setFinishing(true);
    await markOnboardingComplete();
    router.replace('/(tabs)');
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  // ─── Per-step content ──────────────────────────────────────────────────────

  const iconProps: Record<
    Step,
    { name: React.ComponentProps<typeof Ionicons>['name']; color: string; containerClass: string }
  > = {
    welcome: { name: 'cafe', color: '#fff', containerClass: 'bg-harvest-500 border-harvest-400' },
    profile: {
      name: 'person-outline',
      color: '#ff9d37',
      containerClass: 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700',
    },
    grinder: {
      name: 'settings-outline',
      color: '#ff9d37',
      containerClass: 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700',
    },
    machine: {
      name: 'cafe-outline',
      color: '#ff9d37',
      containerClass: 'bg-oat-100 dark:bg-ristretto-800 border-latte-200 dark:border-ristretto-700',
    },
    done: {
      name: 'checkmark',
      color: '#86efac',
      containerClass: 'bg-bloom-100 dark:bg-bloom-900 border-bloom-300 dark:border-bloom-700',
    },
  };

  const heading: Record<Step, string> = {
    welcome: 'Caliburr',
    profile: 'Pick a handle',
    grinder: 'Add your grinder',
    machine: 'Add your machine',
    done: addedGrinder || addedMachine ? "You're all set!" : 'Ready to explore',
  };

  const body: Record<Step, string> = {
    welcome:
      'A community brew database for coffee nerds — share and discover grind settings across every bean, brewer, and dial.',
    profile:
      'This is what the community sees on your recipes and tries. Pick a handle and an avatar — you can change them any time from the Account screen.',
    grinder:
      'Your grinder is the foundation of every brew. Adding it now lets you track grind settings and see what the community is dialling in on the same hardware.',
    machine:
      'Got an espresso machine or brewer? Adding it links your brews to your full setup and helps others with the same machine find your dials.',
    done:
      addedGrinder || addedMachine
        ? 'Your gear is saved. Explore what the community is brewing or submit your first dial-in.'
        : 'You can add your gear any time from the Profile tab.',
  };

  const primaryLabel: Record<Step, string> = {
    welcome: 'Get started',
    profile: 'Continue →',
    grinder: addedGrinder ? 'Continue →' : 'Skip for now →',
    machine: addedMachine ? 'Continue →' : 'Skip for now →',
    done: 'Explore brews',
  };

  const { name: iconName, color: iconColor, containerClass } = iconProps[step];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View
      className="flex-1 bg-latte-50 dark:bg-ristretto-900"
      style={{ paddingTop: 72, paddingBottom: 40, paddingHorizontal: 32 }}
    >
      {/* Progress dots — always occupies the same vertical slot */}
      <View
        style={{ height: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
      >
        <Animated.View style={{ opacity: step === 'welcome' ? 0 : 1 }}>
          <AnimatedProgressDots total={4} active={stepIndex - 1} />
        </Animated.View>
      </View>

      {/* Fading content area */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Icon + text */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {step === 'profile' ? (
            <View style={{ marginBottom: 32 }}>
              <EditableAvatar
                size={80}
                email={email}
                displayName={displayName}
                avatarUrl={avatarUrl}
                uploading={uploadingAvatar}
                onPress={handlePickAvatar}
              />
            </View>
          ) : (
            <View
              className={`w-20 h-20 rounded-3xl border items-center justify-center mb-8 ${containerClass}`}
            >
              <Ionicons name={iconName} size={step === 'welcome' ? 40 : 32} color={iconColor} />
            </View>
          )}

          <Text
            className={`text-latte-950 dark:text-latte-100 mb-2 ${step === 'welcome' ? 'font-display-bold' : 'font-display-semibold'}`}
            style={{ fontSize: step === 'welcome' ? 36 : 24 }}
          >
            {heading[step]}
          </Text>

          {step === 'welcome' && (
            <Text className="text-harvest-400 text-base font-medium mb-3">
              Track your grind. Perfect every cup.
            </Text>
          )}

          <Text className="text-latte-600 dark:text-latte-500 text-sm leading-relaxed mb-8">
            {body[step]}
          </Text>

          {/* Handle input — only shown on the profile step */}
          {step === 'profile' && (
            <View className="mb-4">
              <TextInput
                className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4 text-latte-950 dark:text-latte-100 text-base"
                style={[textInputStyle, { height: 56 }]}
                placeholder="your_handle"
                placeholderTextColor="#9c7a5e"
                value={displayName}
                onChangeText={(v) => {
                  setDisplayName(v);
                  if (nameError) setNameError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              {nameError ? (
                <Text className="text-xs mt-2 px-1" style={{ color: '#f87171' }}>
                  {nameError}
                </Text>
              ) : null}
            </View>
          )}

          {/* Gear search row — fixed-height slot shared by grinder + machine steps */}
          <View style={{ height: 56 }}>
            {step === 'grinder' && (
              <TouchableOpacity
                onPress={() => setGrinderModalOpen(true)}
                className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4"
                style={{ height: 56 }}
              >
                <Text
                  className={
                    addedGrinder
                      ? 'text-latte-950 dark:text-latte-100 font-medium'
                      : 'text-latte-700 dark:text-latte-400'
                  }
                >
                  {addedGrinder ? '✓  Grinder added' : 'Search for your grinder'}
                </Text>
                <Ionicons
                  name={addedGrinder ? 'checkmark-circle' : 'chevron-forward'}
                  size={20}
                  color={addedGrinder ? '#86efac' : '#6e5a47'}
                />
              </TouchableOpacity>
            )}
            {step === 'machine' && (
              <TouchableOpacity
                onPress={() => setMachineModalOpen(true)}
                className="flex-row items-center justify-between bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-2xl px-4"
                style={{ height: 56 }}
              >
                <Text
                  className={
                    addedMachine
                      ? 'text-latte-950 dark:text-latte-100 font-medium'
                      : 'text-latte-700 dark:text-latte-400'
                  }
                >
                  {addedMachine ? '✓  Machine added' : 'Search for your machine'}
                </Text>
                <Ionicons
                  name={addedMachine ? 'checkmark-circle' : 'chevron-forward'}
                  size={20}
                  color={addedMachine ? '#86efac' : '#6e5a47'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Buttons — pinned to bottom of fading area */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={async () => {
              if (step === 'welcome') transition('profile');
              else if (step === 'profile') {
                const ok = await persistProfile();
                if (ok) transition('grinder');
              } else if (step === 'grinder') transition('machine');
              else if (step === 'machine') transition('done');
              else handleFinish();
            }}
            disabled={finishing || savingProfile}
            className="bg-harvest-500 rounded-2xl items-center"
            style={{ height: 52 }}
          >
            {(finishing && step === 'done') || (savingProfile && step === 'profile') ? (
              <ActivityIndicator color="#fff" style={{ flex: 1 }} />
            ) : (
              <Text className="text-white font-bold text-base" style={{ lineHeight: 52 }}>
                {primaryLabel[step]}
              </Text>
            )}
          </TouchableOpacity>

          {/* Secondary button slot — fixed height so primary never shifts */}
          <View style={{ height: 52 }}>
            {step === 'done' && (
              <TouchableOpacity
                onPress={async () => {
                  setFinishing(true);
                  await markOnboardingComplete();
                  router.replace('/(tabs)');
                  router.push('/recipe/new');
                }}
                disabled={finishing}
                className="border border-latte-200 dark:border-ristretto-700 rounded-2xl items-center"
                style={{ height: 52 }}
              >
                <Text
                  className="text-latte-700 dark:text-latte-300 font-medium"
                  style={{ lineHeight: 52 }}
                >
                  Submit my first brew
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      <GrinderModal
        visible={grinderModalOpen}
        onClose={() => setGrinderModalOpen(false)}
        onAdded={() => {
          setAddedGrinder(true);
          setGrinderModalOpen(false);
          transition('machine');
        }}
        existingIds={[]}
      />

      <MachineModal
        visible={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        onAdded={() => {
          setAddedMachine(true);
          setMachineModalOpen(false);
          transition('done');
        }}
        existingIds={[]}
      />
    </View>
  );
}

// ─── Animated progress dots ───────────────────────────────────────────────────

function useAnimateDots(active: number, widths: Animated.Value[], fills: Animated.Value[]) {
  useEffect(() => {
    Animated.parallel([
      ...widths.map((w, i) =>
        Animated.spring(w, {
          toValue: i === active ? 20 : 8,
          useNativeDriver: false,
          tension: 180,
          friction: 12,
        }),
      ),
      ...fills.map((f, i) =>
        Animated.timing(f, {
          toValue: i <= active ? 1 : 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ),
    ]).start();
  }, [active, fills, widths]);
}

function AnimatedProgressDots({ total, active }: { total: number; active: number }) {
  const widths = useRef(Array.from({ length: total }, () => new Animated.Value(8))).current;
  const fills = useRef(Array.from({ length: total }, () => new Animated.Value(0))).current;

  useAnimateDots(active, widths, fills);

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {widths.map((width, i) => (
        <Animated.View
          key={i}
          style={{
            height: 8,
            width,
            borderRadius: 4,
            backgroundColor: fills[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['#2e2017', '#ff9d37'],
            }),
          }}
        />
      ))}
    </View>
  );
}
