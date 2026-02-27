import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandInput } from '@/components/layout/CommandInput';
import { ChatView } from '@/components/chat/ChatView';
import { GameView } from '@/components/game/GameView';
import { SettingsModal } from '@/components/SettingsModal';
import { aiProviderService } from '@/services/api/aiProvider';

function App() {
  const { currentView, setConnected, isSettingsOpen, setSettingsOpen } = useAppStore();

  // Connect to WebSocket on mount
  useEffect(() => {
    const connect = async () => {
      try {
        await aiProviderService.connect((connected) => {
          setConnected(connected);
        });
      } catch (error) {
        console.error('Failed to connect to AI provider:', error);
        // App will work in demo mode
      }
    };

    connect();

    return () => {
      aiProviderService.disconnect();
    };
  }, [setConnected]);

  return (
    <div className="h-screen w-screen flex flex-col bg-app-bg overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'chat' ? <ChatView /> : <GameView />}
        </div>
      </div>

      {/* Command input */}
      <CommandInput />

      {/* Settings modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default App;
