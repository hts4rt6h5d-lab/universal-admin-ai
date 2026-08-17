import { useState } from 'react';
import { css } from './lib/css';
import { useAuth } from './auth/AuthContext';
import StatusBar from './components/StatusBar';
import SignupScreen from './screens/auth/SignupScreen';
import LoginScreen from './screens/auth/LoginScreen';
import SubscriptionScreen from './screens/auth/SubscriptionScreen';
import Dashboard from './Dashboard';

function PhoneFrame({ children }) {
  return (
    <div style={css('min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:26px;background:radial-gradient(130% 90% at 50% -10%, #1b1e30 0%, #101119 55%, #0a0b11 100%);font-family:var(--font-body)')}>
      <div style={css('width:390px;flex:none;background:linear-gradient(160deg,#22242f,#0c0d14);padding:12px;border-radius:52px;box-shadow:0 40px 90px -30px rgba(0,0,0,.85), 0 0 0 1px color-mix(in srgb, var(--color-text) 8%, transparent)')}>
        <div style={css('position:relative;width:366px;height:792px;border-radius:42px;overflow:hidden;background:var(--color-bg);color:var(--color-text)')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, plan, status } = useAuth();
  const [authScreen, setAuthScreen] = useState('signup');

  if (status === 'loading') {
    return (
      <PhoneFrame>
        <StatusBar />
        <div style={css('height:100%;display:grid;place-items:center')}>
          <div style={css('width:28px;height:28px;border-radius:50%;border:2px solid color-mix(in srgb, var(--color-accent) 28%, transparent);border-top-color:var(--color-accent);animation:uaa-spin .7s linear infinite')}></div>
        </div>
      </PhoneFrame>
    );
  }

  if (!user) {
    return (
      <PhoneFrame>
        <StatusBar />
        {authScreen === 'signup' ? (
          <SignupScreen onSwitchToLogin={() => setAuthScreen('login')} />
        ) : (
          <LoginScreen onSwitchToSignup={() => setAuthScreen('signup')} />
        )}
      </PhoneFrame>
    );
  }

  if (!plan) {
    return (
      <PhoneFrame>
        <StatusBar />
        <SubscriptionScreen />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Dashboard />
    </PhoneFrame>
  );
}
