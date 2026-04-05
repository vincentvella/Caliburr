import { View, Text, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { AdjustmentType } from '@/lib/types';

interface GrindTapeProps {
  value: string;
  onChange: (v: string) => void;
  adjustmentType: AdjustmentType | null;
  stepsPerUnit?: number | null;
  rangeMin?: number | null;
  rangeMax?: number | null;
}

// ─── Tape configuration ───────────────────────────────────────────────────────

function getTapeConfig(
  adjustmentType: AdjustmentType | null,
  stepsPerUnit: number,
  rangeMin: number,
  rangeMax: number,
) {
  switch (adjustmentType) {
    case 'stepped':
      return {
        step: 1,
        min: rangeMin,
        max: rangeMax,
        pxPerTick: 22,
        majorEvery: 10,
        mediumEvery: 5,
        formatValue: (ticks: number) => String(Math.round(rangeMin + ticks)),
      };

    case 'micro_stepped': {
      const n = stepsPerUnit;
      const pxPerTick = Math.max(8, Math.round(100 / n));
      const decimals = n >= 10 ? 1 : n >= 5 ? 1 : 0;
      return {
        step: 1 / n,
        min: rangeMin,
        max: rangeMax,
        pxPerTick,
        majorEvery: n,
        mediumEvery: n >= 4 ? Math.round(n / 2) : n,
        formatValue: (ticks: number) => (rangeMin + ticks / n).toFixed(decimals),
      };
    }

    default:
      return {
        step: 0.1,
        min: rangeMin,
        max: rangeMax,
        pxPerTick: 20,
        majorEvery: 10,
        mediumEvery: 5,
        formatValue: (ticks: number) => (rangeMin + ticks * 0.1).toFixed(1),
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GrindTape({
  value,
  onChange,
  adjustmentType,
  stepsPerUnit,
  rangeMin,
  rangeMax,
}: GrindTapeProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrolling = useRef(false);
  const hasMomentum = useRef(false);
  const inputFocused = useRef(false);
  const prevConfigRef = useRef<{
    adjustmentType: AdjustmentType | null;
    rMin: number;
    rMax: number;
    n: number;
  } | null>(null);
  const prevSyncValueRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  const n = stepsPerUnit ?? 10;
  const rMin = rangeMin ?? 0;
  const rMax =
    adjustmentType === 'stepped'
      ? (rangeMax ?? 60)
      : adjustmentType === 'micro_stepped'
        ? (rangeMax ?? 10)
        : (rangeMax ?? 15);
  const cfg = useMemo(
    () => getTapeConfig(adjustmentType, n, rMin, rMax),
    [adjustmentType, n, rMin, rMax],
  );
  const TICKS = Math.round((cfg.max - cfg.min) / cfg.step);
  const SIDE = Math.round(SCREEN_WIDTH / 2);
  const snap = adjustmentType === 'stepped' || adjustmentType === 'micro_stepped';

  // ── Coordinate helpers ──────────────────────────────────────────────────────

  const valueToOffset = useCallback(
    (v: number): number => {
      const ticks =
        adjustmentType === 'micro_stepped'
          ? Math.round((v - rMin) * n)
          : Math.round((v - rMin) / cfg.step);
      return Math.max(0, Math.min(TICKS, ticks)) * cfg.pxPerTick;
    },
    [adjustmentType, rMin, n, cfg, TICKS],
  );

  const offsetToValue = useCallback(
    (offset: number): string => {
      const ticks = Math.max(0, Math.min(TICKS, Math.round(offset / cfg.pxPerTick)));
      return cfg.formatValue(ticks);
    },
    [TICKS, cfg],
  );

  // Nearest snapped pixel offset — used to correct position after momentum ends
  function snapOffset(offset: number): number {
    return Math.round(offset / cfg.pxPerTick) * cfg.pxPerTick;
  }

  // ── Re-initialise when grinder config changes ───────────────────────────────

  useEffect(() => {
    const prev = prevConfigRef.current;
    if (
      prev !== null &&
      prev.adjustmentType === adjustmentType &&
      prev.rMin === rMin &&
      prev.rMax === rMax &&
      prev.n === n
    )
      return;
    prevConfigRef.current = { adjustmentType, rMin, rMax, n };
    scrolling.current = false;
    hasMomentum.current = false;
    const parsed = parseFloat(value);
    const offset = isNaN(parsed)
      ? valueToOffset(rMin + (rMax - rMin) * 0.25)
      : valueToOffset(parsed);
    const label = isNaN(parsed) ? offsetToValue(offset) : value;
    setDisplayValue(label);
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [adjustmentType, rMin, rMax, n, value, valueToOffset, offsetToValue]);

  // ── Sync tape when value changes externally (text input) ───────────────────

  useEffect(() => {
    if (scrolling.current || inputFocused.current) return;
    if (value === prevSyncValueRef.current) return;
    prevSyncValueRef.current = value;
    const v = parseFloat(value);
    if (!isNaN(v)) {
      setDisplayValue(value);
      scrollRef.current?.scrollTo({ x: valueToOffset(v), animated: true });
    }
  }, [value, valueToOffset]);

  // ── Scroll handlers ─────────────────────────────────────────────────────────

  function handleScroll(offset: number) {
    setDisplayValue(offsetToValue(offset));
  }

  function handleScrollEnd(offset: number) {
    scrolling.current = false;
    // For stepped modes, correct to the exact tick boundary after momentum
    const corrected = snap ? snapOffset(offset) : offset;
    const v = offsetToValue(corrected);
    setDisplayValue(v);
    onChange(v);
    if (snap && Math.abs(corrected - offset) > 1) {
      scrollRef.current?.scrollTo({ x: corrected, animated: true });
    }
  }

  // ── Tick geometry ───────────────────────────────────────────────────────────

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const isMajor = i % cfg.majorEvery === 0;
    const isMedium = !isMajor && i % cfg.mediumEvery === 0;
    const height = isMajor ? 28 : isMedium ? 16 : 7;

    let label = '';
    if (isMajor) {
      if (adjustmentType === 'micro_stepped') {
        label = String(Math.round(rMin + i / n));
      } else if (adjustmentType === 'stepped') {
        label = String(Math.round(rMin + i));
      } else {
        label = (rMin + i * cfg.step).toFixed(0);
      }
    }

    return { i, isMajor, isMedium, height, label };
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="gap-2">
      <View
        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl overflow-hidden"
        style={{ height: 72 }}
      >
        {/* Fixed centre cursor */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: SIDE - 1,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#ff9d37',
            zIndex: 10,
          }}
        />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          // No snapToInterval — we snap manually after momentum ends so the
          // scroll can carry freely through multiple ticks before settling.
          decelerationRate={0.992}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            scrolling.current = true;
            hasMomentum.current = false;
          }}
          onMomentumScrollBegin={() => {
            hasMomentum.current = true;
          }}
          onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.x)}
          onScrollEndDrag={(e) => {
            if (!hasMomentum.current) handleScrollEnd(e.nativeEvent.contentOffset.x);
          }}
          contentContainerStyle={{ paddingHorizontal: SIDE }}
        >
          <View
            style={{
              width: TICKS * cfg.pxPerTick,
              height: 72,
              position: 'relative',
            }}
          >
            {ticks.map(({ i, isMajor, isMedium, height, label }) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: i * cfg.pxPerTick - (isMajor ? 1 : 0),
                  top: 8,
                }}
              >
                <View
                  style={{
                    width: isMajor ? 2 : 1,
                    height,
                    backgroundColor: isMajor ? '#9e8a7a' : isMedium ? '#5e4a3a' : '#3a2a1c',
                  }}
                />
                {isMajor && (
                  <Text
                    style={{
                      color: '#7a6858',
                      fontSize: 9,
                      lineHeight: 12,
                      marginTop: 3,
                      width: 28,
                      textAlign: 'center',
                      transform: [{ translateX: -13 }],
                    }}
                  >
                    {label}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Value display + manual override */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 items-center">
          <Text className="text-harvest-400 font-bold" style={{ fontSize: 28, letterSpacing: 0.5 }}>
            {displayValue !== '' ? displayValue : cfg.formatValue(Math.round(TICKS / 4))}
          </Text>
        </View>
        <View className="flex-1">
          <TextInput
            className="bg-latte-50 dark:bg-ristretto-900 border border-latte-200 dark:border-ristretto-700 rounded-xl px-3 py-2.5 text-latte-800 dark:text-latte-200 text-sm text-center"
            style={{ lineHeight: undefined }}
            placeholder="or type directly"
            placeholderTextColor="#4a3728"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={onChange}
            onFocus={() => {
              inputFocused.current = true;
            }}
            onBlur={() => {
              inputFocused.current = false;
              const v = parseFloat(value);
              if (!isNaN(v)) {
                setDisplayValue(value);
                scrollRef.current?.scrollTo({
                  x: valueToOffset(v),
                  animated: true,
                });
              }
            }}
          />
        </View>
      </View>
    </View>
  );
}
