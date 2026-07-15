import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function decodeHtmlEntities(str) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  return doc.documentElement.textContent || str;
}

function PostSkeleton() {
  return (
    <div className="w-full border border-mono-light-200 dark:border-mono-dark-200 p-4 bg-mono-light-base dark:bg-mono-dark-base rounded-xl animate-pulse space-y-2">
      <div className="h-4 w-5/6 bg-mono-light-300 dark:bg-mono-dark-400 rounded" />
      <div className="h-2 w-24 bg-mono-light-200 dark:bg-mono-dark-300 rounded" />
    </div>
  );
}

function SubredditLane({ subreddit, onRemove }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const sanitizedSub = subreddit.toLowerCase().trim();
    const callbackName = `reddit_rss_${sanitizedSub}_${Math.random().toString(36).substring(2, 9)}`;

    const fetchJsonpRSS = () => {
      setIsLoading(true);
      setIsError(false);
      setErrorText('');

      window[callbackName] = (rawData) => {
        if (!isMounted) return;

        try {
          const targetItems = rawData?.data?.children || [];
          
          if (!targetItems || targetItems.length === 0) {
            throw new Error('No items found or feed format mismatch');
          }

          const formattedPosts = targetItems.map((item, index) => {
            const postData = item.data;
            return {
              id: postData.id || `fallback-id-${index}`,
              title: decodeHtmlEntities(postData.title || ''),
              author: postData.author || 'anonymous',
              ups: postData.ups ?? postData.score ?? 0,
              link: postData.permalink ? `https://www.reddit.com${postData.permalink}` : '#',
              pubDate: postData.created_utc * 1000 || Date.now()
            };
          });

          setPosts(formattedPosts);
          setIsLoading(false);
        } catch (err) {
          setIsError(true);
          setErrorText(err.message || 'Parsing failure');
          setIsLoading(false);
        }
        cleanup();
      };

      const script = document.createElement('script');
      script.id = `script_handler_${callbackName}`;
      script.src = `https://www.reddit.com/r/${sanitizedSub}.json?jsonp=${callbackName}&t=${Date.now()}`;
      
      script.onerror = () => {
        if (!isMounted) return;
        setIsError(true);
        setErrorText('Failed to stream subreddit feed');
        setIsLoading(false);
        cleanup();
      };

      const cleanup = () => {
        const targetEl = document.getElementById(`script_handler_${callbackName}`);
        if (targetEl) targetEl.remove();
        if (window[callbackName]) delete window[callbackName];
      };

      document.body.appendChild(script);
    };

    fetchJsonpRSS();

    return () => {
      isMounted = false;
      const targetEl = document.getElementById(`script_handler_${callbackName}`);
      if (targetEl) targetEl.remove();
      if (window[callbackName]) delete window[callbackName];
    };
  }, [subreddit, refreshTrigger]);

  return (
    <div className="w-full border border-mono-light-200 dark:border-mono-dark-200 bg-mono-light-50 dark:bg-mono-dark-50 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      
      {/* Header Panel Area */}
      <div className="p-4 border-b border-mono-light-200 dark:border-mono-dark-200 bg-mono-light-100 dark:bg-mono-dark-100 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="text-xs font-black tracking-tight text-mono-light-950 dark:text-mono-dark-950 lowercase">
            r/{subreddit}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-40">
            {isLoading ? 'Syncing...' : `${posts.length} Posts`}
          </span>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-mono-light-600 dark:text-mono-dark-400 hover:text-mono-light-950 dark:hover:text-mono-dark-950 font-bold text-sm cursor-pointer"
          >
            ⋮
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 mt-1 w-28 bg-mono-light-base dark:bg-mono-dark-base border border-mono-light-200 dark:border-mono-dark-200 rounded-xl shadow-md z-30 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setRefreshTrigger(prev => prev + 1);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-mono-light-800 dark:text-mono-dark-800 hover:bg-mono-light-50 dark:hover:bg-mono-dark-50 cursor-pointer border-b border-mono-light-100 dark:border-mono-dark-100"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    onRemove(subreddit);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-red-600 hover:bg-mono-light-50 dark:hover:bg-mono-dark-50 cursor-pointer"
                >
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Column Post Stream Viewport */}
      <div className="p-4 max-h-96 overflow-y-auto space-y-3 custom-scrollbar">
        {isLoading && (
          <div className="space-y-3">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {isError && (
          <div className="p-4 border border-mono-light-200 dark:border-mono-dark-300 bg-mono-light-base dark:bg-mono-dark-base text-mono-light-600 dark:text-mono-dark-400 text-[10px] font-mono rounded-xl text-center uppercase tracking-wider">
            Error: {errorText}
          </div>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <div className="text-center font-mono text-[9px] opacity-40 py-10 uppercase tracking-widest">
            Feed Empty
          </div>
        )}

        {!isLoading && !isError && posts.map(post => (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border border-mono-light-200 dark:border-mono-dark-200 bg-mono-light-base dark:bg-mono-dark-base rounded-xl space-y-3 shadow-2xs hover:border-mono-light-400 dark:hover:border-mono-dark-400 transition-colors cursor-pointer"
          >
            <h3 className="text-xs font-bold tracking-tight leading-snug line-clamp-3 text-mono-light-950 dark:text-mono-dark-950">
              {post.title}
            </h3>

            {/* Sub-card data context: explicitly showing post score and u/ user context handles */}
            <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-wider opacity-50 pt-1 border-t border-mono-light-400 dark:border-mono-dark-400">
              <span className="truncate max-w-[70%] text-mono-light-600 dark:text-mono-dark-800">
                u/{post.author}
              </span>
              <span className="font-bold shrink-0 bg-mono-light-100 dark:bg-mono-dark-100 px-1.5 py-0.5 rounded-sm">
                {post.ups.toLocaleString()} Votes
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  // Starts with an entirely clean state array layout map, ensuring no hardcoded generation happens
  const [lanes, setLanes] = useState(() => {
    const saved = localStorage.getItem('reddit_dashboard_lanes');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputSubreddit, setInputSubreddit] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('reddit_dashboard_lanes', JSON.stringify(lanes));
  }, [lanes]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAddLaneSubmit = (e) => {
    e.preventDefault();
    const formatted = inputSubreddit.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!formatted) return;

    if (!lanes.includes(formatted)) {
      setLanes([...lanes, formatted]);
    }
    
    setInputSubreddit('');
    setIsModalOpen(false);
  };

  return (
    <div className="w-full min-h-screen bg-mono-light-base dark:bg-mono-dark-base text-mono-light-950 dark:text-mono-dark-950 flex flex-col font-sans transition-colors duration-200">
      
      <header className="border-b border-mono-light-200 dark:border-mono-dark-200 bg-mono-light-50 dark:bg-mono-dark-50 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-black tracking-widest uppercase">Reddit Client Board</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 border border-mono-light-950 dark:border-mono-dark-950 bg-mono-light-950 dark:bg-mono-dark-950 text-mono-light-base dark:text-mono-dark-base text-[10px] font-bold tracking-wider rounded-xl uppercase hover:opacity-90 active:scale-98 transition-all cursor-pointer"
          >
            Add Subreddit
          </button>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1.5 border border-mono-light-200 dark:border-mono-dark-200 rounded-xl bg-mono-light-base dark:bg-mono-dark-base text-[9px] font-bold tracking-wider uppercase cursor-pointer hover:bg-mono-light-100 dark:hover:bg-mono-dark-100"
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-grow p-6 bg-mono-light-base dark:bg-mono-dark-base max-w-2xl mx-auto w-full">
        <div className="flex flex-col gap-6 w-full">
          <AnimatePresence mode="popLayout">
            {lanes.map((sub) => (
              <motion.div
                key={sub}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <SubredditLane subreddit={sub} onRemove={(target) => setLanes(lanes.filter(l => l !== target))} />
              </motion.div>
            ))}
          </AnimatePresence>

          {lanes.length === 0 && (
            <div className="w-full py-12 border border-dashed border-mono-light-200 dark:border-mono-dark-200 rounded-2xl text-center">
              <p className="font-mono text-[10px] tracking-widest text-mono-light-400 dark:text-mono-dark-400 uppercase px-4">
                No active tracking columns configured. Use the controller block above to spawn lanes.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Popup Component */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-mono-light-base dark:bg-mono-dark-base border border-mono-light-200 dark:border-mono-dark-200 p-6 rounded-2xl shadow-xl max-w-sm w-full relative"
            >
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[10px] font-bold tracking-wider text-mono-light-400 dark:text-mono-dark-600 hover:text-mono-light-950 dark:hover:text-mono-dark-950 uppercase cursor-pointer"
              >
                Close
              </button>

              <h2 className="text-xs font-black tracking-tight uppercase mb-4 text-mono-light-950 dark:text-mono-dark-950">
                Enter the name of subreddit
              </h2>

              <form onSubmit={handleAddLaneSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. learnprogramming"
                  value={inputSubreddit}
                  onChange={(e) => setInputSubreddit(e.target.value)}
                  autoFocus
                  className="w-full bg-mono-light-50 dark:bg-mono-dark-50 border border-mono-light-200 dark:border-mono-dark-200 rounded-xl px-4 py-2.5 text-xs text-mono-light-950 dark:text-mono-dark-950 placeholder-mono-light-400 dark:placeholder-mono-dark-400 outline-none focus:border-mono-light-950 dark:focus:border-mono-dark-950 transition-colors"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 border border-mono-light-950 dark:border-mono-dark-950 bg-mono-light-950 dark:bg-mono-dark-950 text-mono-light-base dark:text-mono-dark-base text-[10px] font-bold tracking-wider rounded-xl uppercase hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                >
                  Add Subreddit
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="border-t border-mono-light-200 dark:border-mono-dark-200 bg-mono-light-50 dark:bg-mono-dark-50 text-[9px] font-bold uppercase tracking-widest text-center py-4 opacity-40 select-none shrink-0 mt-auto">
        Multi-Lane Stream Observer Infrastructure v1.2
      </footer>

    </div>
  );
}