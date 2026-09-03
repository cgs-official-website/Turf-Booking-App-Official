import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import useTheme from '../hooks/useTheme';
import { RADIUS } from '../utils/theme';

export function SkeletonItem({ width = '100%', height = 20, borderRadius = RADIUS.md, style }) {
  const { dark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: dark ? '#1E2D42' : '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function TurfCardSkeleton() {
  const { C } = useTheme();

  return (
    <View style={[styles.cardSkeleton, { backgroundColor: C.card, borderColor: C.border }]}>
      <SkeletonItem height={140} borderRadius={RADIUS.lg} />
      <View style={{ padding: 12, gap: 8 }}>
        <SkeletonItem width="60%" height={16} />
        <SkeletonItem width="40%" height={12} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <SkeletonItem width="30%" height={14} />
          <SkeletonItem width="25%" height={14} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSkeleton: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
});
