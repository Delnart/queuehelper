import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { ArrowLeft, Crown, Shield, User, Edit } from 'lucide-react';

interface GroupMember {
  user: {
    _id: string;
    fullName: string;
    username?: string;
    telegramId?: number;
  };
  role: string;
}

interface Group {
  _id: string;
  title: string;
  members: GroupMember[];
}

const ROLES: Record<string, string> = {
  owner: 'Овнер',
  starosta: 'Староста',
  deputy: 'Зам',
  admin: 'Адмін черги',
  student: 'Студент',
};

export default function GroupView() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const tgUser = WebApp.initDataUnsafe.user;

  const fetchGroup = () => {
    api.get(`/groups/${groupId}`).then(res => setGroup(res.data));
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const myMember = group?.members.find(m => m.user?.telegramId === tgUser?.id);
  const myRole = myMember?.role || 'student';

  // Перевіряємо, чи маю я право міняти ролі (Тільки Овнер та Староста)
  const canEdit = myRole === 'owner' || myRole === 'starosta';

  const handleRoleChange = async (userId: string, currentRole: string, userName: string) => {
    const newRoleKey = prompt(
      `Введіть нову роль для ${userName}:\nowner, starosta, deputy, admin, student`, 
      currentRole
    );
    
    if (newRoleKey && ROLES[newRoleKey] && tgUser) {
        try {
            await api.post('/groups/role', {
                groupId,
                adminTgId: tgUser.id,
                targetUserId: userId,
                newRole: newRoleKey
            });
            fetchGroup();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка зміни ролі');
        }
    }
  };

  const getIcon = (role: string) => {
      switch(role) {
          case 'owner': return <Crown size={16} className="text-yellow-500" />;
          case 'starosta': return <Shield size={16} className="text-blue-500" />;
          case 'deputy': return <Shield size={16} className="text-blue-300" />;
          case 'admin': return <Edit size={16} className="text-green-500" />;
          default: return <User size={16} className="text-gray-400" />;
      }
  };

  if (!group) return <div className="text-center p-10">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{group.title}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-medium text-gray-500">Учасники ({group.members.length})</div>
          {group.members.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getIcon(member.role)}
                      </div>
                      <div>
                          <p className="font-bold text-gray-800">{member.user?.fullName || 'Невідомий'}</p>
                          <p className="text-xs text-gray-500">{ROLES[member.role] || member.role}</p>
                      </div>
                  </div>
                  
                  {/* Показуємо кнопку редагування, ТІЛЬКИ якщо я маю права і це не я сам */}
                  {canEdit && member.user?._id !== myMember?.user?._id && (
                      <button 
                        onClick={() => member.user && handleRoleChange(member.user._id, member.role, member.user.fullName)}
                        className="p-2 text-gray-300 hover:text-blue-600"
                      >
                          <Edit size={16} />
                      </button>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
}