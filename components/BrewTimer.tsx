import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';

export function BrewTimer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(value ? parseInt(value, 10) : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }

  function stop() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reset() {
    stop();
    setElapsed(0);
    onChange('');
  }

  useEffect(() => {
    if (!running && elapsed > 0) onChange(String(elapsed));
  }, [running, elapsed, onChange]);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <View className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3 gap-3">
      <View className="items-center">
        <Text className="text-harvest-400 font-bold" style={{ fontSize: 48, letterSpacing: 2 }}>
          {mm}:{ss}
        </Text>
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
            className="flex-1 bg-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-100 font-semibold">Stop</Text>
          </TouchableOpacity>
        )}
        {elapsed > 0 && (
          <TouchableOpacity
            onPress={reset}
            className="px-5 border border-ristretto-700 rounded-xl py-3 items-center"
          >
            <Text className="text-latte-500 font-semibold">Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        <Text className="text-latte-600 text-xs">or enter seconds manually:</Text>
        <TextInput
          className="flex-1 bg-ristretto-900 border border-ristretto-800 rounded-lg px-3 py-2 text-latte-300 text-sm"
          style={{ lineHeight: undefined }}
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
