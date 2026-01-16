import { useState, useEffect, useMemo } from 'react';
import { initialData } from './data';
import { 
  CheckCircle2, AlertTriangle, XCircle, Activity, 
  Plus, Trash2, Settings2, Save, Server,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

function App() {
  // 1. 动态数据源：优先读取本地存储
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('status-lite-v2');
    return saved ? JSON.parse(saved) : initialData;
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', description: '' });

  // 2. 自动保存：任何修改都会实时写入 LocalStorage
  useEffect(() => {
    localStorage.setItem('status-lite-v2', JSON.stringify(services));
  }, [services]);

  // 计算整体健康度
  const systemHealth = useMemo(() => {
    if (services.some(s => s.status === 'outage')) return 'outage';
    if (services.some(s => s.status === 'degraded')) return 'degraded';
    return 'operational';
  }, [services]);

  // 样式配置
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/20', pulse: '16, 185, 129' };
      case 'degraded': return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/20', pulse: '245, 158, 11' };
      case 'outage': return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/20', pulse: '244, 63, 94' };
      default: return { text: 'text-zinc-400', bg: 'bg-zinc-500', border: 'border-zinc-500/20', pulse: '113, 113, 122' };
    }
  };

  const currentTheme = getStatusColor(systemHealth);

  // --- 手动控制功能 ---
  
  // 切换状态 (Green -> Yellow -> Red)
  const cycleStatus = (id) => {
    const states = ['operational', 'degraded', 'outage'];
    setServices(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, status: states[(states.indexOf(s.status) + 1) % states.length] };
    }));
  };

  // 删除站点
  const deleteService = (id) => {
    if (confirm('Delete this monitor?')) setServices(prev => prev.filter(s => s.id !== id));
  };

  // 新增站点
  const addService = (e) => {
    e.preventDefault();
    if (!newService.name) return;
    setServices([...services, {
      id: Date.now().toString(),
      name: newService.name,
      description: newService.description || 'System Service',
      status: 'operational',
      uptime: '100%'
    }]);
    setNewService({ name: '', description: '' });
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 font-sans selection:bg-zinc-700 bg-[#09090b]">
      
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* 🟢 全局状态横幅 (顶部) */}
        <motion.div 
          layout
          className={cn(
            "relative overflow-hidden rounded-3xl border bg-zinc-900/50 backdrop-blur-xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl transition-colors duration-500",
            currentTheme.border
          )}
        >
          {/* 背景光效 */}
          <div className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none", currentTheme.bg)} />
          
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-3 h-3">
                 <div className={cn("absolute inset-0 rounded-full animate-ping opacity-75", currentTheme.bg)} />
                 <div className={cn("relative w-3 h-3 rounded-full", currentTheme.bg)} />
              </div>
              <span className={cn("text-xs font-bold tracking-[0.2em] uppercase", currentTheme.text)}>
                System Status
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              {systemHealth === 'operational' ? 'All Systems Operational' : 
               systemHealth === 'degraded' ? 'Performance Degraded' : 'System Outage'}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
             <div className="text-sm text-zinc-400 font-mono">
               Active Monitors: <span className="text-white">{services.length}</span>
             </div>
             <div className="text-xs text-zinc-600">
               Last updated: Now
             </div>
          </div>
        </motion.div>

        {/* 🔵 服务网格 (3列布局) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zinc-200 flex items-center gap-2">
              <LayoutGrid size={20} className="text-zinc-500" /> 
              Services Dashboard
            </h2>
            {isAdmin && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
              >
                <Plus size={16} /> Add Monitor
              </button>
            )}
          </div>

          {/* 强制 3 列 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {services.map((service) => {
                const sColor = getStatusColor(service.status);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-600 transition-all duration-300",
                      isAdmin && "hover:shadow-xl cursor-default"
                    )}
                  >
                    {/* 顶部彩色条 */}
                    <div className={cn("absolute top-0 inset-x-6 h-[2px]", sColor.bg)} />

                    <div className="flex justify-between items-start mb-4 mt-2">
                      <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/50">
                        <Server size={20} className={cn("transition-colors", sColor.text)} />
                      </div>
                      
                      {/* 状态胶囊 */}
                      <div 
                        onClick={() => isAdmin && cycleStatus(service.id)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all select-none",
                          sColor.text, "bg-zinc-950 border-zinc-800",
                          isAdmin && "cursor-pointer hover:border-zinc-500 hover:bg-zinc-800"
                        )}
                        title={isAdmin ? "Click to change status" : ""}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", sColor.bg)} />
                        {service.status.toUpperCase()}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-100 mb-1">{service.name}</h3>
                    <p className="text-sm text-zinc-500 h-10 line-clamp-2">{service.description}</p>

                    <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                      <div className="text-xs font-mono text-zinc-500">
                        Uptime <span className="text-zinc-300 ml-1">{service.uptime}</span>
                      </div>
                      
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteService(service.id); }}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-md"
                          title="Delete Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* 新增按钮占位符 (仅管理模式) */}
            {isAdmin && (
              <motion.button
                layout
                onClick={() => setIsAddModalOpen(true)}
                className="min-h-[200px] rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/30 transition-all gap-2 group"
              >
                <div className="p-3 bg-zinc-900 rounded-full group-hover:bg-zinc-800 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-bold">Add New Service</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* ⚙️ 右下角管理开关 */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className={cn(
            "p-4 rounded-full shadow-2xl backdrop-blur border border-white/10 transition-all duration-300 hover:scale-110",
            isAdmin ? "bg-white text-black rotate-90" : "bg-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          {isAdmin ? <Save size={24} /> : <Settings2 size={24} />}
        </button>
      </div>

      {/* 弹窗组件 (保持功能) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4"
          >
            <motion.div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Add Monitor</h3>
              <form onSubmit={addService} className="space-y-4">
                <input 
                  autoFocus value={newService.name}
                  onChange={e => setNewService({...newService, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20"
                  placeholder="Service Name (e.g. API)"
                />
                <input 
                  value={newService.description}
                  onChange={e => setNewService({...newService, description: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20"
                  placeholder="Description"
                />
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={!newService.name} className="flex-1 py-3 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 disabled:opacity-50">Add</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;