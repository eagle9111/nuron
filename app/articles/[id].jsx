import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from "expo-file-system";
import { getLocales } from 'expo-localization';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { fetchArticles } from "../../API";
import { api_key } from "../../API_KEY";
import { BlurLoadingDetail } from "../../components/BlurLoadingDetail";
import { useThemeStore } from "../../zustand/useThemeStore";

const { width , height } = Dimensions.get('window');

class GeminiService {
  static async makeRequest(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${api_key}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error: ${response.status} → ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
  }

  static async summarize(text) {
    return await this.makeRequest(`Summarize this in 2-3 clear sentences:\n\n${text}`);
  }

  static async translate(text, language) {
    return await this.makeRequest(`Translate this naturally to ${language}:\n\n${text}`);
  }
}

const ArticleDetails = () => {
  const { item } = useLocalSearchParams();
  const { colors } = useThemeStore();
  const router = useRouter();
  const article = item ? JSON.parse(item) : null;

  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [loadingPage, setLoadingPage] = useState(true);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState('');
  const [resultModal, setResultModal] = useState({ visible: false, title: '', content: '' });

  const FAVORITES_KEY = '@article_favorites';

  const getDeviceLanguage = () => {
    const locales = getLocales();
    const languageNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
      'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
    };
    return languageNames[locales[0]?.languageCode] || 'English';
  };

  useEffect(() => {
    if (article?.date) {
      setLoadingPage(false);
      checkIfFavorite();
      fetchSimilarArticles();
    }
  }, [article]);

  const checkIfFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      const favoritesArray = favorites ? JSON.parse(favorites) : [];
      setIsFavorite(favoritesArray.includes(article.date));
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const fetchSimilarArticles = async () => {
    try {
      const all = await fetchArticles(1, 100);
      const idx = all.findIndex(a => a.date === article.date);
      let neighbors = [];
      if (idx !== -1) {
        neighbors = all.slice(Math.max(idx - 4, 0), idx).concat(all.slice(idx + 1, idx + 5));
      }
      setSimilar(neighbors);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      let favoritesArray = favorites ? JSON.parse(favorites) : [];
      
      if (isFavorite) {
        favoritesArray = favoritesArray.filter(id => id !== article.date);
      } else {
        favoritesArray.push(article.date);
      }
      
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritesArray));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

