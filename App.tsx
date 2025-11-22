import React, { useState, useEffect } from 'react';
import { Brain, Map, Activity, Send, Settings, Trash2, Database, AlertCircle, KeyRound, Cloud, HardDrive, CheckCircle2, X, LogOut, User } from 'lucide-react';
import Gauge from './components/Gauge';
import TrendChart from './components/TrendChart';
import AttentionMap from './components/AttentionMap';
import Login from './components/Login';
import { analyzeEmotion } from './services/geminiService';
import { fetchLogs, saveLog, deleteLog } from './services/supabase';
import { checkCanSubmit, recordUsage, getAccountInfo } from './services/accountService';
import { LogEntry, TestAccount } from './types';
import { STORAGE_KEY, SUPABASE_URL_STORAGE, SUPABASE_KEY_STORAGE, DEEPSEEK_KEY_STORAGE, CURRENT_USER_STORAGE, DAILY_LIMIT } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'map'>('record');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Authentication State
  const [currentAccount, setCurrentAccount] = useState<TestAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ todayUsage: number; remaining: number; expiresAt: string } | null>(null);
  
  // Configuration State
  const [showSettings, setShowSettings] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [dbError, setDbError] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Load account info
  const loadAccountInfo = async () => {
    if (!currentAccount || !supabaseUrl || !supabaseKey) return;
    try {
      const info = await getAccountInfo(supabaseUrl, supabaseKey, currentAccount.id);
      setAccountInfo({
        todayUsage: info.todayUsage,
        remaining: info.remaining,
        expiresAt: info.expires_at
      });
    } catch (err) {
      console.error('加载账号信息失败:', err);
    }
  };

  // Initialize
  useEffect(() => {
    // Load Config from LocalStorage
    const savedUrl = localStorage.getItem(SUPABASE_URL_STORAGE);
    const savedSbKey = localStorage.getItem(SUPABASE_KEY_STORAGE);
    const savedDsKey = localStorage.getItem(DEEPSEEK_KEY_STORAGE);
    const savedAccount = localStorage.getItem(CURRENT_USER_STORAGE);
    
    if (savedUrl) setSupabaseUrl(savedUrl);
    if (savedSbKey) setSupabaseKey(savedSbKey);
    if (savedDsKey) setDeepseekKey(savedDsKey);
    if (savedAccount) {
      try {
        setCurrentAccount(JSON.parse(savedAccount));
      } catch (e) {
        console.error('加载账号信息失败:', e);
      }
    }

    // Attempt to load data
    if (savedUrl && savedSbKey) {
        loadDataFromSupabase(savedUrl, savedSbKey);
    } else {
        // Fallback to local storage for demo mode if no DB configured
        const localLogs = localStorage.getItem(STORAGE_KEY);
        if (localLogs) setLogs(JSON.parse(localLogs));
    }
  }, []);

  // Load account info when account changes
  useEffect(() => {
    if (currentAccount && supabaseUrl && supabaseKey) {
      loadAccountInfo();
    }
  }, [currentAccount, supabaseUrl, supabaseKey]);

  const loadDataFromSupabase = async (url: string, key: string) => {
      setLoading(true);
      setDbError('');
      try {
          const remoteLogs = await fetchLogs(url, key);
          setLogs(remoteLogs);
          setIsCloudConnected(true);
      } catch (err) {
          setDbError('无法连接数据库，显示本地缓存');
          setIsCloudConnected(false);
          // Fallback
          const localLogs = localStorage.getItem(STORAGE_KEY);
          if (localLogs) setLogs(JSON.parse(localLogs));
      } finally {
          setLoading(false);
      }
  };

  // Settings Handlers
  const handleSaveSettings = () => {
    // Auto-trim whitespace to prevent common copy-paste errors
    const cleanUrl = supabaseUrl.trim();
    const cleanSbKey = supabaseKey.trim();
    const cleanDsKey = deepseekKey.trim();

    setSupabaseUrl(cleanUrl);
    setSupabaseKey(cleanSbKey);
    setDeepseekKey(cleanDsKey);

    localStorage.setItem(SUPABASE_URL_STORAGE, cleanUrl);
    localStorage.setItem(SUPABASE_KEY_STORAGE, cleanSbKey);
    localStorage.setItem(DEEPSEEK_KEY_STORAGE, cleanDsKey);
    
    if (cleanUrl && cleanSbKey) {
        loadDataFromSupabase(cleanUrl, cleanSbKey);
    } else {
        setIsCloudConnected(false);
        // If disconnecting, maybe revert to local logs? 
        // For now, keep current view but mark disconnected.
    }
    setShowSettings(false);
  };

  const handleClearLocalHistory = () => {
    if (confirm('确定要清空本地缓存吗？(不会删除数据库数据)')) {
        localStorage.removeItem(STORAGE_KEY);
        if (!isCloudConnected) setLogs([]);
    }
  };

  const handleDeleteLog = async (id: string) => {
      if (!confirm('确定要删除这条记录吗？')) return;

      try {
          if (isCloudConnected && supabaseUrl && supabaseKey) {
              await deleteLog(supabaseUrl, supabaseKey, id);
          }
          
          // Update State
          const updatedLogs = logs.filter(log => log.id !== id);
          setLogs(updatedLogs);

          // Update Local Storage Backup
          if (!isCloudConnected) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
          }
      } catch (error: any) {
          alert('删除失败: ' + error.message);
      }
  };

  // Helper to get ISO string with local timezone offset to preserve user context
  // Returns standard ISO 8601 format compatible with Supabase
  const getLocalISOString = () => {
      const date = new Date();
      const tzo = -date.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';
      const pad = (num: number) => {
          return (num < 10 ? '0' : '') + num;
      };
      // Return ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sss±HH:mm
      return date.getFullYear() +
          '-' + pad(date.getMonth() + 1) +
          '-' + pad(date.getDate()) +
          'T' + pad(date.getHours()) +
          ':' + pad(date.getMinutes()) +
          ':' + pad(date.getSeconds()) +
          '.' + String(date.getMilliseconds()).padStart(3, '0') +
          dif + pad(Math.floor(Math.abs(tzo) / 60)) +
          ':' + pad(Math.abs(tzo) % 60);
  };

  // Handle login
  const handleLoginSuccess = (account: TestAccount) => {
    setCurrentAccount(account);
    localStorage.setItem(CURRENT_USER_STORAGE, JSON.stringify(account));
  };

  // Handle logout
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      setCurrentAccount(null);
      localStorage.removeItem(CURRENT_USER_STORAGE);
      setAccountInfo(null);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Check authentication
    if (!currentAccount) {
      alert('请先登录');
      return;
    }

    // Check daily limit
    if (supabaseUrl && supabaseKey) {
      try {
        const checkResult = await checkCanSubmit(supabaseUrl, supabaseKey, currentAccount.id);
        if (!checkResult.canSubmit) {
          alert(checkResult.reason || '无法提交');
          if (checkResult.reason?.includes('过期')) {
            handleLogout();
          }
          return;
        }
      } catch (err: any) {
        alert('检查使用限制失败: ' + err.message);
        return;
      }
    }

    // Capture input and timestamp immediately to reflect user submission time
    const userInput = input.trim(); // Save input before any async operations
    const currentTimestamp = getLocalISOString();

    if (!deepseekKey) {
        setShowSettings(true);
        // Small delay to ensure modal is rendered before alert
        setTimeout(() => alert("请先在设置中配置 DeepSeek API Key"), 100);
        return;
    }

    setLoading(true);
    try {
      // 1. AI Analysis (DeepSeek)
      const result = await analyzeEmotion(userInput, deepseekKey);
      
      // 2. Save Data
      let newEntry: LogEntry;
      let savedToCloud = false;

      // Check if Supabase is configured (don't rely on isCloudConnected state)
      const hasSupabaseConfig = supabaseUrl && supabaseKey && supabaseUrl.trim() && supabaseKey.trim();

      if (hasSupabaseConfig) {
          // Try to save to Supabase first
          try {
              newEntry = await saveLog(supabaseUrl.trim(), supabaseKey.trim(), {
                  user_input: userInput,
                  ai_result: result,
                  timestamp: currentTimestamp, 
                  user_id: currentAccount.id 
              });
              savedToCloud = true;
              // Update connection status on successful save
              setIsCloudConnected(true);
              setDbError('');
              console.log('✅ 数据已保存到数据库:', newEntry.id);
          } catch (e: any) {
              console.error("保存到数据库失败:", e);
              // Fallback to local storage if database save fails
              savedToCloud = false;
              setIsCloudConnected(false);
              setDbError('数据库保存失败，已保存到本地: ' + e.message);
              
              // Create local entry as fallback
              newEntry = {
                id: Date.now().toString(),
                timestamp: currentTimestamp,
                user_input: userInput,
                ai_result: result,
              };
          }
      } else {
          // No Supabase config, save to local only
          newEntry = {
            id: Date.now().toString(),
            timestamp: currentTimestamp,
            user_input: userInput,
            ai_result: result,
          };
          setIsCloudConnected(false);
      }

      // Always update local storage as backup (even if saved to cloud)
      const updatedLogs = [newEntry, ...logs];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));

      // Record usage if saved to cloud
      if (savedToCloud && supabaseUrl && supabaseKey && currentAccount) {
        try {
          await recordUsage(supabaseUrl, supabaseKey, currentAccount.id);
          await loadAccountInfo(); // Refresh account info
        } catch (err) {
          console.error('记录使用次数失败:', err);
        }
      }

      // Update UI state
      setLogs(prev => [newEntry, ...prev]);
      setInput('');

      // Show success message
      if (savedToCloud) {
          console.log('✅ 数据已成功保存到云端数据库');
      } else {
          console.log('💾 数据已保存到本地存储');
      }
    } catch (error: any) {
      console.error("提交失败:", error);
      // Even on error, try to save to local storage as last resort
      try {
          const fallbackEntry: LogEntry = {
              id: Date.now().toString(),
              timestamp: currentTimestamp,
              user_input: userInput,
              ai_result: { 
                  summary: '分析失败',
                  scores: { calmness: 0, awareness: 0, energy: 0 },
                  focus_analysis: { time_orientation: 'Present', focus_target: 'Internal' },
                  nvc_guide: { observation: '', feeling: '', need: '', empathy_response: '' },
                  key_insights: [],
                  recommendations: { holistic_advice: '' }
              }
          };
          const fallbackLogs = [fallbackEntry, ...logs];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackLogs));
          setLogs(fallbackLogs);
          console.log('⚠️ 已保存到本地作为备份');
      } catch (fallbackError) {
          console.error('本地备份也失败:', fallbackError);
      }
      alert(`分析/保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check date equality
  const isToday = (dateStr: string) => {
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
  };

  const latestLog = logs[0];

  // History logs: Filter today's logs
  // List displays ALL of today's records.
  const todayHistoryLogs = logs.filter(log => isToday(log.timestamp));

  // Show login if not authenticated
  if (!currentAccount) {
    return (
      <Login 
        supabaseUrl={supabaseUrl} 
        supabaseKey={supabaseKey}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-teal-600">
              <Brain size={24} className="stroke-2" />
              <h1 className="font-bold text-lg tracking-tight">MindfulScale</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${isCloudConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-500 border-orange-200'}`}>
                  {isCloudConnected ? <Cloud size={10} /> : <HardDrive size={10} />}
                  {isCloudConnected ? '已同步' : '本地模式'}
              </div>

              <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-slate-100 text-teal-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                  <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <User size={14} className="text-slate-400" />
              <span className="text-slate-600 font-medium">{currentAccount.username}</span>
              {accountInfo && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className={`font-bold ${accountInfo.remaining > 5 ? 'text-emerald-600' : accountInfo.remaining > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                    今日剩余: {accountInfo.remaining}/{DAILY_LIMIT}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={14} />
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-slate-200 p-4 animate-in slide-in-from-top-5 shadow-lg z-40 relative">
            <div className="max-w-lg mx-auto space-y-4">
                
                {/* DeepSeek Config */}
                <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase mb-1">
                        <KeyRound size={14} /> DeepSeek API Key
                    </label>
                    <input 
                        type="password" 
                        value={deepseekKey}
                        onChange={(e) => setDeepseekKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">DeepSeek Key 仅存储在本地浏览器，用于调用 AI 分析。</p>
                </div>

                {/* Supabase Config */}
                <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase mb-1">
                        <Database size={14} /> Supabase 数据库
                    </label>
                    <div className="space-y-2">
                        <input 
                            type="text" 
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            placeholder="Project URL (https://xyz.supabase.co)"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <input 
                            type="password" 
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            placeholder="Anon Public Key"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">连接数据库后，您的情绪资产将永久保存于云端。</p>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100 items-center">
                    <button 
                        onClick={handleClearLocalHistory}
                        className="flex items-center gap-1 text-slate-400 text-xs hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={14} /> 清空本地缓存
                    </button>
                    <button 
                        onClick={handleSaveSettings}
                        className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all active:scale-95 shadow-md"
                    >
                        <CheckCircle2 size={14} /> 保存配置
                    </button>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* DB Connection Error Alert */}
        {dbError && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-600">
                 <AlertCircle size={16} /> {dbError}
             </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-slate-200 rounded-xl mb-6 shadow-inner">
          <button 
            onClick={() => setActiveTab('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'record' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity size={16} /> 觉察录入
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'map' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Map size={16} /> 注意力地图
          </button>
        </div>

        {activeTab === 'record' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Trend Chart */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <TrendChart data={logs} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-teal-100/50 relative overflow-hidden group transition-shadow hover:shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-purple-400 to-orange-400"></div>
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="此刻你的身体感觉如何？有什么念头经过？..."
                    className="w-full h-32 resize-none bg-transparent text-lg text-slate-700 placeholder:text-slate-300 focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || !input.trim()}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white shadow-md transition-all 
                        ${loading || !input.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                AI 感知中...
                            </span>
                        ) : <><Send size={18} /> 铸造资产</>}
                    </button>
                </div>
            </div>

            {/* Latest Result */}
            {latestLog && (
                <div className="space-y-6 relative">
                     {/* Delete Button for the Latest Card */}
                    <button 
                        onClick={() => handleDeleteLog(latestLog.id)}
                        className="absolute top-0 right-0 p-2 text-slate-300 hover:text-red-400 transition-colors z-10"
                        title="删除此记录"
                    >
                        <Trash2 size={16} />
                    </button>

                    {/* Safety Check: Only render analysis if valid */}
                    {latestLog.ai_result ? (
                        <>
                            {/* Summary Badge */}
                            <div className="flex justify-center">
                                <span className="bg-teal-50 text-teal-700 px-4 py-1 rounded-full text-xs font-medium border border-teal-100 shadow-sm">
                                    最新状态: {latestLog.ai_result.summary || '无摘要'}
                                </span>
                            </div>

                            {/* Gauges */}
                            <div className="flex justify-around items-end px-2">
                                <Gauge label="平静度" score={latestLog.ai_result.scores?.calmness ?? 0} icon="🕊️" theme="peace" />
                                <Gauge label="觉察度" score={latestLog.ai_result.scores?.awareness ?? 0} icon="👁️" theme="awareness" />
                                <Gauge label="能量水平" score={latestLog.ai_result.scores?.energy ?? 0} icon="🔋" theme="energy" />
                            </div>

                            {/* Insights Card */}
                            <div className="bg-purple-50 rounded-2xl p-5 border-l-4 border-purple-600 shadow-sm">
                                <h4 className="text-purple-800 font-bold text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                                    💡 深度洞察
                                </h4>
                                <ul className="space-y-2">
                                    {latestLog.ai_result.key_insights?.map((insight, i) => (
                                        <li key={i} className="text-purple-900 text-sm leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-purple-400">
                                            {insight}
                                        </li>
                                    )) || <li className="text-purple-900 text-sm italic">暂无洞察数据</li>}
                                </ul>
                            </div>

                            {/* Actionable Advice */}
                            <div className="bg-emerald-50 rounded-2xl p-5 border border-dashed border-emerald-300">
                                <h4 className="text-emerald-700 font-bold text-sm mb-2">💊 身心灵调适建议</h4>
                                <p className="text-emerald-800 text-sm leading-relaxed">
                                    {latestLog.ai_result.recommendations?.holistic_advice || '暂无建议'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-400 bg-slate-100 rounded-2xl">
                             AI 分析数据不可用，请尝试删除此条记录后重试。
                        </div>
                    )}
                </div>
            )}

            {/* History List (Mini View) - Filtered for Today */}
            {todayHistoryLogs.length > 0 && (
                <div className="pt-8 border-t border-slate-200">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">今日历史记录</h3>
                    <div className="space-y-3">
                        {todayHistoryLogs.map(log => (
                            <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center hover:border-slate-300 transition-colors group">
                                <div>
                                    <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    {/* Display User Input Text Explicitly */}
                                    <div className="text-sm font-medium text-slate-700 mt-1 line-clamp-2">
                                        {log.user_input}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {log.ai_result?.scores && (
                                        <div className="flex gap-1">
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">平 {log.ai_result.scores.calmness}</span>
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">觉 {log.ai_result.scores.awareness}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-1">你的注意力在哪里？</h3>
                 <p className="text-slate-400 text-xs mb-6">今日时空坐标系中的念头分布（仅显示当天数据）</p>
                 <AttentionMap data={logs} />
             </div>

             {latestLog && latestLog.ai_result && (
                 <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-100 rounded-full opacity-50"></div>
                    <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                        <span className="text-2xl">🦒</span> AI 陪伴旁白 (NVC)
                    </h3>
                    <div className="relative">
                        <span className="absolute -left-2 -top-2 text-4xl text-slate-200 font-serif">“</span>
                        <p className="text-lg font-serif italic text-slate-600 leading-relaxed px-4 text-center">
                            {latestLog.ai_result.nvc_guide?.empathy_response || '我在倾听...'}
                        </p>
                        <span className="absolute -right-2 -bottom-4 text-4xl text-slate-200 font-serif">”</span>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-xs text-slate-400 uppercase mb-1">观察</div>
                            <div className="text-xs font-medium text-slate-700 truncate" title={latestLog.ai_result.nvc_guide?.observation}>
                                {latestLog.ai_result.nvc_guide?.observation || '-'}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase mb-1">感受</div>
                            <div className="text-xs font-medium text-slate-700 truncate" title={latestLog.ai_result.nvc_guide?.feeling}>
                                {latestLog.ai_result.nvc_guide?.feeling || '-'}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase mb-1">需要</div>
                            <div className="text-xs font-medium text-slate-700 truncate" title={latestLog.ai_result.nvc_guide?.need}>
                                {latestLog.ai_result.nvc_guide?.need || '-'}
                            </div>
                        </div>
                    </div>
                 </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
