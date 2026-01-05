import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { ArrowLeft, RefreshCw, Trash2, Lock, Unlock, UserCheck, XCircle, Play } from 'lucide-react';

interface QueueEntry {
  user: {
    _id: string;
    fullName: string;
    telegramId: number;
  } | null;
  labNumber: number;
  joinedAt: string;
  position?: number;
  status?: string;
}

interface Queue {
  _id: string;
  isActive: boolean;
  entries: QueueEntry[];
  config?: {
    maxSlots: number;
    minMaxRule: boolean;
    priorityMove: boolean;
    maxAttempts: number;
  }
}

export default function QueueView() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [labNum, setLabNum] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const MAX_SLOTS = 35;
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1);
  const tgUser = WebApp.initDataUnsafe.user;
  
  const myEntry = queue?.entries?.find(e => e.user?.telegramId === tgUser?.id);

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/queues/subject/${subjectId}`);
      // Перевіряємо, чи прийшов об'єкт, а не html помилки
      if (res.data && typeof res.data === 'object') {
          setQueue(res.data);
      } else {
          setQueue(null);
      }
    } catch (e) { 
        console.error("Queue fetch error:", e); 
        setQueue(null);
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [subjectId]);

    const handleJoin = async (slotNum?: number) => {
        if (!queue || !tgUser) return;

        const positionToTake = slotNum || 1; 
        const labToTake = Number(prompt("Яку лабу здаємо? (Введіть номер)", "1"));

        if (!labToTake) return;

        try {
            await api.post('/queues/join', { 
                queueId: queue._id, 
                telegramId: tgUser.id, 
                labNumber: labToTake,
                position: positionToTake 
            });
            fetchQueue();
        } catch (e: any) { 
            alert(e.response?.data?.message || 'Помилка'); 
        }
    };

  const handleLeave = async () => {
    if (!queue || !tgUser) return;
    if (confirm('Вийти з черги?')) {
        await api.post('/queues/leave', { queueId: queue._id, telegramId: tgUser.id });
        fetchQueue();
    }
  };

  const handleCreateQueue = async () => {
      try {
          await api.post('/queues', { subjectId });
          fetchQueue();
      } catch (e) { alert('Помилка створення черги'); }
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
            {queue && (
                <button onClick={handleToggle} className="p-2 text-gray-500 bg-gray-100 rounded-full">
                    {queue.isActive ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            )}
            <button onClick={fetchQueue} className="p-2 text-blue-600 bg-blue-50 rounded-full">
                <RefreshCw size={18} />
            </button>
         </div>
       </div>

       <div className="flex-1 p-4 overflow-auto">
          {!queue ? (
              <div className="text-center mt-20">
                  <p className="text-gray-400 mb-4">Чергу ще не створено</p>
                  <button 
                    onClick={handleCreateQueue}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto shadow-lg shadow-blue-200 active:scale-95 transition"
                  >
                    <Play size={20} /> Відкрити чергу
                  </button>
              </div>
          ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="mb-4 font-bold text-gray-700">Оберіть місце (всього 30):</h3>
                      
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: queue.config?.maxSlots || 30 }, (_, i) => i + 1).map((slotNumber) => {
                      const entry = queue.entries?.find(e => e.position === slotNumber);
                      const isMyEntry = entry?.user?.telegramId === tgUser?.id;
                    
                      return (
                        <div 
                          key={slotNumber} 
                          className={`
                            relative p-2 rounded-lg border-2 text-center min-h-[80px] flex flex-col items-center justify-center transition-all
                            ${entry 
                              ? isMyEntry ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-100' 
                              : 'border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 cursor-pointer'}
                          `}
                          onClick={() => !entry && handleJoin(slotNumber)}
                        >
                          <span className="absolute top-1 left-2 text-xs text-gray-400 font-bold">{slotNumber}</span>
                            
                          {entry ? (
                            <>
                              <span className="text-xs font-bold text-gray-800 break-all leading-tight">
                                {entry.user?.fullName?.split(' ')[1] || 'Студент'}
                              </span>
                              <span className="text-[10px] text-gray-500 mt-1">Лаба {entry.labNumber}</span>

                              {isMyEntry && (
                                 <button onClick={(e) => { e.stopPropagation(); handleLeave(); }} className="text-red-500 mt-1 absolute bottom-1 right-1">
                                   <XCircle size={14}/>
                                 </button>
                              )}

                              {!isMyEntry && entry.user && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(entry.user) handleKick(entry.user._id, entry.user.fullName); 
                                  }} 
                                  className="text-gray-400 hover:text-red-600 absolute top-1 right-1"
                                >
                                   <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-green-600 font-bold text-xl">+</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>
          )}
       </div>

       {queue && (
           <div className="p-4 bg-white border-t sticky bottom-0 safe-area-bottom">
               {!queue.isActive && !myEntry ? (
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
                       <button onClick={() => handleJoin()} className="flex-1 bg-green-600 text-white font-bold rounded-xl">OK</button>
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
       )}
    </div>
  );
}