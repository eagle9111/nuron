import { OrbitControls, useGLTF } from '@react-three/drei/native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, TapGestureHandler } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { nasaModels } from '../../nasamodels';
import { useThemeStore } from '../../zustand/useThemeStore';

// Refresh icon component
function RefreshIcon({ size = 20, color = '#FFF' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color, fontSize: size - 4, fontWeight: 'bold' }}>↻</Text>
    </View>
  );
}

function CubeLoader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#0066CC" wireframe />
    </mesh>
  );
}

function Model({ url, refreshKey, onRefresh }) {
  const { scene, error: gltfError } = useGLTF(url);
  const ref = useRef();
  const [hasError, setHasError] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const processingTimeoutRef = useRef(null);

  // Auto-refresh on any error
  const triggerRefresh = useCallback(() => {
    console.log('Model error detected, triggering refresh...');
    setHasError(true);
    if (onRefresh) {
      setTimeout(onRefresh, 100);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (gltfError) {
      console.warn('GLTF loading error:', gltfError);
      triggerRefresh();
    }
  }, [gltfError, triggerRefresh]);

  useEffect(() => {
    if (!scene || isProcessed || hasError) return;

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      try {
        if (ref.current) {
          while (ref.current.children.length > 0) {
            ref.current.remove(ref.current.children[0]);
          }

          let sceneToAdd = scene;
          
          try {
            sceneToAdd = scene.clone();
            
            const box = new THREE.Box3().setFromObject(sceneToAdd);
            if (box && box.min && box.max && 
                typeof box.min.x === 'number' && typeof box.max.x === 'number') {
              
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              
              if (center && size && 
                  typeof center.x === 'number' && typeof size.x === 'number') {
                sceneToAdd.position.sub(center);
                
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0 && maxDim < 1000) {
                  const scale = 2.5 / maxDim;
                  if (scale > 0.001 && scale < 100) {
                    sceneToAdd.scale.setScalar(scale);
                  }
                }
              }
            }
          } catch (processingError) {
            console.warn('Scene processing failed, using original:', processingError);
            sceneToAdd = scene; 
          }

          ref.current.add(sceneToAdd);
          setIsProcessed(true);
        }
      } catch (error) {
        console.warn('Model processing error:', error);
        triggerRefresh();
      }
    }, 200);
  }, [scene, refreshKey, isProcessed, hasError, triggerRefresh]);

  useEffect(() => {
    setIsProcessed(false);
    setHasError(false);
  }, [refreshKey]);

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  if (hasError || gltfError) {
    return <CubeLoader />;
  }

  if (!scene) {
    return <CubeLoader />;
  }

  return <group ref={ref} />;
}

const CameraController = forwardRef(({ refreshKey, onRefresh }, ref) => {
  const { camera } = useThree();
  const orbitControlsRef = useRef();
  const errorCount = useRef(0);
  const maxErrors = 3; 

  const triggerRefresh = useCallback(() => {
    errorCount.current++;
    console.warn(`Camera error ${errorCount.current}/${maxErrors}, triggering refresh...`);
    
    if (errorCount.current >= maxErrors && onRefresh) {
      errorCount.current = 0;
      setTimeout(onRefresh, 100);
    }
  }, [onRefresh]);

  const safeResetCamera = useCallback(() => {
    try {
      if (camera) {
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);
        
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0);
          orbitControlsRef.current.update();
        }
      }
    } catch (error) {
      console.warn('Camera reset error:', error);
      triggerRefresh();
    }
  }, [camera, triggerRefresh]);

  useEffect(() => {
    let animationId;
    let frameCount = 0;

    const monitorCamera = () => {
      try {
        frameCount++;
        
        if (frameCount % 60 === 0 && camera) {
          if (!camera.position || 
              typeof camera.position.x !== 'number' || 
              !isFinite(camera.position.x)) {
            throw new Error('Invalid camera position');
          }
        }
        
        animationId = requestAnimationFrame(monitorCamera);
      } catch (error) {
        console.warn('Camera monitoring error:', error);
        triggerRefresh();
      }
    };

    const timeoutId = setTimeout(monitorCamera, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [camera, triggerRefresh, refreshKey]);

  useEffect(() => {
    errorCount.current = 0;
  }, [refreshKey]);

  useImperativeHandle(ref, () => ({
    resetCamera: safeResetCamera
  }));

  try {
    return (
      <OrbitControls
        key={`orbit-controls-${refreshKey}`}
        ref={orbitControlsRef}
        enableRotate={true}
        enableZoom={true}
        enablePan={false}
        zoomSpeed={0.6}
        minDistance={1.5}
        maxDistance={8}
        target={[0, 0, 0]}
        rotateSpeed={0.5}
        dampingFactor={0.1}
        enableDamping={true}
      />
    );
  } catch (error) {
    console.warn('OrbitControls creation error:', error);
    triggerRefresh();
    return null;
  }
});
CameraController.displayName = "CameraController";

function Lighting() {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[0, 10, 0]} intensity={0.3} />
    </group>
  );
}

