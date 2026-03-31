import {
  View,
  Text,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useRef, useCallback, useEffect, useState } from "react";
import type { AdjustmentType } from "@/lib/types";

interface GrindTapeProps {
  value: string;
  onChange: (v: string) => void;
  adjustmentType: AdjustmentType | null;
  /** Only relevant for micro_stepped — how many sub-steps exist between each whole number */
  stepsPerUnit?: number | null;
  /** Only relevant for stepless — physical min/max of the grinder's range */
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
    case "stepped":
      // Integer clicks, e.g. Comandante: 0–40 clicks
      return {
        step:        1,
        min:         rangeMin,
        max:         rangeMax,
        pxPerTick:   22,
        majorEvery:  10,
        mediumEvery:  5,
        formatValue: (ticks: number) => String(Math.round(rangeMin + ticks)),
      };

    case "micro_stepped": {
      // Numbered positions with N sub-steps each, e.g. 1Zpresso JX-Pro (10/number)
      const n         = stepsPerUnit;
      const pxPerTick = Math.max(8, Math.round(100 / n));
      const decimals  = n >= 10 ? 1 : n >= 5 ? 1 : 0;
      return {
        step:        1 / n,
        min:         rangeMin,
        max:         rangeMax,
        pxPerTick,
        majorEvery:  n,
        mediumEvery: n >= 4 ? Math.round(n / 2) : n,
        formatValue: (ticks: number) => (rangeMin + ticks / n).toFixed(decimals),
      };
    }

    default: {
      // Stepless: smooth 0.1-precision scroll, e.g. Niche Zero
      return {
        step:        0.1,
        min:         rangeMin,
        max:         rangeMax,
        pxPerTick:   20,
        majorEvery:  10,
        mediumEvery:  5,
        formatValue: (ticks: number) => (rangeMin + ticks * 0.1).toFixed(1),
      };
    }
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
  const scrollRef    = useRef<ScrollView>(null);
  const scrolling    = useRef(false);
  const hasMomentum  = useRef(false);
  const [displayValue, setDisplayValue] = useState(value);

  const n    = stepsPerUnit ?? 10;
  const rMin = rangeMin ?? 0;
  const rMax = adjustmentType === "stepped"
    ? (rangeMax ?? 60)
    : adjustmentType === "micro_stepped"
    ? (rangeMax ?? 10)
    : (rangeMax ?? 15);
  const cfg   = getTapeConfig(adjustmentType, n, rMin, rMax);
  const TICKS = Math.round((cfg.max - cfg.min) / cfg.step);
  const SIDE   = Math.round(SCREEN_WIDTH / 2);

  // ── Coordinate helpers ──────────────────────────────────────────────────────

  function valueToOffset(v: number): number {
    const ticks = adjustmentType === "micro_stepped"
      ? Math.round((v - rMin) * n)
      : Math.round((v - rMin) / cfg.step);
    return Math.max(0, Math.min(TICKS, ticks)) * cfg.pxPerTick;
  }

  function offsetToValue(offset: number): string {
    const ticks = Math.max(0, Math.min(TICKS, Math.round(offset / cfg.pxPerTick)));
    return cfg.formatValue(ticks);
  }

  // ── Initialise & external sync ──────────────────────────────────────────────

  const numeric   = parseFloat(value);
  const safeValue = isNaN(numeric) ? (adjustmentType === "stepped" ? 10 : 3.0) : numeric;

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: valueToOffset(safeValue), animated: false });
    }, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrolling.current) return;
    const v = parseFloat(value);
    if (!isNaN(v)) {
      setDisplayValue(value);
      scrollRef.current?.scrollTo({ x: valueToOffset(v), animated: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Scroll handlers ─────────────────────────────────────────────────────────

  const handleScroll = useCallback(
    (offset: number) => {
      setDisplayValue(offsetToValue(offset));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adjustmentType, cfg.pxPerTick, TICKS, n]
  );

  const handleScrollEnd = useCallback(
    (offset: number) => {
      scrolling.current = false;
      const v = offsetToValue(offset);
      setDisplayValue(v);
      onChange(v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, adjustmentType, cfg.pxPerTick, TICKS, n]
  );

  const snap = adjustmentType === "stepped" || adjustmentType === "micro_stepped";

  // ── Tick geometry ───────────────────────────────────────────────────────────

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const isMajor  = i % cfg.majorEvery  === 0;
    const isMedium = !isMajor && i % cfg.mediumEvery === 0;
    const height   = isMajor ? 28 : isMedium ? 16 : 7;

    // Label text: always shows the whole-number position
    let label = "";
    if (isMajor) {
      if (adjustmentType === "micro_stepped") {
        label = String(Math.round(rMin + i / n));
      } else if (adjustmentType === "stepped") {
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
      {/* Tape */}
      <View
        className="bg-ristretto-800 border border-ristretto-700 rounded-xl overflow-hidden"
        style={{ height: 72 }}
      >
        {/* Fixed centre cursor */}
        <View
          pointerEvents="none"
          style={{
            position:        "absolute",
            left:            SIDE - 1,
            top:             0,
            bottom:          0,
            width:           2,
            backgroundColor: "#ff9d37",
            zIndex:          10,
          }}
        />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snap ? cfg.pxPerTick : undefined}
          decelerationRate={snap ? "fast" : 0.985}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            scrolling.current   = true;
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
              width:    TICKS * cfg.pxPerTick,
              height:   72,
              position: "relative",
            }}
          >
            {ticks.map(({ i, isMajor, isMedium, height, label }) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left:     i * cfg.pxPerTick - (isMajor ? 1 : 0),
                  top:      8,
                }}
              >
                <View
                  style={{
                    width:           isMajor ? 2 : 1,
                    height,
                    backgroundColor: isMajor ? "#9e8a7a" : isMedium ? "#5e4a3a" : "#3a2a1c",
                  }}
                />
                {isMajor && (
                  <Text
                    style={{
                      color:     "#7a6858",
                      fontSize:  9,
                      lineHeight: 12,
                      marginTop: 3,
                      width:     28,
                      textAlign: "center",
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
          <Text
            className="text-harvest-400 font-bold"
            style={{ fontSize: 28, letterSpacing: 0.5 }}
          >
            {displayValue !== "" ? displayValue : cfg.formatValue(Math.round(TICKS / 4))}
          </Text>
        </View>
        <View className="flex-1">
          <TextInput
            className="bg-ristretto-900 border border-ristretto-700 rounded-xl px-3 py-2.5 text-latte-200 text-sm text-center"
            style={{ lineHeight: undefined }}
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
