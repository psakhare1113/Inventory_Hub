export const AuthModal = (state) => {
  if (!state.showAuthModal) return '';
  
  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onclick="if(event.target === this) toggleAuthModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="relative">
          <button onclick="toggleAuthModal()" class="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors z-10">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <div class="p-6">
            <div class="text-center mb-6">
              <h2 class="text-2xl font-serif font-bold text-gray-800 mb-1">
                ${state.authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p class="text-sm text-gray-600">
                ${state.authMode === 'login' ? 'Sign in to your account' : 'Join us today'}
              </p>
            </div>
            
            <form onsubmit="handleAuth(event)" class="space-y-3">
              ${state.authMode === 'signup' ? `
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" required name="firstName"
                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                           placeholder="John">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" required name="lastName"
                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                           placeholder="Doe">
                  </div>
                </div>
              ` : ''}
              
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required name="email"
                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                       placeholder="you@example.com">
              </div>
              
              ${state.authMode === 'signup' ? `
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" required name="phoneNumber"
                         class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                         placeholder="+91 9876543210">
                </div>
              ` : ''}
              
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required name="password"
                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                       placeholder="••••••••">
              </div>
              
              ${state.authMode === 'login' ? `
                <div class="flex items-center justify-between text-xs">
                  <label class="flex items-center">
                    <input type="checkbox" class="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary">
                    <span class="ml-1.5 text-gray-600">Remember me</span>
                  </label>
                  <a href="#" class="text-primary hover:underline">Forgot password?</a>
                </div>
              ` : ''}
              
              <button type="submit" 
                      class="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 text-sm rounded-lg transition-all shadow-lg hover:shadow-xl">
                ${state.authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            
            <div class="mt-4 text-center">
              <p class="text-xs text-gray-600">
                ${state.authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button onclick="toggleAuthMode()" class="text-primary font-semibold hover:underline ml-1">
                  ${state.authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
            
            <div class="mt-4">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-xs">
                  <span class="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <div class="mt-4 grid grid-cols-2 gap-2">
                <button class="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span class="ml-1.5 text-xs font-medium text-gray-700">Google</span>
                </button>
                <button class="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  <span class="ml-1.5 text-xs font-medium text-gray-700">GitHub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};
