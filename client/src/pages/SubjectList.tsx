import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Plus, BookOpen } from 'lucide-react';
import { Settings } from 'lucide-react';

interface Subject {
  _id: string;
  title: string;
  teacher?: string;
}

export default function SubjectList() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    api.get(`/subjects/group/${groupId}`).then(res => setSubjects(res.data));
  }, [groupId]);

  const createSubject = async () => {
    if (!newSubjectName) return;
    await api.post('/subjects', { title: newSubjectName, groupId });
    setNewSubjectName('');
    setIsCreating(false);
    // Reload list
    const res = await api.get(`/subjects/group/${groupId}`);
    setSubjects(res.data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Предмети</h1>
        <button onClick={() => navigate(`/group/${groupId}/settings`)} className="p-2 bg-white rounded-full text-gray-600">
        <Settings size={24} />
    </button>
      </div>
      <div className="grid gap-3">
        {subjects.map(sub => (
          <div 
            key={sub._id} 
            onClick={() => navigate(`/queue/${sub._id}`)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{sub.title}</h3>
                {sub.teacher && <p className="text-xs text-gray-500">{sub.teacher}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="mt-6 bg-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <input
            autoFocus
            className="w-full p-3 bg-gray-50 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Назва предмету..."
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => setIsCreating(false)} className="flex-1 py-2 text-gray-500">Скасувати</button>
            <button onClick={createSubject} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium">Створити</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsCreating(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-90 transition"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
}