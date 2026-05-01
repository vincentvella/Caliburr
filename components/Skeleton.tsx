import { useEffect, useRef } from 'react';
import { View, Animated, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pulsing placeholder block. Wraps a view that animates its opacity between
 * 0.5 and 1.0 to indicate loading. Sized via className/style by the caller.
 */
export function Skeleton({ className, style }: Props) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={className ?? 'bg-oat-200 dark:bg-ristretto-700 rounded'}
    />
  );
}
