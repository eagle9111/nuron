import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export async function fetchNasaShortVideos(page = 1, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    const queries = [
      "space video",
      "NASA video", 
      "rocket launch",
      "astronomy video",
      "space mission",
      "satellite deployment",
      "spacewalk",
      "mars rover",
      "ISS video",
      "earth from space"
    ];
    
    const query = queries[Math.floor(Math.random() * queries.length)];
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video&page=${page}`;

    console.log('[NASA] Fetching videos with query:', query, 'URL:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NASA-Mobile-App/1.0',
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timeoutId);

    console.log('[NASA] API Response:', response.status, response.ok);

    if (!response.ok) {
      throw new Error(`NASA API Error: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[NASA] API Data:', { 
      hasCollection: !!data?.collection, 
      itemsCount: data?.collection?.items?.length || 0 
    });

    if (!data?.collection?.items || data.collection.items.length === 0) {
      console.warn('[NASA] No items in API response');
      return { videos: [], hasMore: false };
    }

    const allItems = data.collection.items.slice(0, 50); 
    const sortedItems = allItems.sort((a, b) => {
      const dateA = a.data?.[0]?.date_created ? new Date(a.data[0].date_created) : new Date('2000-01-01');
      const dateB = b.data?.[0]?.date_created ? new Date(b.data[0].date_created) : new Date('2000-01-01');
      return dateB - dateA;
    });

    const validVideos = [];
    
    for (let i = 0; i < Math.min(sortedItems.length, 12); i++) {
      const item = sortedItems[i];
      const firstData = item.data?.[0];
      if (!firstData?.nasa_id) continue;

      const description = firstData.description?.toLowerCase() || '';
      const title = firstData.title?.toLowerCase() || '';
      
      const isLongContent = description.includes('documentary') ||
                           description.includes('full mission') ||
                           description.includes('complete coverage') ||
                           description.includes('full length') ||
                           description.includes('entire') ||
                           title.includes('documentary') ||
                           title.includes('full mission') ||
                           title.includes('complete coverage') ||
                           title.includes('full length');
      
      if (isLongContent) continue;

      try {
        const assetController = new AbortController();
        const assetTimeoutId = setTimeout(() => assetController.abort(), 10000);
        
        const assetUrl = `https://images-api.nasa.gov/asset/${firstData.nasa_id}`;
        console.log('[NASA] Fetching asset for:', firstData.nasa_id, 'Asset URL:', assetUrl);
        
        const assetRes = await fetch(assetUrl, { 
          signal: assetController.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NASA-Mobile-App/1.0',
            'Cache-Control': 'no-cache'
          }
        });
        clearTimeout(assetTimeoutId);
        
        if (!assetRes.ok) {
          console.warn('[NASA] Asset fetch failed:', assetRes.status, firstData.nasa_id);
          continue;
        }

        const assetData = await assetRes.json();
        const files = assetData?.collection?.items || [];

        const mp4Files = files.filter(f => {
          if (!f.href || typeof f.href !== 'string') return false;
          const href = f.href.toLowerCase();
          return href.includes('.mp4') && 
                 !href.includes('.srt') && 
                 !href.includes('.vtt') &&
                 (href.startsWith('https://') || href.startsWith('http://'));
        });

        if (mp4Files.length === 0) {
          console.warn('[NASA] No valid MP4 files found for:', firstData.nasa_id);
          continue;
        }

        let selectedVideo = null;
        const qualityPreferences = [
          ['small', 'preview', '240p', '360p'],
          ['medium', '480p'],
          ['720p'],
          ['orig', 'original', 'large']
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

        const secureUrl = selectedVideo.href.replace("http://", "https://");
        console.log('[NASA] Selected video:', {
          id: firstData.nasa_id,
          url: secureUrl,
          title: firstData.title?.substring(0, 60)
        });

        const videoData = {
          id: firstData.nasa_id,
          title: firstData.title?.substring(0, 60) || "NASA Video",
          description: firstData.description?.substring(0, 100) || "",
          video_url: secureUrl,
          date_created: firstData.date_created || "",
          center: firstData.center || "NASA",
          keywords: firstData.keywords?.slice(0, 3) || [],
        };
        
        console.log('[NASA] Video data:', videoData);

        validVideos.push(videoData);
        
        if (validVideos.length >= 6) break; 
        
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn('[NASA] Error processing video asset:', error.message);
        continue;
      }
    }

    console.log('[NASA] Valid videos found:', validVideos.length);

    return {
      videos: validVideos,
      hasMore: validVideos.length >= 3 && page < 8
    };
  } catch (error) {
    console.error('[NASA] API Error:', error.message, { page, retryCount });
    
    if (retryCount < MAX_RETRIES && error.name !== 'AbortError') {
      console.log('[NASA] Retrying API call...', retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); 
      return fetchNasaShortVideos(page, retryCount + 1);
    }
    
    return { videos: [], hasMore: false };
  }
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const TAB_HEIGHT = 85;
const VIDEO_HEIGHT = screenHeight - HEADER_HEIGHT - TAB_HEIGHT;

const LoadingSkeleton = () => (
  <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="bg-black justify-center items-center">
    <ActivityIndicator size="large" color="#3B82F6" />
    <Text className="text-white text-sm mt-4">Loading NASA Videos...</Text>
  </View>
);

