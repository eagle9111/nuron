import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../zustand/useThemeStore';

export async function fetchFavoriteVideos() {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection');
    }
    
    const storedFavorites = await AsyncStorage.getItem('nasa_favorites');
    const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];
    
    if (favoriteIds.length === 0) {
      return { videos: [], hasMore: false };
    }

    const batchSize = 3;
    const videoResults = [];
    
    for (let i = 0; i < favoriteIds.length; i += batchSize) {
      const batch = favoriteIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (nasaId) => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          );
          
          const metadataUrl = `https://images-api.nasa.gov/search?q=${nasaId}&media_type=video`;
          const metadataRes = await Promise.race([
            fetch(metadataUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'NASA-App/1.0'
              }
            }),
            timeoutPromise
          ]);
          
          if (!metadataRes.ok) {
            return null;
          }
          
          const metadataData = await metadataRes.json();
          const item = metadataData.collection?.items?.[0];
          
          if (!item) {
            return null;
          }
          
          const firstData = item.data?.[0];
          if (!firstData) {
            return null;
          }

          const assetUrl = `https://images-api.nasa.gov/asset/${nasaId}`;
          const assetRes = await Promise.race([
            fetch(assetUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'NASA-App/1.0'
              }
            }),
            timeoutPromise
          ]);
          
          if (!assetRes.ok) {
            return null;
          }
          
          const assetData = await assetRes.json();
          const files = assetData?.collection?.items || [];

          const mp4Files = files.filter(f => {
            if (!f.href) return false;
            const href = f.href.toLowerCase();
            return href.includes('.mp4') && 
                   !href.includes('.srt') && 
                   !href.includes('.vtt') &&
                   href.startsWith('http');
          });

          if (mp4Files.length === 0) {
            return null;
          }

          let selectedVideo = null;
          const qualityPreferences = [
            ['small', 'preview', '240', '360'],
            ['medium', '480', '720'],
            ['orig', 'original', 'large'],
            ['']
          ];
          
          for (const qualityGroup of qualityPreferences) {
            selectedVideo = mp4Files.find(f => {
              const url = f.href.toLowerCase();
              return qualityGroup.some(quality => url.includes(quality));
            });
            if (selectedVideo) break;
          }
          
          if (!selectedVideo) {
            selectedVideo = mp4Files[0];
          }

          if (!selectedVideo.href || !selectedVideo.href.startsWith('http')) {
            return null;
          }

          const testResponse = await Promise.race([
            fetch(selectedVideo.href, { method: 'HEAD' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('URL test timeout')), 5000))
          ]).catch(() => null);

          if (!testResponse || !testResponse.ok) {
            return null;
          }

          return {
            id: firstData.nasa_id,
            title: firstData.title?.substring(0, 60) || "NASA Video",
            description: firstData.description?.substring(0, 100) || "",
            video_url: selectedVideo.href,
            date_created: firstData.date_created || "",
            center: firstData.center || "NASA",
            keywords: firstData.keywords?.slice(0, 3) || [],
          };
        } catch  {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      videoResults.push(...batchResults.filter(Boolean));
      
      if (i + batchSize < favoriteIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return {
      videos: videoResults,
      hasMore: false 
    };
  } catch {
    return { videos: [], hasMore: false };
  }
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const HEADER_HEIGHT = 0;
const TAB_HEIGHT = 0;
const VIDEO_HEIGHT = screenHeight - HEADER_HEIGHT - TAB_HEIGHT;

const LoadingSkeleton = () => (
  <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="bg-black justify-center items-center">
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

const VideoPlayer = ({ videoUrl, isActive, index, shouldPlay }) => {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const initTimeoutRef = useRef(null);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    if (!isMountedRef.current) return;
    
    try {
      playerRef.current = player;
      player.loop = true;
      player.muted = false;
      player.volume = 0.8;
      
      player.addListener('playingChange', (playingState) => {
        if (!isMountedRef.current) return;
        const playing = typeof playingState === 'object' ? playingState.isPlaying : playingState;
        isPlayingRef.current = playing;
      });

      player.addListener('statusChange', (status) => {
        if (!isMountedRef.current) return;
        
        if (status.error) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        
        if (status.status === 'readyToPlay' || status.isLoaded) {
          setIsLoading(false);
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
          }
          initTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setIsPlayerReady(true);
            }
          }, 150);
        }
      });

      player.addListener('playToEnd', () => {
        if (isMountedRef.current && player.loop) {
          player.currentTime = 0;
        }
      });

      initTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && !isPlayerReady && !hasError) {
          setHasError(true);
          setIsLoading(false);
        }
      }, 10000);
      
    } catch  {
      setHasError(true);
      setIsLoading(false);
    }
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (playerRef.current) {
        try {
          if (playerRef.current.playing) {
            playerRef.current.pause();
          }
        } catch {
        }
      }
    };
  }, [index]);

  useEffect(() => {
    if (!isPlayerReady || hasError || !player || !isMountedRef.current) {
      return;
    }

    const controlPlayback = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMountedRef.current || !player) return;

        if (isActive && shouldPlay) {
          if (!isPlayingRef.current && typeof player.play === 'function') {
            await player.play();
          }
        } else {
          if (typeof player.pause === 'function') {
            player.pause();
            if (!isActive && typeof player.currentTime !== 'undefined') {
              player.currentTime = 0;
            }
          }
        }
      } catch {
      }
    };

    const timer = setTimeout(controlPlayback, 100);
    return () => clearTimeout(timer);
  }, [isActive, shouldPlay, isPlayerReady, hasError, player, index]);

  if (isLoading && !hasError) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-white text-sm mt-2">Loading Video...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Ionicons name="warning-outline" size={32} color="#EF4444" />
        <Text className="text-white text-sm mt-2">Video Unavailable</Text>
        <Text className="text-gray-400 text-xs mt-1 text-center px-4">
          This video cannot be played at the moment
        </Text>
      </View>
    );
  }

  return (
    <VideoView
      style={{ width: '100%', height: '100%' }}
      player={player}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      contentFit="contain"
      showsTimecodes={false}
      nativeControls={false}
    />
  );
};

