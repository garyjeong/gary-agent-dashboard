'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Save, Send } from 'lucide-react';

interface TelegramSettings {
  template: string;
  chat_id: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TelegramSettings>({
    template: '',
    chat_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/telegram');
      const data = await res.json();
      setSettings({
        template: data.template || '',
        chat_id: data.chat_id || '',
      });
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      } else {
        throw new Error('저장 실패');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };
  
  const testNotification = async () => {
    setTesting(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/settings/telegram/test', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: '테스트 알림이 전송되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.message || '알림 전송 실패' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '테스트 알림 전송에 실패했습니다.' });
    } finally {
      setTesting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <h2 className="text-lg font-semibold text-gray-900">설정</h2>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            {/* 알림 메시지 */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
            
            {/* 텔레그램 설정 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">텔레그램 알림 설정</h3>
              
              {/* Chat ID */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={settings.chat_id || ''}
                  onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="텔레그램 Chat ID"
                />
                <p className="mt-1 text-xs text-gray-500">
                  @BotFather로 봇 생성 후, 봇에게 메시지를 보내고 
                  https://api.telegram.org/bot[TOKEN]/getUpdates 에서 chat.id 확인
                </p>
              </div>
              
              {/* 템플릿 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  알림 템플릿
                </label>
                <textarea
                  value={settings.template}
                  onChange={(e) => setSettings({ ...settings, template: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  사용 가능한 변수: {'{{issue_title}}'}, {'{{repo_name}}'}, {'{{status}}'}, {'{{completed_at}}'}, {'{{result}}'}
                </p>
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : '저장'}
                </button>
                
                <button
                  onClick={testNotification}
                  disabled={testing || !settings.chat_id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {testing ? '전송 중...' : '테스트 알림'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
