export const initialData = [
  { 
    id: '1', 
    name: 'GitHub Profile', 
    description: 'Fetching real user data', 
    url: 'https://api.github.com/users/xingchengzhu', // 替换成你的 GitHub 用户名
    status: 'operational', 
    metrics: {} // 空对象，等待自动填充真实数据
  },
  { 
    id: '2', 
    name: 'IP Info (HttpBin)', 
    description: 'Public IP & Origin check', 
    url: 'https://httpbin.org/get', 
    status: 'operational', 
    metrics: {}
  },
  { 
    id: '3', 
    name: 'UUID Generator', 
    description: 'Testing JSON response', 
    url: 'https://httpbin.org/uuid', 
    status: 'operational', 
    metrics: {}
  }
];