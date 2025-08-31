import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export const BlurLoadingDetail = ({ colors }) => {
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
    outputRange: [-300, 300],
  });

  const ShimmerOverlay = ({ style }) => (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          transform: [{ translateX }],
        },
        style
      ]}
    />
  );

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View 
        style={{ 
          width: '100%', 
          height: 256, 
          backgroundColor: '#e0e0e0',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <ShimmerOverlay />
      </View>

      <View className="p-4">
        <View 
          className="h-6 mb-3 rounded"
          style={{ 
            backgroundColor: '#d0d0d0', 
            width: '90%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ShimmerOverlay />
        </View>

        <View 
          className="h-4 mb-4 rounded"
          style={{ 
            backgroundColor: '#d8d8d8', 
            width: '30%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ShimmerOverlay />
        </View>

        {Array.from({ length: 4 }, (_, i) => (
          <View 
            key={i}
            className="h-4 mb-2 rounded"
            style={{ 
              backgroundColor: '#d5d5d5', 
              width: i === 3 ? '70%' : '95%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ShimmerOverlay />
          </View>
        ))}
      </View>

      <View className="px-4 mb-4">
        <View 
          className="h-6 mb-4 rounded"
          style={{ 
            backgroundColor: '#d0d0d0', 
            width: '40%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ShimmerOverlay />
        </View>
      </View>

      {Array.from({ length: 3 }, (_, i) => (
        <View 
          key={i}
          className="mx-4 mb-4 p-3 rounded-xl"
          style={{ backgroundColor: colors.card }}
        >
          <View 
            className="h-5 mb-2 rounded"
            style={{ 
              backgroundColor: '#d0d0d0', 
              width: '80%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ShimmerOverlay />
          </View>

          <View 
            className="h-3 mb-3 rounded"
            style={{ 
              backgroundColor: '#d8d8d8', 
              width: '25%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ShimmerOverlay />
          </View>

          {Array.from({ length: 3 }, (_, j) => (
            <View 
              key={j}
              className="h-4 mb-1 rounded"
              style={{ 
                backgroundColor: '#d5d5d5', 
                width: j === 2 ? '60%' : '90%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ShimmerOverlay />
            </View>
          ))}

          <View 
            className="w-full h-48 mt-2 rounded-lg"
            style={{ 
              backgroundColor: '#e0e0e0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ShimmerOverlay />
          </View>
        </View>
      ))}
    </View>
  );
};