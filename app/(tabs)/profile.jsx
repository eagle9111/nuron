import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useThemeStore } from '../../zustand/useThemeStore';

const Profile = () => {
  const { colors } = useThemeStore();
  const router = useRouter();
  const [favoriteArticlesCount, setFavoriteArticlesCount] = useState(0);
  const [favoriteShortsCount, setFavoriteShortsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadFavoriteCounts();
    }, [])
  );

  const loadFavoriteCounts = async () => {
    try {
      const storedArticleFavorites = await AsyncStorage.getItem('@article_favorites');
      if (storedArticleFavorites) {
        const articleFavorites = JSON.parse(storedArticleFavorites);
        setFavoriteArticlesCount(articleFavorites.length);
        console.log('Loaded article favorites:', articleFavorites.length);
      } else {
        setFavoriteArticlesCount(0);
      }

      const storedShortsFavorites = await AsyncStorage.getItem('nasa_favorites');
      if (storedShortsFavorites) {
        const shortsFavorites = JSON.parse(storedShortsFavorites);
        setFavoriteShortsCount(shortsFavorites.length);
        console.log('Loaded shorts favorites:', shortsFavorites.length);
      } else {
        setFavoriteShortsCount(0);
      }
    } catch (error) {
      console.error('Failed to load favorite counts:', error);
    }
  };

  const handleFavoriteArticles = () => {
    if (favoriteArticlesCount === 0) {
      Alert.alert(
        'No Favorites', 
        'You haven\'t saved any articles yet. Start exploring and tap the heart icon to save articles!',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    router.push('/favorites/articles');
  };

  const handleFavoriteShorts = () => {
    if (favoriteShortsCount === 0) {
      Alert.alert(
        'No Favorites', 
        'You haven\'t saved any shorts yet. Watch some NASA videos and tap the heart icon to save them!',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    router.push('/favorites/shorts');
  };

  const handlePrivacyPolicy = async () => {
    const privacyUrl = 'https://eagle9111.github.io/privacy-policy-nuron/index.html';
    
    try {
      const supported = await Linking.canOpenURL(privacyUrl);
      if (supported) {
        await Linking.openURL(privacyUrl);
      } else {
        Alert.alert(
          'Cannot Open Link',
          'Unable to open the privacy policy. Please check your internet connection.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Failed to open privacy policy:', error);
      Alert.alert(
        'Error',
        'Failed to open privacy policy. Please try again later.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleEmailSupport = async () => {
    const emailUrl = 'mailto:alhassan.khalilnew@gmail.com?subject=App Support Request&body=Hi, I need help with...';
    
    try {
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'No Email App',
          'No email app found on your device. Please install an email app or contact us through other means.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert(
        'Error',
        'Failed to open email app. Please try again later.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const ProfileItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showBadge = false, 
    badgeCount = 0,
    rightIcon = "chevron-forward-outline" 
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between p-4 mb-3 rounded-xl active:opacity-70"
      style={{ backgroundColor: colors.card }}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: colors.header }}
        >
          <Ionicons name={icon} size={24} color={colors.text} />
        </View>
        
        <View className="flex-1">
          <Text 
            className="text-base font-semibold mb-1"
            style={{ color: colors.text }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text 
              className="text-sm"
              style={{ color: colors.text }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center">
        {showBadge && badgeCount > 0 && (
          <View 
            className="min-w-6 h-6 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-xs font-bold">
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
        
        <Ionicons 
          name={rightIcon} 
          size={18} 
          color={colors.text + '60'} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View 
      className="flex-1 px-4 pt-12"
      style={{ backgroundColor: colors.background }}
    >
      


      {/* Favorites Section */}
      <View className="mb-6">
        <Text 
          className="text-lg font-semibold mb-4 ml-1"
          style={{ color: colors.text }}
        >
          Your Favorites
        </Text>

        <ProfileItem
          icon="newspaper-outline"
          title="Favorite Articles"
          subtitle={favoriteArticlesCount === 0 
            ? "No saved articles yet" 
            : `${favoriteArticlesCount} saved article${favoriteArticlesCount !== 1 ? 's' : ''}`
          }
          onPress={handleFavoriteArticles}
          showBadge={true}
          badgeCount={favoriteArticlesCount}
        />

        <ProfileItem
          icon="videocam-outline"
          title="Favorite Shorts"
          subtitle={favoriteShortsCount === 0 
            ? "No saved videos yet" 
            : `${favoriteShortsCount} saved video${favoriteShortsCount !== 1 ? 's' : ''}`
          }
          onPress={handleFavoriteShorts}
          showBadge={true}
          badgeCount={favoriteShortsCount}
        />
      </View>

      <View className="mb-6">
        <Text 
          className="text-lg font-semibold mb-4 ml-1"
          style={{ color: colors.text }}
        >
          Support & Legal
        </Text>

        <ProfileItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="View our privacy policy on GitHub"
          onPress={handlePrivacyPolicy}
          rightIcon="open-outline"
        />

        <ProfileItem
          icon="mail-outline"
          title="Contact Support"
          subtitle="Get help via email"
          onPress={handleEmailSupport}
          rightIcon="open-outline"
        />
      </View>

   
    
    </View>
  );
};

export default Profile;