const VideoPlayer = ({ videoUrl, isActive, index, shouldPlay }) => {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const playerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Video player initialized:', { index, videoUrl: videoUrl.substring(0, 50) + '...' });
      
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
        
        console.log('Video status change:', { index, status: status.status, error: !!status.error });
        
        if (status.error || status.status === 'error') {
          console.error('Video player error:', status.error);
          setHasError(true);
          return;
        }
        
        if (status.status === 'readyToPlay' || status.isLoaded) {
          console.log('Video ready to play:', index);
          setIsPlayerReady(true);
        }
      });

      setTimeout(() => {
        if (isMountedRef.current && !hasError) {
          setIsPlayerReady(true);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Video player setup error:', error);
      setHasError(true);
    }
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.pause();
        } catch (error) {
          console.warn('Error pausing video:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlayerReady || hasError || !player || !isMountedRef.current) {
      return;
    }

    const controlPlayback = async () => {
      try {
        if (!isMountedRef.current || !player) return;

        if (isActive && shouldPlay) {
          if (!isPlayingRef.current) {
            console.log('Starting video playback:', index);
            await player.play();
          }
        } else {
          player.pause();
          if (!isActive) {
            player.currentTime = 0;
          }
        }
      } catch (error) {
        console.error('Video playback control error:', error);
      }
    };

    const timer = setTimeout(controlPlayback, 100);
    return () => clearTimeout(timer);
  }, [isActive, shouldPlay, isPlayerReady, hasError, player]);

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Ionicons name="warning-outline" size={32} color="#EF4444" />
        <Text className="text-white text-sm mt-2">Video Unavailable</Text>
      </View>
    );
  }

  if (!isPlayerReady) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="small" color="#3B82F6" />
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

const NasaShorts = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatListRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const scrollTimeout = useRef(null);
  const favoritesSyncRef = useRef(false);

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
      favoritesSyncRef.current = true;
    } catch (error) {
      console.warn('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (favoritesSet) => {
    if (!favoritesSyncRef.current) return;
    
    try {
      const favoritesArray = Array.from(favoritesSet);
      await AsyncStorage.setItem('nasa_favorites', JSON.stringify(favoritesArray));
    } catch (error) {
      console.warn('Error saving favorites:', error);
    }
  };

  useEffect(() => {
    if (favoritesSyncRef.current) {
      saveFavorites(favorites);
    }
  }, [favorites]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state change:', nextAppState);
      
      if (appState.current.match(/active/) && nextAppState === 'background') {
        setIsPlaying(false);
      } else if (appState.current.match(/background/) && nextAppState === 'active') {
        setTimeout(() => {
          setIsPlaying(true);
        }, 300);
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const loadVideos = useCallback(async (pageNum = 1, reset = false) => {
    try {
      console.log('Loading videos:', { pageNum, reset });
      
      if (pageNum === 1 && !reset) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const { videos: newVideos, hasMore: moreAvailable } = await fetchNasaShortVideos(pageNum);
      
      console.log('Videos loaded:', { count: newVideos.length, hasMore: moreAvailable });
      
      if (newVideos.length === 0 && pageNum === 1) {
        throw new Error('No videos found. Please check your internet connection.');
      }
      
      if (reset) {
        setVideos(newVideos);
        setCurrentIndex(0);
        setTimeout(() => {
          setIsPlaying(true);
        }, 500);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }
      
      setHasMore(moreAvailable);
      setError(null);
    } catch (e) {
      console.error('Error loading videos:', e);
      setError(e.message);
      if (pageNum === 1) setVideos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    console.log('Refreshing videos');
    setRefreshing(true);
    setPage(1);
    loadVideos(1, true);
  }, [loadVideos]);

  useEffect(() => {
    console.log('Initial video load');
    loadVideos(1, true);
  }, [loadVideos]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFavorite = useCallback(async (videoId) => {
    if (!favoritesSyncRef.current) return;
    
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(videoId)) {
        newFavorites.delete(videoId);
      } else {
        newFavorites.add(videoId);
      }
      return newFavorites;
    });
  }, []);

  const handleShare = useCallback(async (video) => {
    try {
      const shareContent = {
        message: Platform.OS === 'ios' 
          ? `Check out this amazing NASA video: "${video.title}"\n\n${video.description}\n\nFrom: ${video.center}` 
          : `Check out this amazing NASA video: "${video.title}"\n\n${video.description}\n\nFrom: ${video.center}\n\nVideo: ${video.video_url}`,
        url: Platform.OS === 'ios' ? video.video_url : undefined,
        title: `NASA: ${video.title}`
      };

      await Share.share(shareContent, {
        dialogTitle: 'Share NASA Video',
        subject: `NASA: ${video.title}`
      });
    } catch (error) {
      console.warn('Share error:', error);
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
        setTimeout(() => {
          setIsPlaying(true);
        }, 200);
      }
    }, 150);
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
        setTimeout(() => {
          setIsPlaying(true);
        }, 200);
      }
    }
  }, [currentIndex, videos.length]);

  const loadMoreVideos = useCallback(() => {
    if (!loadingMore && hasMore && videos.length > 0) {
      console.log('Loading more videos, page:', page + 1);
      const nextPage = page + 1;
      setPage(nextPage);
      loadVideos(nextPage, false);
    } else {
      console.log('Cannot load more:', { loadingMore, hasMore, videosLength: videos.length });
    }
  }, [loadingMore, hasMore, page, loadVideos, videos.length]);

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
    };
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && videos.length === 0) {
    return (
      <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="justify-center items-center bg-black px-6">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text className="text-white text-lg font-bold mt-3 mb-2">Connection Error</Text>
        <Text className="text-gray-400 text-center mb-4 text-sm">{error}</Text>
        <TouchableOpacity
          onPress={() => loadVideos(1, true)}
          className="bg-blue-600 px-6 py-3 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ height: VIDEO_HEIGHT, width: screenWidth }} className="bg-black">
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
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
          waitForInteraction: false
        }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.3}
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
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default NasaShorts;