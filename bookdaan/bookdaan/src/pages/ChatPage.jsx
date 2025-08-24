import MyChats from './MyChats';

const ChatPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-3xl font-bold text-center text-indigo-600 mb-6">💬 Chat Center</h1>
      <MyChats />
    </div>
  );
};

export default ChatPage;
