import { textInputStyle } from '@/lib/styles';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { haptics } from '@/lib/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const DIGIT_STYLE = {
  fontSize: 48,
  fontWeight: 'bold',
  color: '#ff9d37',
  lineHeight: 56,
  fontVariant: ['tabular-nums'],
} satisfies import('react-native').TextStyle;

function useSyncOnStop(running: boolean, elapsed: number, onChange: (v: string) => void) {
  useEffect(() => {
    if (!running && elapsed > 0) onChange(String(elapsed));
  }, [running, elapsed, onChange]);
}

function useManagedInterval(running: boolean, onTick: () => void) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => onTickRef.current(), 1000);
    return () => clearInterval(id);
  }, [running]);
}

function useDigitAnimation(value: string) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value === prevValue.current) return;
    prevValue.current = value;
    translateY.value = 14;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 18, stiffness: 450, mass: 0.6 });
    opacity.value = withTiming(1, { duration: 100 });
  }, [value, translateY, opacity]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
}

function AnimatedDigit({ value }: { value: string }) {
  const animatedStyle = useDigitAnimation(value);
  return <Animated.Text style={[DIGIT_STYLE, animatedStyle]}>{value}</Animated.Text>;
}

export function BrewTimer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(value ? parseInt(value, 10) : 0);

  function tick() {
    setElapsed((s) => s + 1);
  }

  function start() {
    haptics.tick();
    setRunning(true);
  }

  function stop() {
    haptics.medium();
    setRunning(false);
  }

  function reset() {
    haptics.tick();
    setRunning(false);
    setElapsed(0);
    onChange('');
  }

  useSyncOnStop(running, elapsed, onChange);
  useManagedInterval(running, tick);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3 gap-3">
      <View className="items-center" style={{ overflow: 'hidden', height: 56 }}>
        <View className="flex-row items-center">
          <AnimatedDigit value={mm[0]} />
          <AnimatedDigit value={mm[1]} />
          <Text style={DIGIT_STYLE}>:</Text>
          <AnimatedDigit value={ss[0]} />
          <AnimatedDigit value={ss[1]} />
        </View>
      </View>

      <View className="flex-row gap-2">
        {!running ? (
          <TouchableOpacity
            onPress={start}
            className="flex-1 bg-harvest-500 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">{elapsed > 0 ? 'Resume' : 'Start'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={stop}
            className="flex-1 bg-oat-200 dark:bg-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-950 dark:text-latte-100 font-semibold">Stop</Text>
          </TouchableOpacity>
        )}
        {elapsed > 0 && (
          <TouchableOpacity
            onPress={reset}
            className="px-5 border border-latte-200 dark:border-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-600 dark:text-latte-500 font-semibold">Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        <Text className="text-latte-500 dark:text-latte-600 text-xs">
          or enter seconds manually:
        </Text>
        <TextInput
          className="flex-1 bg-latte-50 dark:bg-ristretto-900 border border-latte-200 dark:border-ristretto-800 rounded-lg px-3 py-2 text-latte-700 dark:text-latte-300 text-sm"
          style={textInputStyle}
          placeholder="e.g. 28"
          placeholderTextColor="#4a3728"
          keyboardType="number-pad"
          value={elapsed > 0 ? String(elapsed) : ''}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) {
              setElapsed(n);
              stop();
            } else if (!v) {
              setElapsed(0);
              onChange('');
            }
          }}
        />
      </View>
    </View>
  );
}
