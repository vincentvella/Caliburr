import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRef, useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { GrinderModal } from '@/components/equipment/GrinderModal';
import { MachineModal } from '@/components/equipment/MachineModal';

type Step = 'welcome' | 'grinder' | 'machine' | 'done';
const STEP_ORDER: Step[] = ['welcome', 'grinder', 'machine', 'done'];

async function markOnboardingComplete() {
  await supabase.auth.updateUser({ data: { onboarding_completed: true } });
}

function useSkipIfOnboarded(preview: string | undefined) {
  useEffect(() => {
    if (preview) return;
    checkExistingGear();
  }, [preview]);

  async function checkExistingGear() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_grinders')
      .select('grinder_id')
      .eq('user_id', user.id)
      .limit(1);

    if (data && data.length > 0) {
      await markOnboardingComplete();
      router.replace('/(tabs)');
    }
  }
}

export default function OnboardingScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [step, setStep] = useState<Step>('welcome');
  const [grinderModalOpen, setGrinderModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [addedGrinder, setAddedGrinder] = useState(false);
  const [addedMachine, setAddedMachine] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useSkipIfOnboarded(preview);

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
    grinder: 'Add your grinder',
    machine: 'Add your machine',
    done: addedGrinder || addedMachine ? "You're all set!" : 'Ready to explore',
  };

  const body: Record<Step, string> = {
    welcome:
      'A community brew database for coffee nerds — share and discover grind settings across every bean, brewer, and dial.',
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
          <AnimatedProgressDots total={3} active={stepIndex - 1} />
        </Animated.View>
      </View>

      {/* Fading content area */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Icon + text */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View
            className={`w-20 h-20 rounded-3xl border items-center justify-center mb-8 ${containerClass}`}
          >
            <Ionicons name={iconName} size={step === 'welcome' ? 40 : 32} color={iconColor} />
          </View>

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
            onPress={() => {
              if (step === 'welcome') transition('grinder');
              else if (step === 'grinder') transition('machine');
              else if (step === 'machine') transition('done');
              else handleFinish();
            }}
            disabled={finishing}
            className="bg-harvest-500 rounded-2xl items-center"
            style={{ height: 52 }}
          >
            {finishing && step === 'done' ? (
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
