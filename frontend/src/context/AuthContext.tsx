import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  passport_number: string;
  country_of_residence: string;
  profile_image?: string;
  embassy_location?: string;
}

interface Admin {
  id: string;
  email: string;
  full_name: string;
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  admin: Admin | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  adminLogin: (admin: Admin) => Promise<void>;
  adminLogout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [userData, adminData] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('admin')
      ]);
      
      if (userData) {
        setUser(JSON.parse(userData));
      }
      if (adminData) {
        setAdmin(JSON.parse(adminData));
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const adminLogin = async (adminData: Admin) => {
    setAdmin(adminData);
    await AsyncStorage.setItem('admin', JSON.stringify(adminData));
  };

  const adminLogout = async () => {
    setAdmin(null);
    await AsyncStorage.removeItem('admin');
  };

  const isAdmin = admin !== null && admin.access_token !== undefined;

  return (
    <AuthContext.Provider value={{ 
      user, 
      admin,
      isLoading, 
      login, 
      logout, 
      updateUser,
      adminLogin,
      adminLogout,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
