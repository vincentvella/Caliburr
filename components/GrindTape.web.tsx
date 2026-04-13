import { textInputStyle } from '@/lib/styles';
import { View, Text, TextInput } from 'react-native';
import type { AdjustmentType } from '@/lib/types';

interface GrindTapeProps {
  value: string;
  onChange: (v: string) => void;
  adjustmentType: AdjustmentType | null;
  stepsPerUnit?: number | null;
  rangeMin?: number | null;
  rangeMax?: number | null;
}

function getRangeConfig(
  adjustmentType: AdjustmentType | null,
  n: number,
  rMin: number,
  rMax: number,
) {
  if (adjustmentType === 'stepped') {
    return { min: rMin, max: rMax, step: 1, format: (v: number) => String(Math.round(v)) };
  }
  if (adjustmentType === 'micro_stepped') {
    const decimals = n >= 10 ? 1 : n >= 5 ? 1 : 0;
    return { min: rMin, max: rMax, step: 1 / n, format: (v: number) => v.toFixed(decimals) };
  }
  return { min: rMin, max: rMax, step: 0.1, format: (v: number) => v.toFixed(1) };
}

export function GrindTape({
  value,
  onChange,
  adjustmentType,
  stepsPerUnit,
  rangeMin,
  rangeMax,
}: GrindTapeProps) {
  const n = stepsPerUnit ?? 10;
  const rMin = rangeMin ?? 0;
  const rMax =
    adjustmentType === 'stepped'
      ? (rangeMax ?? 60)
      : adjustmentType === 'micro_stepped'
        ? (rangeMax ?? 10)
        : (rangeMax ?? 15);

  const { min, max, step, format } = getRangeConfig(adjustmentType, n, rMin, rMax);

  const numeric = parseFloat(value);
  const sliderValue = isNaN(numeric)
    ? min + (max - min) * 0.25
    : Math.min(max, Math.max(min, numeric));
  const displayValue = isNaN(numeric) ? format(sliderValue) : value;

  return (
    <View className="gap-3">
      {/* Slider */}
      <View className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 pt-5 pb-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(format(parseFloat(e.target.value)))
          }
          style={{
            width: '100%',
            accentColor: '#ff9d37',
            cursor: 'pointer',
            height: 4,
            borderRadius: 2,
          }}
        />
        <View className="flex-row justify-between mt-2">
          <Text className="text-latte-500 dark:text-latte-600 text-xs">{min}</Text>
          <Text className="text-latte-500 dark:text-latte-600 text-xs">{max}</Text>
        </View>
      </View>

      {/* Value display + manual override */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 items-center">
          <Text className="text-harvest-400 font-bold" style={{ fontSize: 28, letterSpacing: 0.5 }}>
            {displayValue}
          </Text>
        </View>
        <View className="flex-1">
          <TextInput
            className="bg-latte-50 dark:bg-ristretto-900 border border-latte-200 dark:border-ristretto-700 rounded-xl px-3 py-2.5 text-latte-800 dark:text-latte-200 text-sm text-center"
            style={textInputStyle}
            placeholder="or type directly"
            placeholderTextColor="#4a3728"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={onChange}
          />
        </View>
      </View>
    </View>
  );
}