const FavoriteShorts = () => {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [error, setError] = useState(null);
  const [networkState, setNetworkState] = useState(null);

  const flatListRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const scrollTimeout = useRef(null);
  const playbackTimeout = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState(state);
      if (!state.isConnected && videos.length === 0) {
        setError('No internet connection');
      }
    });

    return () => unsubscribe();
  }, [videos.length]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('nasa_favorites');
      if (storedFavorites) {
        const favoritesArray = JSON.parse(storedFavorites);
        setFavorites(new Set(favoritesArray));
      }
    } catch  {
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      const favoritesArray = Array.from(newFavorites);
      await AsyncStorage.setItem('nasa_favorites', JSON.stringify(favoritesArray));
    } catch  {
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        setIsPlaying(false);
      } else if (appState.current.match(/background/) && nextAppState === 'active') {
        if (playbackTimeout.current) {
          clearTimeout(playbackTimeout.current);
        }
        playbackTimeout.current = setTimeout(() => {
          setIsPlaying(true);
        }, 300);
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (networkState && !networkState.isConnected) {
        setError('No internet connection');
        setVideos([]);
        return;
      }
      
      const { videos: newVideos } = await fetchFavoriteVideos();
      
      if (newVideos.length === 0) {
        setVideos([]);
        setCurrentIndex(0);
      } else {
        setVideos(newVideos);
        setCurrentIndex(0);
        
        if (playbackTimeout.current) {
          clearTimeout(playbackTimeout.current);
        }
        playbackTimeout.current = setTimeout(() => {
          setIsPlaying(true);
        }, 600);
      }
      
    } catch (e) {
      setError(e.message || 'Failed to load videos');
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [networkState]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFavorite = useCallback(async (videoId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(videoId)) {
        newFavorites.delete(videoId);
      } else {
        newFavorites.add(videoId);
      }
      
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);

  const handleShare = useCallback(async (video) => {
    try {
      const shareContent = {
        message: Platform.OS === 'ios' 
          ? `Check out this amazing NASA video: "${video.title}" 🚀\n\n${video.description}\n\nFrom: ${video.center}` 
          : `Check out this amazing NASA video: "${video.title}" 🚀\n\n${video.description}\n\nFrom: ${video.center}\n\nVideo: ${video.video_url}`,
        url: Platform.OS === 'ios' ? video.video_url : undefined,
        title: `NASA: ${video.title}`
      };

      await Share.share(shareContent, {
        dialogTitle: 'Share NASA Video',
        subject: `NASA: ${video.title}`
      });
    } catch {
    }
  }, []);

  const handleScroll = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.y / VIDEO_HEIGHT);
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);
        
        setIsPlaying(false);
        if (playbackTimeout.current) {
          clearTimeout(playbackTimeout.current);
        }
        playbackTimeout.current = setTimeout(() => {
          setIsPlaying(true);
        }, 200);
      }
    }, 100);
  }, [currentIndex, videos.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const mostVisible = viewableItems.reduce((prev, current) => {
        return (current.percentVisible > prev.percentVisible) ? current : prev;
      });
      
      const newIndex = mostVisible.index;
      
      if (newIndex !== null && newIndex !== undefined && 
          newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length &&
          mostVisible.percentVisible > 70) { 
        
        setCurrentIndex(newIndex);
        
        setIsPlaying(false);
        if (playbackTimeout.current) {
          clearTimeout(playbackTimeout.current);
        }
        playbackTimeout.current = setTimeout(() => {
          setIsPlaying(true);
        }, 200);
      }
    }
  }, [currentIndex, videos.length]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear().toString();
  };

  const renderVideoItem = ({ item, index }) => (
    <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="relative bg-black">
      <View className="flex-1 justify-center items-center">
        <VideoPlayer
          videoUrl={item.video_url}
          isActive={index === currentIndex}
          index={index}
          shouldPlay={isPlaying && index === currentIndex}
        />
      </View>

      <TouchableOpacity
        className="absolute inset-0 justify-center items-center"
        onPress={togglePlayPause}
        activeOpacity={1}
      >
        {!isPlaying && index === currentIndex && (
          <View className="w-16 h-16 bg-black/60 rounded-full items-center justify-center">
            <Ionicons name="play" size={24} color="white" style={{ marginLeft: 2 }} />
          </View>
        )}
      </TouchableOpacity>

      <View className="absolute right-4 bottom-20 space-y-3">
        <TouchableOpacity onPress={togglePlayPause} activeOpacity={0.8}>
          <View className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/30">
            <Ionicons 
              name={isPlaying && index === currentIndex ? "pause" : "play"} 
              size={18} 
              color="white"
              style={(!isPlaying || index !== currentIndex) ? { marginLeft: 1 } : {}}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => toggleFavorite(item.id)} activeOpacity={0.8}>
          <View className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/30">
            <Ionicons 
              name={favorites.has(item.id) ? "heart" : "heart-outline"} 
              size={18} 
              color={favorites.has(item.id) ? "#EF4444" : "white"}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleShare(item)} activeOpacity={0.8}>
          <View className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/30">
            <Ionicons name="share-outline" size={18} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View className="absolute bottom-0 left-0 right-16 px-4 pb-6">
        <View className="bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8">
          <Text className="text-white font-bold text-lg mb-2 leading-tight">
            {item.title}
          </Text>
          
          <Text className="text-gray-300 text-sm leading-relaxed mb-3">
            {item.description}
          </Text>
          
          <View className="flex-row items-center flex-wrap gap-2">
            <View className="bg-blue-600 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {item.center}
              </Text>
            </View>
            
            {item.date_created && (
              <View className="bg-gray-700 rounded-full px-3 py-1">
                <Text className="text-gray-300 text-xs">
                  {formatDate(item.date_created)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="justify-center items-center bg-black px-6">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Ionicons name="cloud-offline" size={48} color="#9CA3AF" />
        <Text className="text-white text-lg font-bold mt-3 mb-2">Connection Error</Text>
        <Text className="text-gray-400 text-center mb-4 text-sm">
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => loadVideos()}
          className="bg-blue-600 px-6 py-3 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0 && !loading) {
    return (
      <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="justify-center items-center bg-black px-6">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Ionicons name="heart-dislike" size={48} color="#9CA3AF" />
        <Text className="text-white text-lg font-bold mt-3 mb-2">No Favorites Yet</Text>
        <Text className="text-gray-400 text-center mb-4 text-sm">
          Tap the heart icon on any video to save it to your favorites
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-600 px-6 py-3 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Browse Videos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="bg-black flex-1">
      <StatusBar barStyle="light-content" backgroundColor="black" />

      <SafeAreaView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 10,
          paddingHorizontal: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full"
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(data, index) => ({
          length: VIDEO_HEIGHT,
          offset: VIDEO_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 75,
          minimumViewTime: 300,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
        decelerationRate="fast"
        snapToInterval={VIDEO_HEIGHT}
        snapToAlignment="start"
        bounces={false}
        style={{ flex: 1 }}
      />
    </View>
  );
};

export default FavoriteShorts;