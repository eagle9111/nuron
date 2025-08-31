import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';


export const BlurLoadingCard = ({ width = "48%", height = 128, style = {} }) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    };
    startAnimation();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View 
      className="mb-4 rounded-xl overflow-hidden"
      style={[{ width, backgroundColor: '#f0f0f0' }, style]}
    >
      <View style={{ height, backgroundColor: '#e0e0e0', position: 'relative', overflow: 'hidden' }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            transform: [{ translateX }],
          }}
        />
      </View>
      
      <View className="p-2">
        <View 
          className="h-4 mb-1 rounded"
          style={{ backgroundColor: '#d0d0d0', width: '80%', position: 'relative', overflow: 'hidden' }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
              transform: [{ translateX }],
            }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlurLoadingGrid = ({ numColumns = 2, count = 8 }) => {
  const items = Array.from({ length: count }, (_, i) => i);
  
  return (
    <View className="flex-row flex-wrap justify-between">
      {items.map((item) => (
        <BlurLoadingCard key={item} />
      ))}
    </View>
  );
};