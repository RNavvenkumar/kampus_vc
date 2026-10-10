import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, CreatorProfile, BrandProfile } from '../types';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  googleAuthUser,
  logoutUser,
  updateCreatorProfileMe,
  updateBrandProfileMe,
  changeUserPassword
} from '../services/api';

interface AuthContextType {
  user: User | null;
  creatorProfile: CreatorProfile | null;
  brandProfile: BrandProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'creator' | 'brand';
  }) => Promise<User>;
  loginWithGoogle: (credential: string, role?: 'creator' | 'brand') => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateCreatorProfile: (data: Partial<CreatorProfile>) => Promise<CreatorProfile>;
  updateBrandProfile: (data: Partial<BrandProfile>) => Promise<BrandProfile>;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (data) {
        setUser(data.user);
        if (data.user.role === 'creator') {
          setCreatorProfile(data.profile as CreatorProfile);
          setBrandProfile(null);
        } else if (data.user.role === 'brand') {
          setBrandProfile(data.profile as BrandProfile);
          setCreatorProfile(null);
        }
      } else {
        setUser(null);
        setCreatorProfile(null);
        setBrandProfile(null);
      }
    } catch {
      setUser(null);
      setCreatorProfile(null);
      setBrandProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const data = await loginUser(credentials);
    await refreshUser();
    return data.user;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'creator' | 'brand';
  }): Promise<User> => {
    const data = await registerUser(payload);
    await refreshUser();
    return data.user;
  };

  const loginWithGoogle = async (credential: string, role?: 'creator' | 'brand'): Promise<User> => {
    const data = await googleAuthUser({ credential, role });
    await refreshUser();
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setCreatorProfile(null);
      setBrandProfile(null);
    }
  };

  const updateCreatorProfile = async (data: Partial<CreatorProfile>): Promise<CreatorProfile> => {
    const updated = await updateCreatorProfileMe(data);
    setCreatorProfile(updated);
    return updated;
  };

  const updateBrandProfile = async (data: Partial<BrandProfile>): Promise<BrandProfile> => {
    const updated = await updateBrandProfileMe(data);
    setBrandProfile(updated);
    return updated;
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> => {
    await changeUserPassword(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        creatorProfile,
        brandProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        updateCreatorProfile,
        updateBrandProfile,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
