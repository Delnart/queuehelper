import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import api from './api';
import { Loader2 } from 'lucide-react';
import SubjectList from './pages/SubjectList';
import QueueView from './pages/QueueView';

interface TgUser {
  id: number;
  first_name: string;
}

interface Group {
  _id: string; // Mongo ID
  name: string;
  telegramChatId: number;
}

// Компонент списку груп (домашня сторінка)
function Home() {
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      const user = WebApp.initDataUnsafe.user as TgUser;
      setTgUser(user);
      api.get(`/groups/my/${user.id}`)
         .then(res => setMyGroups(res.data))
         .catch(console.error)
         .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!tgUser) return <div className="p-10 text-center">Будь ласка, відкрий через Telegram</div>;

  if (myGroups.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Групи не знайдено</h2>
        <p className="text-gray-500 text-sm">Напиши /join в чаті своєї групи.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
           {tgUser.first_name[0]}
         </div>
         <h1 className="text-2xl font-bold text-gray-800">Мої Групи</h1>
      </div>
      <div className="space-y-3">
        {myGroups.map((group) => (
          <div 
            key={group._id} 
            onClick={() => navigate(`/group/${group._id}`)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition cursor-pointer flex justify-between items-center"
          >
             <span className="font-bold text-lg">{group.name}</span>
             <span className="text-gray-400">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Головний роутер
function App() {
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/group/:groupId" element={<SubjectList />} />
      <Route path="/queue/:subjectId" element={<QueueView />} />
    </Routes>
  );
}

export default App;