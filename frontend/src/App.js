import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Video player component
const VideoPlayer = ({ streamUrl, onError }) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      setIsLoading(true);
      setError(null);
      
      const video = videoRef.current;
      video.src = streamUrl;
      
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);
      const handleError = (e) => {
        setIsLoading(false);
        setError('Failed to load stream');
        if (onError) onError(e);
      };

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [streamUrl, onError]);

  return (
    <div className="video-player-container">
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading stream...</p>
        </div>
      )}
      {error && (
        <div className="video-error">
          <p>⚠️ {error}</p>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className="video-player"
        poster="/placeholder-video.jpg"
        autoPlay
        muted
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

// Channel card component
const ChannelCard = ({ channel, onPlay, isActive }) => (
  <div 
    className={`channel-card ${isActive ? 'active' : ''}`}
    onClick={() => onPlay(channel)}
  >
    <div className="channel-logo">
      {channel.stream_icon ? (
        <img src={channel.stream_icon} alt={channel.name} />
      ) : (
        <div className="channel-placeholder">📺</div>
      )}
    </div>
    <div className="channel-info">
      <h3>{channel.name}</h3>
      {channel.category_name && (
        <span className="channel-category">{channel.category_name}</span>
      )}
    </div>
  </div>
);

// Category selector component
const CategorySelector = ({ categories, activeCategory, onSelectCategory, type }) => (
  <div className="category-selector">
    <h3>Categories ({type})</h3>
    <div className="category-list">
      <button
        className={`category-btn ${activeCategory === null ? 'active' : ''}`}
        onClick={() => onSelectCategory(null)}
      >
        All
      </button>
      {categories.map(category => (
        <button
          key={category.category_id}
          className={`category-btn ${activeCategory === category.category_id ? 'active' : ''}`}
          onClick={() => onSelectCategory(category.category_id)}
        >
          {category.category_name}
        </button>
      ))}
    </div>
  </div>
);

// Main App component
function App() {
  // State management
  const [currentStream, setCurrentStream] = useState(null);
  const [liveChannels, setLiveChannels] = useState([]);
  const [vodMovies, setVodMovies] = useState([]);
  const [seriesShows, setSeriesShows] = useState([]);
  const [liveCategories, setLiveCategories] = useState([]);
  const [vodCategories, setVodCategories] = useState([]);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ live: [], vod: [], series: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch playlist info
  const fetchPlaylistInfo = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/playlist-info`);
      const data = await response.json();
      setPlaylistInfo(data);
    } catch (err) {
      console.error('Error fetching playlist info:', err);
    }
  };

  // Test connection
  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/xtream/test`);
      const data = await response.json();
      if (data.status === 'success') {
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('error');
        setError(data.message);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('Failed to connect to server');
    }
    setLoading(false);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const [liveRes, vodRes, seriesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/categories/live`),
        fetch(`${BACKEND_URL}/api/categories/vod`),
        fetch(`${BACKEND_URL}/api/categories/series`)
      ]);

      const [liveData, vodData, seriesData] = await Promise.all([
        liveRes.json(),
        vodRes.json(),
        seriesRes.json()
      ]);

      setLiveCategories(liveData.categories || []);
      setVodCategories(vodData.categories || []);
      setSeriesCategories(seriesData.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  // Fetch streams
  const fetchStreams = async (type, categoryId = null) => {
    setLoading(true);
    try {
      const url = categoryId 
        ? `${BACKEND_URL}/api/streams/${type}?category_id=${categoryId}`
        : `${BACKEND_URL}/api/streams/${type}`;
      
      const response = await fetch(url);
      const data = await response.json();

      switch (type) {
        case 'live':
          setLiveChannels(data.streams || []);
          break;
        case 'vod':
          setVodMovies(data.streams || []);
          break;
        case 'series':
          setSeriesShows(data.streams || []);
          break;
      }
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${type} streams:`, err);
      setError(`Failed to load ${type} content`);
    }
    setLoading(false);
  };

  // Search functionality
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ live: [], vod: [], series: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    }
    setLoading(false);
  };

  // Play stream
  const playStream = (stream) => {
    setCurrentStream(stream);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveCategory(null);
    setSearchQuery('');
    setSearchResults({ live: [], vod: [], series: [] });
    
    if (tab === 'live' && liveChannels.length === 0) {
      fetchStreams('live');
    } else if (tab === 'vod' && vodMovies.length === 0) {
      fetchStreams('vod');
    } else if (tab === 'series' && seriesShows.length === 0) {
      fetchStreams('series');
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    fetchStreams(activeTab, categoryId);
  };

  // Get current content
  const getCurrentContent = () => {
    if (searchQuery.trim()) {
      return searchResults[activeTab] || [];
    }
    
    switch (activeTab) {
      case 'live':
        return liveChannels;
      case 'vod':
        return vodMovies;
      case 'series':
        return seriesShows;
      default:
        return [];
    }
  };

  // Get current categories
  const getCurrentCategories = () => {
    switch (activeTab) {
      case 'live':
        return liveCategories;
      case 'vod':
        return vodCategories;
      case 'series':
        return seriesCategories;
      default:
        return [];
    }
  };

  useEffect(() => {
    fetchPlaylistInfo();
    testConnection();
    fetchCategories();
    fetchStreams('live'); // Load initial content
  }, []);

  // Update connection status based on test results
  useEffect(() => {
    const updateConnectionStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/xtream/test`);
        const data = await response.json();
        if (data.status === 'success') {
          setConnectionStatus('connected');
        } else if (data.status === 'demo_mode') {
          setConnectionStatus('demo');
        } else {
          setConnectionStatus('error');
        }
      } catch (err) {
        setConnectionStatus('error');
      }
    };
    
    updateConnectionStatus();
  }, [BACKEND_URL]);

  // Handle search input
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults({ live: [], vod: [], series: [] });
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>📺 {playlistInfo.name || 'IPTV Player'}</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus}`}></span>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </header>

      <div className="app-content">
        {/* Video Player */}
        <div className="video-section">
          {currentStream ? (
            <div className="player-container">
              <VideoPlayer 
                streamUrl={currentStream.stream_url} 
                onError={() => setError('Failed to play stream')}
              />
              <div className="now-playing">
                <h3>Now Playing: {currentStream.name}</h3>
                {currentStream.category_name && (
                  <p>Category: {currentStream.category_name}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="no-stream">
              <div className="no-stream-content">
                <h2>🎬 Welcome to IPTV Player</h2>
                <p>Select a channel or movie to start watching</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls-section">
          {/* Search */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search channels, movies, series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => handleTabChange('live')}
            >
              📺 Live TV ({liveChannels.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'vod' ? 'active' : ''}`}
              onClick={() => handleTabChange('vod')}
            >
              🎬 Movies ({vodMovies.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'series' ? 'active' : ''}`}
              onClick={() => handleTabChange('series')}
            >
              📺 Series ({seriesShows.length})
            </button>
          </div>

          {/* Categories */}
          {!searchQuery && getCurrentCategories().length > 0 && (
            <CategorySelector
              categories={getCurrentCategories()}
              activeCategory={activeCategory}
              onSelectCategory={handleCategoryChange}
              type={activeTab}
            />
          )}
        </div>

        {/* Content Grid */}
        <div className="content-section">
          {error && (
            <div className="error-message">
              <p>⚠️ {error}</p>
              <button onClick={testConnection}>Retry Connection</button>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading content...</p>
            </div>
          )}

          <div className="content-grid">
            {getCurrentContent().map((item, index) => (
              <ChannelCard
                key={item.stream_id || item.series_id || index}
                channel={item}
                onPlay={playStream}
                isActive={currentStream?.stream_id === item.stream_id}
              />
            ))}
          </div>

          {!loading && getCurrentContent().length === 0 && !error && (
            <div className="no-content">
              <p>No content available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;