const handleShare = async () => {
  try {
    const title = article.title;
    const explanation = article.explanation.substring(0, 200) + "...";
    const url = article.hdurl || article.url;
    const date = article.date;

    const message = `🌟 ${title}\n\n${explanation}\n\n📅 ${date}\n\n🖼️ View Image: ${url}`;

    await Share.share({
      message,
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
};

  const downloadImage = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      const imageUrl = article.hdurl || article.url;
      const filename = `nasa_apod_${article.date.replace(/-/g, '_')}.jpg`;
      const fileUri = FileSystem.cacheDirectory + filename;
      
      const downloaded = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.createAssetAsync(downloaded.uri);
      Alert.alert('Image downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTextAction = async (action) => {
    if (!article.explanation || article.explanation.trim().length < 10) return;

    setIsProcessing(true);
    setProcessType(action === 'translate' ? 'Translating' : 'Summarizing');

    try {
      let result = '';
      if (action === 'translate') {
        const targetLanguage = getDeviceLanguage();
        result = await GeminiService.translate(article.explanation, targetLanguage);
      } else if (action === 'summarize') {
        result = await GeminiService.summarize(article.explanation);
      }

      setResultModal({
        visible: true,
        title: action === 'translate' ? `Translation (${getDeviceLanguage()})` : 'Summary',
        content: result,
      });
    } catch (error) {
      setResultModal({
        visible: true,
        title: 'Error',
        content: 'Failed to process. Please check your internet connection and try again.',
      });
    } finally {
      setIsProcessing(false);
      setProcessType('');
    }
  };

  const closeResultModal = () => {
    setResultModal({ visible: false, title: '', content: '' });
  };

  if (!article) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Article not found.</Text>
      </View>
    );
  }

  if (loadingPage) return <BlurLoadingDetail colors={colors} />;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Modal transparent visible={isProcessing} animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
            minWidth: 280,
          }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
            }}>
              {processType}...
            </Text>
            <Text style={{
              marginTop: 4,
              fontSize: 14,
              color: '#9ca3af',
            }}>
              Please wait
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={resultModal.visible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
          }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.text,
              }}>
                {resultModal.title}
              </Text>
              <TouchableOpacity onPress={closeResultModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={{
                fontSize: 16,
                lineHeight: 24,
                color: colors.text,
              }}>
                {resultModal.content ? (
                  resultModal.content.split('\n').map((line, i) => (
                    <Text key={i}>
                      {line}
                      {'\n'}
                    </Text>
                  ))
                ) : (
                  <Text style={{ fontStyle: 'italic', color: colors.text }}>
                    No content available.
                  </Text>
                )}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={{
                backgroundColor: '#3b82f6',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 12,
              }}
              onPress={() => {
                Clipboard.setStringAsync(resultModal.content || '');
                closeResultModal();
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Copy to Clipboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="relative">
          <TouchableOpacity onPress={() => setIsImageModalVisible(true)}>
            <Image source={{ uri: article.url }} className="w-full h-80" resizeMode="cover" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-4 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          <View className="absolute top-12 right-4 flex-row">
            <TouchableOpacity
              onPress={toggleFavorite}
              className="w-10 h-10 rounded-full items-center justify-center mr-2"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorite ? "#ff4757" : "white"} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <Ionicons name="share-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-6">
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 8,
            color: 'white',
            lineHeight: 28,
          }}>
            {article.title}
          </Text>
          
          <View className="flex-row items-center mb-4">
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-sm ml-1 text-white opacity-80">{article.date}</Text>
          </View>

          <View className="flex-row justify-around mb-6">
            <TouchableOpacity
              className="flex-1 mx-2 py-3 rounded-xl items-center"
              style={{
                backgroundColor: colors.btn,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                Clipboard.setStringAsync(article.explanation);
              }}
            >
              <Ionicons name="copy-outline" size={20} color="white" />
              <Text className="text-white text-sm mt-1 font-medium">Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 mx-2 py-3 rounded-xl items-center"
              style={{
                backgroundColor: colors.btn,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => handleTextAction('translate')}
            >
              <Ionicons name="language-outline" size={20} color="white" />
              <Text className="text-white text-sm mt-1 font-medium">Translate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 mx-2 py-3 rounded-xl items-center"
              style={{
                backgroundColor: colors.btn,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => handleTextAction('summarize')}
            >
              <Ionicons name="document-text-outline" size={20} color="white" />
              <Text className="text-white text-sm mt-1 font-medium">Summarize</Text>
            </TouchableOpacity>
          </View>

          <Text style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.text,
          }}>
            {article.explanation}
          </Text>
        </View>

        <View className="p-6 pt-0">
          <Text className="font-semibold text-lg mb-3" style={{ color: colors.text }}>Similar Articles</Text>
          {loadingSimilar ? (
            <BlurLoadingDetail colors={colors} />
          ) : (
            <FlatList
              horizontal
              data={similar}
              keyExtractor={(item, idx) => item.date + idx}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="mr-4 w-40 rounded-lg overflow-hidden"
                  style={{ backgroundColor: colors.card }}
                  onPress={() => router.push({ pathname: "../articles/id", params: { item: JSON.stringify(item) } })}
                >
                  <Image source={{ uri: item.url }} className="w-full h-24" resizeMode="cover" />
                  <View className="p-2">
                    <Text numberOfLines={2} className="text-sm font-medium" style={{ color: colors.text }}>
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={isImageModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black">
          <View className="absolute top-12 left-4 right-4 flex-row justify-between items-center z-20">
            <TouchableOpacity
              onPress={() => setIsImageModalVisible(false)}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={downloadImage}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: isDownloading ? "rgba(34,197,94,0.8)" : "rgba(0,0,0,0.7)" }}
              disabled={isDownloading}
            >
              <Ionicons name={isDownloading ? "download" : "download-outline"} size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center">
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <Image
                source={{ uri: article.hdurl || article.url }}
                style={{ width: width * 0.95, height: height * 0.8 }}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export default ArticleDetails;