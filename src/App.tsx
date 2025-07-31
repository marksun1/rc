import React, { useState, useEffect, useRef } from 'react';
import { AppState, Chain, ScheduledSession, ActiveSession, CompletionHistory } from './types';
import { Dashboard } from './components/Dashboard';
import { AuthWrapper } from './components/AuthWrapper';
import { ChainEditor } from './components/ChainEditor';
import { FocusMode } from './components/FocusMode';
import { ChainDetail } from './components/ChainDetail';
import { AuxiliaryJudgment } from './components/AuxiliaryJudgment';
import { AnalyticsView } from './components/AnalyticsView';
import { storage as localStorageUtils } from './utils/storage';
import { supabaseStorage } from './utils/supabaseStorage';
import { optimizedSupabaseStorage } from './utils/optimizedSupabaseStorage';
import { getCurrentUser, isSupabaseConfigured } from './lib/supabase';
import { isSessionExpired } from './utils/time';
import { StorageDebouncer } from './hooks/useDebounce';

function App() {
  const [state, setState] = useState<AppState>({
    chains: [],
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
    completionHistory: [],
  });

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<string | null>(null);
  
  // Helper function for optimized storage operations
  const saveWithDebounce = {
    chains: (chains: Chain[]) => {
      if (debouncerRef.current) {
        debouncerRef.current.queueOperation('chains', chains);
      } else {
        storage.saveChains(chains);
      }
    },
    sessions: (sessions: ScheduledSession[]) => {
      if (debouncerRef.current) {
        debouncerRef.current.queueOperation('sessions', sessions);
      } else {
        storage.saveScheduledSessions(sessions);
      }
    },
    history: (history: CompletionHistory[]) => {
      if (debouncerRef.current) {
        debouncerRef.current.queueOperation('history', history);
      } else {
        storage.saveCompletionHistory(history);
      }
    },
    activeSession: (session: ActiveSession | null) => {
      if (debouncerRef.current) {
        debouncerRef.current.queueOperation('activeSession', session);
      } else {
        storage.saveActiveSession(session);
      }
    }
  };

  // Determine which storage to use based on authentication
  const [storage, setStorage] = useState(localStorageUtils);
  
  // Initialize debounced storage operations for performance
  const debouncerRef = useRef<StorageDebouncer | null>(null);
  
  // Check if user is authenticated and switch to optimized Supabase storage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 只有在 Supabase 配置正确时才检查认证
        if (isSupabaseConfigured) {
          const user = await getCurrentUser();
          if (user) {
            // Use optimized storage with batching and caching for authenticated users
            setStorage(optimizedSupabaseStorage);
            
            // Initialize debouncer for non-blocking storage operations
            debouncerRef.current = new StorageDebouncer(optimizedSupabaseStorage);
            return;
          }
        }
        
        // 回退到本地存储
        setStorage(localStorageUtils);
        debouncerRef.current = new StorageDebouncer(localStorageUtils);
      } catch (error) {
        console.warn('Supabase not available, using localStorage:', error);
        setStorage(localStorageUtils);
        debouncerRef.current = new StorageDebouncer(localStorageUtils);
      }
    };

    checkAuth();
  }, []);

  // Flush any pending operations before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debouncerRef.current) {
        debouncerRef.current.flush();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup storage on component unmount
      if (storage === optimizedSupabaseStorage) {
        optimizedSupabaseStorage.cleanup();
      }
    };
  }, [storage]);

  const renderContent = () => {
    if (!isSupabaseConfigured) {
      // 没有 Supabase 配置时，直接渲染内容，不需要认证
      return renderCurrentView();
    }
    
    // 有 Supabase 配置时，使用认证包装
    return (
      <AuthWrapper>
        {renderCurrentView()}
      </AuthWrapper>
    );
  };

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'editor':
        return (
          <>
            <ChainEditor
              chain={state.editingChain || undefined}
              isEditing={!!state.editingChain}
              onSave={handleSaveChain}
              onCancel={handleBackToDashboard}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );

      case 'focus':
        const activeChain = state.chains.find(c => c.id === state.activeSession?.chainId);
        if (!state.activeSession || !activeChain) {
          handleBackToDashboard();
          return null;
        }
        return (
          <>
            <FocusMode
              session={state.activeSession}
              chain={activeChain}
              onComplete={handleCompleteSession}
              onInterrupt={handleInterruptSession}
              onAddException={handleAddException}
              onPause={handlePauseSession}
              onResume={handleResumeSession}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );

      case 'detail':
        const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingChain) {
          handleBackToDashboard();
          return null;
        }
        return (
          <>
            <ChainDetail
              chain={viewingChain}
              history={state.completionHistory}
              onBack={handleBackToDashboard}
              onEdit={() => handleEditChain(viewingChain.id)}
              onDelete={() => handleDeleteChain(viewingChain.id)}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );

      case 'analytics':
        return (
          <>
            <AnalyticsView
              chains={state.chains}
              completionHistory={state.completionHistory}
              onBack={handleBackToDashboard}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );

      default:
        return (
          <>
            <Dashboard
              chains={state.chains}
              scheduledSessions={state.scheduledSessions}
              onCreateChain={handleCreateChain}
              onStartChain={handleStartChain}
              onScheduleChain={handleScheduleChain}
              onViewChainDetail={handleViewChainDetail}
              onCancelScheduledSession={handleCancelScheduledSession}
              onDeleteChain={handleDeleteChain}
              onViewAnalytics={() => setState(prev => ({ ...prev, currentView: 'analytics' }))}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </>
        );
    }
  };

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const chains = await storage.getChains();
        const allScheduledSessions = await storage.getScheduledSessions();
        const scheduledSessions = allScheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        const activeSession = await storage.getActiveSession();
        const completionHistory = await storage.getCompletionHistory();

        setState(prev => ({
          ...prev,
          chains,
          scheduledSessions,
          activeSession,
          completionHistory,
          currentView: activeSession ? 'focus' : 'dashboard',
        }));

        // Clean up expired sessions
        if (scheduledSessions.length !== allScheduledSessions.length) {
          await storage.saveScheduledSessions(scheduledSessions);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    if (storage) {
      loadData();
    }
  }, [storage]);

  // Clean up expired scheduled sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const expiredSessions = prev.scheduledSessions.filter(
          session => isSessionExpired(session.expiresAt)
        );
        const activeScheduledSessions = prev.scheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        
        if (expiredSessions.length > 0) {
          // Show auxiliary judgment for the first expired session
          setShowAuxiliaryJudgment(expiredSessions[0].chainId);
          saveWithDebounce.sessions(activeScheduledSessions);
          return { ...prev, scheduledSessions: activeScheduledSessions };
        }
        
        return prev;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [storage]);

  const handleCreateChain = () => {
    setState(prev => ({
      ...prev,
      currentView: 'editor',
      editingChain: null,
    }));
  };

  const handleEditChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (chain) {
      setState(prev => ({
        ...prev,
        currentView: 'editor',
        editingChain: chain,
      }));
    }
  };

  const handleSaveChain = async (chainData: Omit<Chain, 'id' | 'currentStreak' | 'auxiliaryStreak' | 'totalCompletions' | 'totalFailures' | 'auxiliaryFailures' | 'createdAt' | 'lastCompletedAt'>) => {
    setState(prev => {
      let updatedChains: Chain[];
      
      if (prev.editingChain) {
        // Editing existing chain
        updatedChains = prev.chains.map(chain =>
          chain.id === prev.editingChain!.id
            ? { ...chain, ...chainData }
            : chain
        );
      } else {
        // Creating new chain
        const newChain: Chain = {
          id: crypto.randomUUID(),
          ...chainData,
          currentStreak: 0,
          auxiliaryStreak: 0,
          totalCompletions: 0,
          totalFailures: 0,
          auxiliaryFailures: 0,
          createdAt: new Date(),
        };
        updatedChains = [...prev.chains, newChain];
      }
      
      saveWithDebounce.chains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
        currentView: 'dashboard',
        editingChain: null,
      };
    });
  };

  const handleScheduleChain = (chainId: string) => {
    // 检查是否已有该链的预约
    const existingSchedule = state.scheduledSessions.find(s => s.chainId === chainId);
    if (existingSchedule) return;

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const scheduledSession: ScheduledSession = {
      chainId,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + chain.auxiliaryDuration * 60 * 1000), // Use chain's auxiliary duration
      auxiliarySignal: chain.auxiliarySignal,
    };

    setState(prev => {
      const updatedSessions = [...prev.scheduledSessions, scheduledSession];
      saveWithDebounce.sessions(updatedSessions);
      
      // 增加辅助链记录
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 }
          : chain
      );
      saveWithDebounce.chains(updatedChains);
      
      return { 
        ...prev, 
        scheduledSessions: updatedSessions,
        chains: updatedChains
      };
    });
  };

  const handleStartChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const activeSession: ActiveSession = {
      chainId,
      startedAt: new Date(),
      duration: chain.duration,
      isPaused: false,
      totalPausedTime: 0,
    };

    // Remove any scheduled session for this chain
    const updatedScheduledSessions = state.scheduledSessions.filter(
      session => session.chainId !== chainId
    );

    setState(prev => {
      saveWithDebounce.activeSession(activeSession);
      saveWithDebounce.sessions(updatedScheduledSessions);
      
      return {
        ...prev,
        activeSession,
        scheduledSessions: updatedScheduledSessions,
        currentView: 'focus',
      };
    });
  };

  const handleCompleteSession = () => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: true,
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: c.currentStreak + 1,
              totalCompletions: c.totalCompletions + 1,
              lastCompletedAt: new Date(),
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      saveWithDebounce.chains(updatedChains);
      saveWithDebounce.activeSession(null);
      saveWithDebounce.history(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handleInterruptSession = (reason?: string) => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: 0, // Reset streak
              totalFailures: c.totalFailures + 1,
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      saveWithDebounce.chains(updatedChains);
      saveWithDebounce.activeSession(null);
      saveWithDebounce.history(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handlePauseSession = () => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: true,
        pausedAt: new Date(),
      };
      
      saveWithDebounce.activeSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleResumeSession = () => {
    if (!state.activeSession || !state.activeSession.pausedAt) return;

    setState(prev => {
      const pauseDuration = Date.now() - prev.activeSession!.pausedAt!.getTime();
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: false,
        pausedAt: undefined,
        totalPausedTime: prev.activeSession!.totalPausedTime + pauseDuration,
      };
      
      saveWithDebounce.activeSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleAuxiliaryJudgmentFailure = (chainId: string, reason: string) => {
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryStreak: 0, // Reset auxiliary streak
              auxiliaryFailures: chain.auxiliaryFailures + 1
            }
          : chain
      );
      
      saveWithDebounce.chains(updatedChains);
      saveWithDebounce.sessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
  };

  const handleAuxiliaryJudgmentAllow = (chainId: string, exceptionRule: string) => {
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryExceptions: [...(chain.auxiliaryExceptions || []), exceptionRule]
            }
          : chain
      );
      
      saveWithDebounce.chains(updatedChains);
      saveWithDebounce.sessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleAddException = (exceptionRule: string) => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedChains = prev.chains.map(chain =>
        chain.id === prev.activeSession!.chainId
          ? {
              ...chain,
              exceptions: [...(chain.exceptions || []), exceptionRule]
            }
          : chain
      );
      
      saveWithDebounce.chains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
      };
    });
  };

  const handleViewChainDetail = (chainId: string) => {
    setState(prev => ({
      ...prev,
      currentView: 'detail',
      viewingChainId: chainId,
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
    }));
  };

  const handleDeleteChain = (chainId: string) => {
    setState(prev => {
      // Remove the chain
      const updatedChains = prev.chains.filter(chain => chain.id !== chainId);
      
      // Remove any scheduled sessions for this chain
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      // Remove completion history for this chain
      const updatedHistory = prev.completionHistory.filter(
        history => history.chainId !== chainId
      );
      
      // If currently active session belongs to this chain, clear it
      const updatedActiveSession = prev.activeSession?.chainId === chainId 
        ? null 
        : prev.activeSession;
      
      // Save to storage
      saveWithDebounce.chains(updatedChains);
      saveWithDebounce.sessions(updatedScheduledSessions);
      saveWithDebounce.history(updatedHistory);
      if (!updatedActiveSession) {
        saveWithDebounce.activeSession(null);
      }
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
        completionHistory: updatedHistory,
        activeSession: updatedActiveSession,
        currentView: updatedActiveSession ? prev.currentView : 'dashboard',
        viewingChainId: prev.viewingChainId === chainId ? null : prev.viewingChainId,
      };
    });
  };

  return renderContent();
}

export default App;