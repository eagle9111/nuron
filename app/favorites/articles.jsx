import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { fetchArticles } from '../../API';
import { useThemeStore } from '../../zustand/useThemeStore';

const PAGE_SIZE = 10;

const FavoriteArticles = () => {
  const [favorites, setFavorites] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { colors } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('@article_favorites');
      if (stored) {
        const favoriteDates = JSON.parse(stored);

        const allArticles = await fetchArticles(1, 200);
        const favoriteArticles = allArticles.filter(article => 
          favoriteDates.includes(article.date)
        );

        const sorted = favoriteArticles.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setFavorites(sorted);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || displayedCount >= favorites.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => prev + PAGE_SIZE);
      setLoadingMore(false);
    }, 500); 
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.text + '80' }} className="mt-2">Loading more...</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: '/articles/[id]',
          params: { id: item.date, item: JSON.stringify(item) },
        })
      }
      className="flex-row mb-4 rounded-lg overflow-hidden"
      style={{ backgroundColor: colors.card }}
    >
      <Image source={{ uri: item.url }} className="w-20 h-20" resizeMode="cover" />
      <View className="flex-1 justify-center pl-4 py-3">
        <Text style={{ color: colors.text }} className="text-base font-medium" numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 px-4 pt-12 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }} className="mt-4">Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-12" style={{ backgroundColor: colors.background }}>

      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full"
          style={{ backgroundColor: colors.card }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text className="text-xl font-bold" style={{ color: colors.text, marginLeft: -20 }}>
          Favorite Articles
        </Text>

        <TouchableOpacity
          onPress={loadFavorites}
          className="p-2 rounded-full"
          style={{ backgroundColor: colors.card }}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {favorites.length === 0 ? (
        <Text style={{ color: colors.text + '80' }} className="text-center mt-8">
          You havent saved any articles yet.
        </Text>
      ) : (
        <FlatList
          data={favorites.slice(0, displayedCount)}
          keyExtractor={(item) => item.date}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}
export default FavoriteArticles;