function ErrorOverlay({ onRetry, onGoBack, message }) {
  return (
    <View className="absolute inset-0 bg-black/90 justify-center items-center p-8 z-50">
      <Text className="text-white text-xl font-bold mb-4">Model failed to load</Text>
      {message ? (
        <Text className="text-red-400 text-sm mb-6 text-center" numberOfLines={3}>
          {typeof message === 'string' ? message : 'An error occurred while loading the model'}
        </Text>
      ) : null}
      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={onRetry}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onGoBack}
          className="bg-gray-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-bold">Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ModelViewer = () => {
  const { id, title, modelUrl } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useThemeStore();
  const [retryKey, setRetryKey] = useState(0);
  const [error, setError] = useState(null);
  const cameraControllerRef = useRef();
  const autoRefreshTimeoutRef = useRef(null);
  const refreshCount = useRef(0);
  const maxRefreshes = 1000; 

  const modelData = useMemo(() => {
    try {
      return nasaModels?.find(m => m.id === id);
    } catch (error) {
      console.warn('Error finding model data:', error);
      return null;
    }
  }, [id]);

  const finalModelUrl = useMemo(
    () =>
      modelUrl ||
      modelData?.modelUrl ||
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
    [modelUrl, modelData]
  );

  const finalTitle = title || modelData?.title || '3D Model';
  const isDark = colors?.background === '#121212';

  const handleGoBack = useCallback(() => {
    try {
      router.back();
    } catch (error) {
      console.warn('Error navigating back:', error);
    }
  }, [router]);

  // Main refresh function that handles all errors
  const handleRefresh = useCallback(() => {
    try {
      refreshCount.current++;
      
      if (refreshCount.current > maxRefreshes) {
        console.warn('Max refreshes reached, stopping auto-refresh');
        setError({ message: 'Model failed to load after multiple attempts' });
        return;
      }

      console.log(`Refreshing model (attempt ${refreshCount.current}/${maxRefreshes})`);
      
      // Clear any pending refreshes
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
      
      // Reset states
      setRetryKey(k => k + 1);
      setError(null);
      
      // Reset camera after a delay
      setTimeout(() => {
        try {
          if (cameraControllerRef.current && cameraControllerRef.current.resetCamera) {
            cameraControllerRef.current.resetCamera();
          }
        } catch (error) {
          console.warn('Error resetting camera after refresh:', error);
        }
      }, 300);
      
    } catch (error) {
      console.warn('Error in refresh function:', error);
      setError({ message: 'Refresh failed' });
    }
  }, []);

  const handleRetry = useCallback(() => {
    refreshCount.current = 0; // Reset refresh counter on manual retry
    handleRefresh();
  }, [handleRefresh]);

  const handleModelError = useCallback((error) => {
    console.warn('Model loading error:', error);
    setError(error);
  }, []);

  // Global error boundary - catch any unhandled errors and refresh
  useEffect(() => {
    const handleGlobalError = (error) => {
      console.warn('Global error caught, triggering refresh:', error);
      if (refreshCount.current < maxRefreshes) {
        handleRefresh();
      }
    };

    // Set up global error handlers
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      // Check if error is related to our 3D rendering
      const errorMsg = args.join(' ').toLowerCase();
      if (errorMsg.includes('cannot read property') && errorMsg.includes("'x'")) {
        handleGlobalError(args[0]);
      }
    };

    return () => {
      console.error = originalConsoleError;
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, [handleRefresh]);

  // Reset refresh counter when component mounts or URL changes
  useEffect(() => {
    refreshCount.current = 0;
  }, [finalModelUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, []);

  if (!finalModelUrl) {
    handleGoBack();
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TapGestureHandler
        numberOfTaps={2}
        onActivated={handleRefresh}
        maxPointers={2}
      >
        <View className="flex-1 pt-12" style={{ backgroundColor: colors?.background || '#000' }}>
          <View
            className={`flex-row items-center justify-between px-4 py-3 border-b ${
              isDark ? 'border-gray-700' : 'border-gray-300'
            }`}
            style={{ backgroundColor: colors?.header || '#111' }}
          >
            <TouchableOpacity
              onPress={handleGoBack}
              className={`${isDark ? 'bg-gray-700' : 'bg-gray-600'} px-4 py-2 rounded-lg`}
            >
              <Text className="text-white font-bold">Back</Text>
            </TouchableOpacity>

            <Text
              className="flex-1 text-white text-lg font-bold text-center mx-4"
              style={{ color: colors?.text || '#FFF' }}
              numberOfLines={1}
            >
              {finalTitle}
            </Text>

            <TouchableOpacity
              onPress={handleRefresh}
              className={`${isDark ? 'bg-gray-700' : 'bg-gray-600'} px-3 py-2 rounded-lg flex-row items-center`}
              style={{ minWidth: 44 }}
            >
              <RefreshIcon size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 relative">
            <Canvas
              key={`canvas-${retryKey}`}
              camera={{ position: [0, 0, 5], fov: 60 }}
              onCreated={({ gl, camera }) => {
                try {
                  gl.setClearColor(isDark ? '#000' : '#F5F5F5');
                  camera.position.set(0, 0, 5);
                  camera.up.set(0, 1, 0);
                  camera.lookAt(0, 0, 0);
                } catch (error) {
                  console.warn('Canvas onCreated error:', error);
                  handleRefresh();
                }
              }}
              gl={{ 
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: false
              }}
              onError={(error) => {
                console.warn('Canvas error:', error);
                handleRefresh();
              }}
            >
              <Lighting />
              <CameraController 
                ref={cameraControllerRef} 
                refreshKey={retryKey} 
                onRefresh={handleRefresh}
              />
              <Suspense fallback={<CubeLoader />}>
                <Model 
                  url={finalModelUrl} 
                  onError={handleModelError} 
                  refreshKey={retryKey}
                  onRefresh={handleRefresh}
                />
              </Suspense>
            </Canvas>

            {error && (
              <ErrorOverlay
                onRetry={handleRetry}
                onGoBack={handleGoBack}
                colors={colors}
                message={error?.message || error}
              />
            )}
          </View>
        </View>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );
};

export default ModelViewer;