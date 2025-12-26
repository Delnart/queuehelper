import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { ArrowLeft, RefreshCw, UserCheck, Trash2, Lock, Unlock, XCircle } from 'lucide-react';

// Типи даних
interface QueueEntry {
  user: {
    _id: string;
    fullName: string;
    telegramId: number;
  };
  labNumber: number;
  joinedAt: string;
}

interface Queue {
  _id: string;
  isActive: boolean;
  entries: QueueEntry[];
}

export default function QueueView() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [labNum, setLabNum] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Визначаємо поточного юзера
  const tgUser = WebApp.initDataUnsafe.user;
  
  // Перевіряємо, чи я в черзі
  const myEntry = queue?.entries.find(e => e.user.telegramId === tgUser?.id);

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/queues/active/${subjectId}`);
      if (res.data) setQueue(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Оновлення раз на 5 сек
    return () => clearInterval(interval);
  }, [subjectId]);

  const handleJoin = async () => {
    if (!queue || !labNum || !tgUser) return;
    try {
        await api.post('/queues/join', { queueId: queue._id, telegramId: tgUser.id, labNumber: Number(labNum) });
        setIsJoining(false); setLabNum(''); fetchQueue();
    } catch (e: any) { alert(e.response?.data?.message || 'Помилка'); }
  };

  const handleLeave = async () => {
    if (!queue || !tgUser) return;
    if (confirm('Вийти з черги?')) {
        await api.post('/queues/leave', { queueId: queue._id, telegramId: tgUser.id });
        fetchQueue();
    }
  };

  const handleKick = async (targetUserId: string, name: string) => {
    if (!queue || !tgUser) return;
    if (confirm(`Видалити ${name} з черги?`)) {
        await api.post('/queues/kick', { queueId: queue._id, adminTgId: tgUser.id, targetUserId });
        fetchQueue();
    }
  };

  const handleToggle = async () => {
     if (!queue) return;
     await api.post('/queues/toggle', { queueId: queue._id });
     fetchQueue();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* HEADER */}
       <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
         <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-gray-600"><ArrowLeft /></button>
            <div>
                <h1 className="font-bold text-lg leading-none">Черга</h1>
                {queue && (
                    <span className={`text-xs ${queue.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {queue.isActive ? 'Відкрито' : 'Закрито'}
                    </span>
                )}
            </div>
         </div>
         <div className="flex gap-2">
            {/* Кнопка закриття черги (Тільки для адмінів - тут поки показуємо всім для тесту) */}
            <button onClick={handleToggle} className="p-2 text-gray-500 bg-gray-100 rounded-full">
                {queue?.isActive ? <Unlock size={18} /> : <Lock size={18} />}
            </button>
            <button onClick={fetchQueue} className="p-2 text-blue-600 bg-blue-50 rounded-full">
                <RefreshCw size={18} />
            </button>
         </div>
       </div>

       {/* LIST */}
       <div className="flex-1 p-4 overflow-auto">
          {!queue ? <p className="text-center mt-10 text-gray-400">Завантаження...</p> : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {queue.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                              <span className="text-gray-400 font-medium w-6">{idx + 1}</span>
                              <div>
                                  <p className="font-bold text-gray-800">{entry.user.fullName}</p>
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                      Лаба {entry.labNumber}
                                  </span>
                              </div>
                          </div>
                          
                          {/* Кнопка видалення (показуємо, якщо це не я) */}
                          {entry.user.telegramId !== tgUser?.id && (
                              <button 
                                onClick={() => handleKick(entry.user._id, entry.user.fullName)}
                                className="text-gray-300 hover:text-red-500 p-2"
                              >
                                  <Trash2 size={18} />
                              </button>
                          )}
                      </div>
                  ))}
                  {queue.entries.length === 0 && <div className="p-8 text-center text-gray-400">Пусто...</div>}
              </div>
          )}
       </div>

       {/* FOOTER ACTION */}
       <div className="p-4 bg-white border-t sticky bottom-0 safe-area-bottom">
           {!queue?.isActive && !myEntry ? (
               <div className="w-full py-4 bg-gray-200 text-gray-500 rounded-xl font-bold text-center flex items-center justify-center gap-2">
                   <Lock size={20} /> Запис закрито
               </div>
           ) : myEntry ? (
               <button 
                  onClick={handleLeave}
                  className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold shadow-sm active:scale-95 transition flex items-center justify-center gap-2"
               >
                  <XCircle /> Вийти з черги
               </button>
           ) : isJoining ? (
               <div className="flex gap-2 animate-in slide-in-from-bottom">
                   <input 
                      type="number" placeholder="#"
                      className="w-20 p-3 bg-gray-100 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      value={labNum} onChange={e => setLabNum(e.target.value)} autoFocus
                   />
                   <button onClick={handleJoin} className="flex-1 bg-green-600 text-white font-bold rounded-xl">OK</button>
                   <button onClick={() => setIsJoining(false)} className="p-3 bg-gray-200 rounded-xl">✕</button>
               </div>
           ) : (
               <button 
                  onClick={() => setIsJoining(true)}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition flex items-center justify-center gap-2"
               >
                  <UserCheck /> Записатися
               </button>
           )}
       </div>
    </div>
  );
}