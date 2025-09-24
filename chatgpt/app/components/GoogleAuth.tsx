'use client';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { authApi } from '@/lib/api';
import { useStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Bot } from 'lucide-react';

export default function GoogleAuth() {
  const setUser = useStore((state) => state.setUser);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received');
      }
      
      const authResponse = await authApi.googleLogin(credentialResponse.credential);
      setUser({
        id: authResponse.id,
        email: authResponse.email,
        name: authResponse.name,
        picture: authResponse.picture,
      });
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const handleGoogleError = () => {
    toast.error('Failed to sign in with Google');
  };

  // For development without Google OAuth configured
  const handleDemoLogin = async () => {
    try {
      const demoToken = 'demo-token-' + Date.now();
      const authResponse = await authApi.googleLogin(demoToken);
      setUser({
        id: authResponse.id,
        email: authResponse.email,
        name: authResponse.name,
        picture: authResponse.picture,
      });
      toast.success('Successfully signed in with demo account!');
    } catch (error: any) {
      console.error('Demo login error:', error);
      toast.error(error.message || 'Failed to sign in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-500 p-4 rounded-full mb-4">
            <Bot size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ChatGPT Clone
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Sign in to start chatting with AI
          </p>
        </div>

        <div className="space-y-4">
          {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  size="large"
                  width="100%"
                />
              </div>
            </GoogleOAuthProvider>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Google OAuth not configured. Using demo mode.
              </p>
              <button
                onClick={handleDemoLogin}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                Sign in with Demo Account
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            This is a demonstration application powered by OpenAI.
          </p>
        </div>
      </div>
    </div>
  );
}
