'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import GoogleAuth from '@/components/GoogleAuth';

export default function Home() {
  const { user, setUser } = useStore();

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, [setUser]);

  if (!user) {
    return <GoogleAuth />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <ChatArea />
    </div>
  );
}