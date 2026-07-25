import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Animated } from 'react-native';
import { useDispatch } from 'react-redux';
import { bootstrapAuth } from '../redux/authSlice';

const FRAMES = [
  require('../assets/splash-1.png'),
  require('../assets/splash-2.png'),
  require('../assets/splash-3.png'),
  require('../assets/splash-4.png'),
  require('../assets/splash-5.png'),
];

const FRAME_DURATION = 350; // total time per frame (slower, smoother)
const FADE_DURATION = 250;  // how long the crossfade itself takes
const HOLD_ON_LAST_FRAME = 500; // ms to hold on the final logo before finishing

const SplashScreen = ({ onFinish }) => {
  const dispatch = useDispatch();
  const [frameIndex, setFrameIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    dispatch(bootstrapAuth());

    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

    let holdTimer;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= FRAMES.length) {
        clearInterval(timer);
        // hold on the final logo for a beat, then signal navigator to move on
        holdTimer = setTimeout(() => {
          if (onFinish) onFinish();
        }, HOLD_ON_LAST_FRAME);
        return;
      }

      // fade out current frame, swap image, fade back in
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        setFrameIndex(i);
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_DURATION / 2,
          useNativeDriver: true,
        }).start();
      });
    }, FRAME_DURATION);

    return () => {
      clearInterval(timer);
      clearTimeout(holdTimer);
    };
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Image source={FRAMES[frameIndex]} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Fixed light background — splash always shows light mode regardless
    // of the app's theme setting.
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 220,
    height: 220,
  },
});

export default SplashScreen;