import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f172a' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="new-application" />
          <Stack.Screen name="application-details" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="admin-dashboard" />
          <Stack.Screen name="admin-application" />
          <Stack.Screen name="admin-testimonials" />
          <Stack.Screen name="admin-destinations" />
          <Stack.Screen name="admin-advisors" />
          <Stack.Screen name="admin-users" />
          <Stack.Screen name="admin-providers" />
          <Stack.Screen name="provider" />
          <Stack.Screen name="provider-offers" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="destination/[id]" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
