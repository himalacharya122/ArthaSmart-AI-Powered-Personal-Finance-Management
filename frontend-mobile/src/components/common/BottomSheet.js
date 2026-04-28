import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Easing,
  Dimensions,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;

// Timings tuned to feel synchronous with the iOS keyboard (~250ms)
// and to make the dark overlay feel "instant" rather than sliding up.
const OVERLAY_IN = 160;
const OVERLAY_OUT = 140;
const SHEET_IN = 260;
const SHEET_OUT = 200;

export function BottomSheet({ 
  visible, 
  onClose, 
  children, 
  sheetBackgroundColor = '#fff',
  topRadius = 24 
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: OVERLAY_IN,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SHEET_IN,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: OVERLAY_OUT,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: SHEET_OUT,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Dark overlay — fades in fast (feels instant) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Sheet container — KAV handles keyboard sync, Animated handles slide-in */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kavWrap}
          pointerEvents="box-none"
          keyboardVerticalOffset={0}
          enabled={true}
        >
          <Animated.View
            style={[
              styles.sheetWrap, 
              { 
                backgroundColor: sheetBackgroundColor,
                borderTopLeftRadius: topRadius,
                borderTopRightRadius: topRadius,
              },
              { transform: [{ translateY }] }
            ]}
            pointerEvents="box-none"
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {children}
            </Pressable>
            
            {/* 
                Bottom filler: This fills the gap below the sheet (e.g. keyboard corners or safe area)
                using the same background color as the sheet. 
            */}
            <View 
              style={{ 
                position: 'absolute', 
                bottom: -1000, 
                left: 0, 
                right: 0, 
                height: 1000, 
                backgroundColor: sheetBackgroundColor,
                zIndex: -1 
              }} 
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kavWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    // Explicitly square bottom so sheet sits flush on top of keyboard / display edge
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
