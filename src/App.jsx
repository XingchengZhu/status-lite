import { useState, useEffect, useMemo } from 'react';
import { initialData } from './data';
import { 
  Plus, Trash2, Settings2, Save, Server, 
  LayoutGrid, List as ListIcon, RefreshCw, 
  Globe, Clock, Activity, Zap, Code2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

function App() {
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('status-lite-v5');
    return saved ? JSON.parse(saved) : initialData;
  });

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('status-lite-view') || 'grid');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [newService, setNewService] = useState({ name: '', description: '', url: '' });

  useEffect(() => { localStorage.setItem('status-lite-v5', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('status-lite-view', viewMode); }, [viewMode]);

  const systemHealth = useMemo(() => {
    if (services.some(s => s.status === 'outage')) return 'outage';
    if (services.some(s => s.status === 'degraded')) return 'degraded';
    return 'operational';
  }, [services]);

  const getTheme = (status) => {
    switch (status) {
      case 'operational': return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/10' };
      case 'degraded': return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/10' };
      case 'outage': return { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10', glow: 'shadow-rose-500/10' };
      default: return { text: 'text-zinc-400', border: 'border-zinc-500/20', bg: 'bg-zinc-500/10', glow: 'shadow-zinc-500/10' };
    }
  };

  // 🧠 智能指标提取器 (Smart Metric Extractor)
  // 解析任意 JSON，提取看起来像"指标"的字段（数字、布尔值、短字符串）
  const extractMetrics = (data, prefix = '') => {
    let extracted = {};
    if (!data || typeof data !== 'object') return extracted;

    const interestingKeys = ['followers', 'following', 'public_repos', 'stars', 'forks', 'watchers', 'version', 'status', 'region', 'latency', 'uuid', 'origin'];
    
    Object.entries(data).forEach(([key, value]) => {
      // 1. 优先匹配特定关键词
      if (interestingKeys.includes(key.toLowerCase())) {
        extracted[key] = value;
      } 
      // 2. 或者提取简短的数值/字符串 (长度<10)
      else if (Object.keys(extracted).length < 4) { // 限制自动提取的数量，防止撑爆UI
        if (typeof value === 'number' || (typeof value === 'string' && value.length < 12)) {
          // 排除 URL 和长 ID
          if (!String(value).startsWith('http') && key !== 'id') {
             extracted[key] = value;
          }
        }
      }
    });
    return extracted;
  };

  const checkServiceHealth = async (service) => {
    if (!service.url) return service;
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(service.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const latency = Math.round(performance.now() - startTime);
      let newMetrics = { 'Latency': `${latency}ms` }; // 基础指标

      // 尝试解析 JSON 获取业务指标
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          const jsonData = await response.json();
          const autoMetrics = extractMetrics(jsonData);
          newMetrics = { ...newMetrics, ...autoMetrics };
        } catch(e) {}
      } else {
        // 如果不是 JSON，尝试获取 Headers
        const server = response.headers.get("server");
        if(server) newMetrics['Server'] = server;
        newMetrics['Type'] = response.statusText || 'HTML';
      }

      return { 
        ...service, 
        status: response.ok ? (latency > 1500 ? 'degraded' : 'operational') : 'outage', 
        metrics: newMetrics 
      };
    } catch (error) {
      return { ...service, status: 'outage', metrics: { 'Latency': 'Timeout' } };
    }
  };

  const handleCheckAll = async () => {
    setIsChecking(true);
    const results = await Promise.all(services.map(checkServiceHealth));
    setServices(results);
    setIsChecking(false);
  };

  useEffect(() => { handleCheckAll(); }, []);

  const deleteService = (id) => {
    if (confirm('Delete monitor?')) setServices(prev => prev.filter(s => s.id !== id));
  };

  const addService = (e) => {
    e.preventDefault();
    if (!newService.name) return;
    setServices([...services, {
      id: Date.now().toString(),
      name: newService.name,
      description: newService.description || 'Web Service',
      url: newService.url,
      status: 'operational',
      metrics: { 'Status': 'Pending' }
    }]);
    setNewService({ name: '', description: '', url: '' });
    setIsAddModalOpen(false);
    setTimeout(handleCheckAll, 100);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-zinc-700 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/60 pb-8">
          <div>
             <div className="flex items-center gap-3 mb-2">
               <div className={cn("w-2.5 h-2.5 rounded-full", getTheme(systemHealth).bg.replace('/10', ''))}>
                 <div className={cn("w-full h-full rounded-full animate-ping opacity-75", getTheme(systemHealth).bg.replace('/10', ''))} />
               </div>
               <span className={cn("text-xs font-bold tracking-widest uppercase", getTheme(systemHealth).text)}>System Status</span>
             </div>
             <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
               {systemHealth === 'operational' ? 'All Systems Operational' : 'Incidents Detected'}
             </h1>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 flex">
               {['grid', 'list'].map((mode) => (
                 <button 
                   key={mode}
                   onClick={() => setViewMode(mode)}
                   className={cn(
                     "p-2 rounded-md transition-all relative",
                     viewMode === mode ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                   )}
                 >
                   {viewMode === mode && (
                     <motion.div layoutId="tab-bg" className="absolute inset-0 bg-zinc-700 rounded-md shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.3 }} />
                   )}
                   <span className="relative z-10">
                     {mode === 'grid' ? <LayoutGrid size={18}/> : <ListIcon size={18}/>}
                   </span>
                 </button>
               ))}
             </div>
             
             <button 
               onClick={handleCheckAll} disabled={isChecking}
               className="flex items-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
               {isChecking ? "Updating..." : "Refresh"}
             </button>
          </div>
        </div>

        {/* 核心展示区：使用 LayoutGroup 确保切换模式时动画连贯 */}
        <LayoutGroup>
          <motion.div 
            layout 
            className={cn(
              "grid gap-5",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}
          >
            <AnimatePresence>
              {services.map((service) => {
                const theme = getTheme(service.status);
                
                return (
                  <motion.div
                    layout
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                      "group relative bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 transition-colors overflow-hidden backdrop-blur-sm",
                      viewMode === 'grid' ? "rounded-2xl p-6 flex flex-col" : "rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-6"
                    )}
                  >
                    {/* 状态顶条 (仅 Grid) */}
                    {viewMode === 'grid' && <div className={cn("absolute top-0 inset-x-0 h-1", theme.bg.replace('/10', ''))} />}

                    {/* 卡片头部 */}
                    <motion.div layout className={cn("flex-1 min-w-0")}>
                      <div className={cn("flex justify-between items-start", viewMode === 'grid' ? "mb-4" : "mb-1")}>
                         <div className="flex items-center gap-3">
                           <div className={cn("p-2 rounded-lg bg-zinc-950 border border-zinc-800", theme.text)}>
                              {service.url ? <Globe size={18} /> : <Server size={18} />}
                           </div>
                           {viewMode === 'list' && (
                             <div>
                               <h3 className="font-bold text-zinc-100 truncate">{service.name}</h3>
                               <p className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">{service.url}</p>
                             </div>
                           )}
                         </div>
                         
                         {/* 状态徽章 */}
                         <div className={cn(
                           "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5",
                           theme.text, theme.border, theme.bg
                         )}>
                           <div className={cn("w-1.5 h-1.5 rounded-full", theme.bg.replace('/10', ''))} />
                           {service.status}
                         </div>
                      </div>

                      {viewMode === 'grid' && (
                        <>
                          <h3 className="text-lg font-bold text-zinc-100 mb-1 truncate">{service.name}</h3>
                          <p className="text-xs text-zinc-500 truncate font-mono">{service.url || 'Internal Service'}</p>
                        </>
                      )}
                    </motion.div>

                    {/* 指标块展示区 (Metric Blocks) */}
                    <motion.div 
                      layout
                      className={cn(
                        "flex flex-wrap gap-2",
                        viewMode === 'grid' ? "mt-6 pt-4 border-t border-zinc-800/50" : "mt-4 md:mt-0 md:ml-auto md:justify-end min-w-[30%]"
                      )}
                    >
                      {Object.keys(service.metrics).length > 0 ? (
                        Object.entries(service.metrics).map(([k, v]) => (
                          <div key={k} className="flex flex-col bg-zinc-950/60 border border-zinc-800/60 rounded px-3 py-1.5 min-w-[70px]">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">{k}</span>
                            <span className={cn(
                              "text-xs font-mono font-medium truncate max-w-[120px]",
                              k === 'Latency' ? (parseInt(v) > 500 ? "text-amber-400" : "text-emerald-400") : "text-zinc-300"
                            )}>
                              {v}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-zinc-600 italic py-1">No metrics available</div>
                      )}
                    </motion.div>
                    
                    {/* 删除按钮 */}
                    {isAdmin && (
                      <button 
                        onClick={() => deleteService(service.id)}
                        className="absolute bottom-4 right-4 p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {/* 管理按钮 */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={cn(
              "p-3 rounded-full shadow-2xl backdrop-blur border border-white/10 transition-all hover:scale-110",
              isAdmin ? "bg-white text-black rotate-90" : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            {isAdmin ? <Save size={20} /> : <Settings2 size={20} />}
          </button>
        </div>

        {/* 新增弹窗 */}
        <AnimatePresence>
          {isAdmin && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-24 right-8 z-40">
               <button onClick={() => setIsAddModalOpen(true)} className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-colors">
                 <Plus size={20} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAddModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4"
            >
              <motion.div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Add Real Monitor</h3>
                <form onSubmit={addService} className="space-y-4">
                  <input autoFocus value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20" placeholder="Service Name" />
                  <input value={newService.url} onChange={e => setNewService({...newService, url: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 font-mono text-xs" placeholder="API URL (e.g. https://api.github.com/zen)" />
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                    <button type="submit" disabled={!newService.name} className="flex-1 py-3 bg-white text-black rounded-lg font-bold hover:bg-zinc-200">Add</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default App;