import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { ArrowLeft, RefreshCw, Trash2, Lock, Unlock, UserCheck, XCircle, Play, Clock } from 'lucide-react';

interface QueueEntry {
  user: {
    _id: string;
    fullName: string;
    telegramId: number;
    username?: string;
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
  
  // Змінюємо кількість слотів, якщо треба
  const MAX_SLOTS = queue?.config?.maxSlots || 35;
  
  const tgUser = WebApp.initDataUnsafe.user;
  
  const myEntry = queue?.entries?.find(e => e.user?.telegramId === tgUser?.id);

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/queues/subject/${subjectId}`);
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
      // Якщо вводимо номер лаби через інпут знизу, беремо його, інакше питаємо (для кліку по картці)
      let labToTake = labNum ? Number(labNum) : 0;
      
      if (!labToTake) {
          const promptVal = prompt("Яку лабу здаємо? (Введіть номер)", "1");
          if (!promptVal) return;
          labToTake = Number(promptVal);
      }

      try {
          await api.post('/queues/join', { 
              queueId: queue._id, 
              telegramId: tgUser.id, 
              labNumber: labToTake,
              position: positionToTake 
          });
          setLabNum(''); // Очистити поле
          setIsJoining(false);
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

  const getStatusColor = (status: string | undefined) => {
        switch(status) {
            case 'defending': return 'border-green-500 bg-green-50 ring-1 ring-green-200';
            case 'preparing': return 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-200';
            case 'failed': return 'border-red-500 bg-red-50';
            case 'waiting': return 'border-blue-200 bg-white';
            default: return 'border-gray-200 bg-gray-50'; // Порожнє місце
        }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* Хедер */}
       <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
         <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-gray-600 active:bg-gray-100 rounded-full transition"><ArrowLeft /></button>
            <div>
                <h1 className="font-bold text-lg leading-none">Черга</h1>
                {queue && (
                    <span className={`text-xs ${queue.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {queue.isActive ? '🟢 Відкрито' : '🔴 Закрито'}
                    </span>
                )}
            </div>
         </div>
         <div className="flex gap-2">
            {queue && (
                <button onClick={handleToggle} className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                    {queue.isActive ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            )}
            <button onClick={fetchQueue} className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition">
                <RefreshCw size={18} />
            </button>
         </div>
       </div>

       {/* Основна частина */}
       <div className="flex-1 p-3 overflow-y-auto">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 pb-20">
                <h3 className="mb-4 font-bold text-gray-700 flex justify-between items-center">
                    <span>Місця в черзі</span>
                    <span className="text-xs font-normal text-gray-400">Всього: {MAX_SLOTS}</span>
                </h3>
                      
                {/* Сітка 3 колонки */}
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).map((slotNumber) => {
                      const entry = queue.entries?.find(e => e.position === slotNumber);
                      const isMyEntry = entry?.user?.telegramId === tgUser?.id;
                      
                      // Статус для кольору картки
                      const statusClass = entry ? getStatusColor(entry.status) : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
                      const activeClass = isMyEntry ? 'ring-2 ring-blue-500 shadow-md transform scale-[1.02]' : '';

                      return (
                        <div 
                          key={slotNumber} 
                          className={`
                            relative p-2 rounded-xl border-2 text-center min-h-[110px] flex flex-col items-center justify-center transition-all duration-200
                            ${statusClass} ${activeClass}
                          `}
                          onClick={() => !entry && handleJoin(slotNumber)}
                        >
                          {/* Номер місця */}
                          <span className={`absolute top-1 left-2 text-[10px] font-bold ${entry ? 'text-gray-500' : 'text-gray-300'}`}>
                              #{slotNumber}
                          </span>
                            
                          {entry ? (
                            <>
                              {/* Аватарка */}
                              <div className="w-10 h-10 rounded-full bg-gray-200 mb-1 overflow-hidden shadow-sm border border-white">
                                  {entry.user?.username ? (
                                      <img 
                                        src={`https://t.me/i/userpic/320/${entry.user.username}.jpg`} 
                                        alt={entry.user.fullName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                                      />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                        {entry.user?.fullName?.charAt(0)}
                                    </div>
                                  )}
                              </div>

                              {/* Ім'я */}
                              <span className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2 h-7 flex items-center justify-center">
                                {entry.user?.fullName || 'Студент'}
                              </span>

                              {/* Лаба і статус */}
                              <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-gray-600 font-medium border border-gray-100">
                                      Лаб {entry.labNumber}
                                  </span>
                                  {entry.status === 'defending' && <Play size={12} className="text-green-600" fill="currentColor"/>}
                                  {entry.status === 'preparing' && <Clock size={12} className="text-yellow-600"/>}
                              </div>

                              {/* Кнопка виходу (своя) */}
                              {isMyEntry && (
                                 <button onClick={(e) => { e.stopPropagation(); handleLeave(); }} className="text-red-500 bg-white rounded-full p-0.5 shadow-sm absolute -top-1.5 -right-1.5 z-10">
                                   <XCircle size={16} fill="white"/>
                                 </button>
                              )}

                              {/* Кнопка кіку (для адмінів - логіку відображення можна додати пізніше, зараз показуємо всім чужим) */}
                              {!isMyEntry && entry.user && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(entry.user) handleKick(entry.user._id, entry.user.fullName); 
                                  }} 
                                  className="text-gray-300 hover:text-red-500 absolute top-1 right-1 transition-colors"
                                >
                                   <Trash2 size={12} />
                                </button>
                              )}
                            </>
                          ) : (
                            // Порожній слот
                            <div className="flex flex-col items-center opacity-50">
                                <span className="text-blue-500 font-bold text-xl mb-[-4px]">+</span>
                                <span className="text-[9px] text-gray-400">Вільно</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>
          )}
       </div>

       {/* Нижнє меню дій */}
       {queue && (
           <div className="p-4 bg-white border-t sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               {!queue.isActive && !myEntry ? (
                   <div className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-center flex items-center justify-center gap-2">
                       <Lock size={20} /> Запис закрито
                   </div>
               ) : myEntry ? (
                   <div className="flex gap-2">
                       <div className="flex-1 bg-blue-50 text-blue-800 p-3 rounded-xl flex items-center justify-between px-4 border border-blue-100">
                           <span className="text-xs font-bold text-blue-400 uppercase">Ваше місце</span>
                           <span className="text-2xl font-black">{myEntry.position}</span>
                       </div>
                       <button 
                          onClick={handleLeave}
                          className="px-6 bg-red-100 text-red-600 rounded-xl font-bold active:scale-95 transition flex items-center justify-center"
                       >
                          <XCircle size={24} />
                       </button>
                   </div>
               ) : isJoining ? (
                   <div className="flex gap-2 animate-in slide-in-from-bottom duration-300">
                       <input 
                          type="number" placeholder="№ лаби"
                          className="w-24 p-3 bg-gray-100 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                          value={labNum} onChange={e => setLabNum(e.target.value)} autoFocus
                       />
                       <button 
                          onClick={() => handleJoin()} 
                          className="flex-1 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 active:scale-95 transition"
                       >
                          Зайняти місце
                       </button>
                       <button onClick={() => setIsJoining(false)} className="px-4 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200">✕</button>
                   </div>
               ) : (
                   <button 
                      onClick={() => setIsJoining(true)}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition flex items-center justify-center gap-2 text-lg"
                   >
                      <UserCheck size={24} /> Записатися в чергу
                   </button>
               )}
           </div>
       )}
    </div>
  );
}