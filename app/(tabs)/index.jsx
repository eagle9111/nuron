import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fetchArticles, searchArticles } from "../../API";
import { AIChat } from "../../components/AIChat";
import { BlurLoadingGrid } from "../../components/BlurLoading";
import { useThemeStore } from "../../zustand/useThemeStore";

 const ArticlesPage = () => {
  const { colors } = useThemeStore();
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadData = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }
      const data = await fetchArticles(reset ? 1 : page);
      if (reset) {
        setArticles(data);
      } else {
        // Deduplicate
        setArticles(prev => {
          const all = [...prev, ...data];
          return Array.from(new Map(all.map(i => [i.date, i])).values());
        });
      }
      setHasMore(data.length > 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, []);

  const onEndReached = () => {
    if (!loading && hasMore && !searching) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (page > 1) loadData(false);
  }, [page]);

  const handleSearch = async (text) => {
    setSearch(text);
    if (text.trim().length === 0) {
      loadData(true);
      return;
    }
    setSearching(true);
    try {
      const results = await searchArticles(text);
      setArticles(results);
      setHasMore(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  if (loading && articles.length === 0) {
    return (
      <View className="flex-1 p-4" style={{ backgroundColor: colors.background }}>
        <BlurLoadingGrid />
      </View>
    );
  }

  return (
    <View className="flex-1 p-4" style={{ backgroundColor: colors.background }}>
<View className="flex-row items-center rounded-xl px-3 py-2 mb-4 shadow-sm" style={{ backgroundColor: colors.card }}>
  <Ionicons name="search-outline" size={20} color={colors.text + "70"} />
  <TextInput
    placeholder="Search the cosmos..."
    placeholderTextColor={colors.text + "50"}
    value={search}
    onChangeText={handleSearch}
    className="flex-1 ml-2 text-base"
    style={{ color: colors.text }}
  />
  {searching && <ActivityIndicator size="small" color={colors.text} style={{ marginLeft: 6 }} />}
  {search.length > 0 && !searching && (
    <TouchableOpacity onPress={() => handleSearch("")}>
      <Ionicons name="close-circle" size={20} color={colors.text + "70"} />
    </TouchableOpacity>
  )}
</View>

      <FlatList
        data={articles}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#667eea"]} tintColor="#667eea" />
        }
        ListFooterComponent={() =>
          hasMore && !loading ? (
            <ActivityIndicator size="small" color={colors.text} style={{ marginVertical: 10 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="w-[48%] mb-4 rounded-xl overflow-hidden shadow-sm"
            style={{ backgroundColor: colors.card }}
            onPress={() => router.push({ pathname: "../articles/id", params: { item: JSON.stringify(item) } })}
          >
            <Image source={{ uri: item.url }} className="w-full h-32" resizeMode="cover" />
            <View className="p-3">
              <Text numberOfLines={2} className="font-semibold text-sm leading-5" style={{ color: colors.text }}>
                {item.title}
              </Text>
              <Text numberOfLines={1} className="text-xs mt-1" style={{ color: colors.text, opacity: 0.6 }}>
                {item.date}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <AIChat />
    </View>
  );
}
export default ArticlesPage;