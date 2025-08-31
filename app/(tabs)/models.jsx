import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { nasaModels } from '../../nasamodels';
import { useThemeStore } from '../../zustand/useThemeStore';

const ModelsScreen = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const router = useRouter();
  const { colors } = useThemeStore();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setModels(nasaModels);
    } catch (err) {
      console.error('Error loading models:', err);
      Alert.alert('Connection Error', 'Failed to load NASA 3D models. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const filteredModels = models;

  const handleModelPress = (model) => {
    router.push(`/models/${model.id}?title=${encodeURIComponent(model.title)}&modelUrl=${encodeURIComponent(model.modelUrl)}`);
  };

  const renderModelItem = ({ item }) => (
    <TouchableOpacity
      className="flex-1 mx-2 mb-4 rounded-xl overflow-hidden"
      style={{
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      onPress={() => handleModelPress(item)}
      activeOpacity={0.8}
    >
      <View className="relative">
        <Image
          source={
            imageErrors[item.id] 
              ? require('../../assets/images/icon.jpg')
              : { uri: item.image }
          }
          className="w-full h-32"
          style={{ backgroundColor: colors.tabBar }}
          resizeMode="cover"
          onError={() => handleImageError(item.id)}
          defaultSource={require('../../assets/images/icon.jpg')}
        />
        <View 
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}
        >
          <Text 
            className="text-white text-sm font-bold mb-1"
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text 
            className="text-white text-xs opacity-80"
            numberOfLines={1}
          >
            {item.mission}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View 
        className="flex-1 justify-center items-center pt-12"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
        <Text 
          className="text-base font-medium mt-4"
          style={{ color: colors.text }}
        >
          Loading Models
        </Text>
      </View>
    );
  }

return (
  <View 
    className="flex-1 pt-6"
    style={{ backgroundColor: colors.background }}
  >
   

    <FlatList
  data={filteredModels}
  renderItem={renderModelItem}
  keyExtractor={(item) => item.id}
  numColumns={2}
  contentContainerStyle={{ paddingBottom: 16 }}
  ListHeaderComponent={
    <View 
      className="mx-4 mb-4 rounded-lg px-4 py-3"
      style={{
        backgroundColor: colors.warning || '#FFA500',
        alignItems: 'center',
      }}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: colors.onWarning || '#FFF', textAlign: 'center' }}
      >
        🚧 Models are in beta – please be gentle with movement to avoid crashes.
      </Text>
    </View>
  }
  ListEmptyComponent={() => (
    <View className="flex-1 justify-center items-center py-20">
      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-lg"
        onPress={loadModels}
      >
        <Text className="text-white font-semibold">Reload</Text>
      </TouchableOpacity>
    </View>
  )}
  refreshing={loading}
  onRefresh={loadModels}
  showsVerticalScrollIndicator={false}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  initialNumToRender={8}
  getItemLayout={(data, index) => (
    { length: 140, offset: 140 * Math.floor(index / 2), index }
  )}
/>

  </View>
);

};

export default ModelsScreen;