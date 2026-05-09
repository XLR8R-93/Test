import 'react-native-gesture-handler';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';

import { MainTabs } from './src/screens/MainTabs';
import { FoodDetailScreen } from './src/screens/FoodDetailScreen';
import { RootStackParamList } from './src/types';

enableScreens();

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="FoodDetail"
            component={FoodDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'Add Food',
              headerTintColor: '#2e7d32',
              headerStyle: { backgroundColor: '#fafafa' },
              headerShadowVisible: false,
              presentation: 'modal',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
