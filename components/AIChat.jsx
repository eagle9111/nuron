import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api_key } from '../API_KEY';
import IconImage from "../assets/images/icon.jpg";
import { useThemeStore } from "../zustand/useThemeStore";
const GEMINI_API_KEY = api_key ; 
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

export const AIChat = () => {
  const { colors } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);

  const initialMessage = {
    id: 1,
    text: "Hello! I'm your NASA and Space exploration assistant! 🚀 I can help you with questions about:\n\n• NASA missions and programs\n• Space exploration and astronomy\n• Planets, stars, and galaxies\n• Space technology and spacecraft\n• Astronauts and space history\n\nWhat would you like to know about space?",
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([initialMessage]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const clearChatHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([initialMessage]);
          }
        }
      ]
    );
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isSpaceRelated = (text) => {
    const spaceKeywords = [
      'nasa', 'space', 'astronaut', 'rocket', 'planet', 'mars', 'moon', 'earth',
      'galaxy', 'star', 'solar system', 'universe', 'satellite', 'spacecraft',
      'iss', 'international space station', 'apollo', 'artemis', 'hubble',
      'james webb', 'telescope', 'orbit', 'gravity', 'asteroid', 'comet',
      'meteor', 'jupiter', 'saturn', 'venus', 'mercury', 'uranus', 'neptune',
      'pluto', 'sun', 'constellation', 'nebula', 'black hole', 'cosmic',
      'astronomy', 'astrophysics', 'spacewalk', 'mission', 'launch', 'landing',
      'rover', 'probe', 'voyager', 'cassini', 'curiosity', 'perseverance',
      'ingenuity', 'spacex', 'blue origin', 'boeing', 'lockheed martin'
    ];

    const lowercaseText = text.toLowerCase();
    return spaceKeywords.some(keyword => lowercaseText.includes(keyword));
  };

  const callGeminiAPI = async (userMessage) => {
    try {
      const systemPrompt = `You are a NASA and space exploration expert assistant. You should ONLY respond to questions related to NASA, space exploration, astronomy, spacecraft, astronauts, planets, stars, galaxies, space missions, and space technology. 

If the user asks about topics unrelated to space or NASA, politely redirect them back to space-related topics.

Keep your responses informative, engaging, and accurate. Use emojis occasionally to make responses more friendly. Focus on providing educational content about space and NASA.

User question: ${userMessage}`;

      const requestBody = {
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('Making API request to:', `${GEMINI_API_URL}?key=${GEMINI_API_KEY ? '[REDACTED]' : 'MISSING'}`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(data, null, 2));
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        throw new Error(`API Error: ${data.error.message || 'Unknown error'}`);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Gemini API Error Details:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      Alert.alert(
        'API Key Missing',
        'Please add your Gemini API key to use the AI assistant.',
        [{ text: 'OK' }]
      );
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: message.trim(),
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      if (!isSpaceRelated(message)) {
        setTimeout(() => {
          const redirectResponse = {
            id: Date.now() + 1,
            text: "I'm specialized in NASA and space-related topics! 🚀 Please ask me about space exploration, planets, astronauts, NASA missions, or anything related to astronomy and space science. What would you like to know about space?",
            isBot: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, redirectResponse]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      const aiResponse = await callGeminiAPI(message);
      
      const botResponse = {
        id: Date.now() + 1,
        text: aiResponse,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botResponse]);
    } catch  {
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting to my AI service right now. Please check that you have:\n\n1. Added your Gemini API key\n2. Enabled the Gemini API in Google Cloud Console\n3. Have a stable internet connection\n\nTry again in a moment! 🛰️",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  if (messages.length === 0) {
    return null; 
  }

  return (
    <>
    <TouchableOpacity
  onPress={() => setIsOpen(true)}
  className="absolute bottom-6 right-6"
>
  <Image
    source={IconImage}
    className="w-14 h-14 rounded-full"
    style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}
  />
</TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          <View 
            className="flex-row items-center justify-between p-4 border-b"
            style={{ 
              backgroundColor: colors.card,
              borderBottomColor: colors.text + '20'
            }}
          >
            <View className="flex-row items-center">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: '#667eea' }}
              >
                <Ionicons name="rocket" size={20} color="white" />
              </View>
              <View>
                <Text className="font-semibold text-lg" style={{ color: colors.text }}>
                  NASA Space Assistant
                </Text>
                <View className="flex-row items-center">
                  <View 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: '#10b981' }}
                  />
                  <Text className="text-xs" style={{ color: colors.text, opacity: 0.7 }}>
                    Online
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={clearChatHistory}
                className="p-2 mr-2"
              >
                <Ionicons name="trash-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`mb-4 ${msg.isBot ? 'items-start' : 'items-end'}`}
              >
                <View
                  className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                    msg.isBot ? 'rounded-bl-md' : 'rounded-br-md'
                  }`}
                  style={{
                    backgroundColor: msg.isBot ? colors.card : '#667eea',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      color: msg.isBot ? colors.text : 'white',
                      lineHeight: 20,
                    }}
                  >
                    {msg.text}
                  </Text>
                </View>
                <Text
                  className="text-xs mt-1 mx-1"
                  style={{ color: colors.text, opacity: 0.5 }}
                >
                  {msg.timestamp}
                </Text>
              </View>
            ))}
            
            {isTyping && (
              <View className="mb-4 items-start">
                <View
                  className="px-4 py-3 rounded-2xl rounded-bl-md flex-row items-center"
                  style={{ backgroundColor: colors.card }}
                >
                  <ActivityIndicator size="small" color="#667eea" />
                  <Text 
                    className="ml-2"
                    style={{ color: colors.text, opacity: 0.7 }}
                  >
                    AI is thinking...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View 
            className="flex-row items-center p-4 border-t"
            style={{ 
              backgroundColor: colors.card,
              borderTopColor: colors.text + '20'
            }}
          >
            <TextInput
              placeholder="Ask me about NASA or space..."
              placeholderTextColor={colors.text + '70'}
              value={message}
              onChangeText={setMessage}
              className="flex-1 px-4 py-3 rounded-full mr-3"
              style={{ 
                backgroundColor: colors.background,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.text + '20',
                maxHeight: 100,
              }}
              multiline
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: message.trim() ? '#667eea' : colors.text + '30'
              }}
              disabled={!message.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={message.trim() ? 'white' : colors.text + '70'} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};