import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Setup form component for Xtream Codes credentials
const SetupForm = ({ onSetup, isLoading }) => {
  const [credentials, setCredentials] = useState({
    playlistName: '',
    username: '',
    password: '',
    serverUrl: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!credentials.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!credentials.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    if (!credentials.serverUrl.trim()) {
      newErrors.serverUrl = 'Server URL is required';
    } else if (!credentials.serverUrl.startsWith('http://') && !credentials.serverUrl.startsWith('https://')) {
      newErrors.serverUrl = 'Server URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSetup(credentials);
    }
  };

  const fillDemoCredentials = () => {
    setCredentials({
      playlistName: 'my playlist',
      username: 'eeaa4069e9',
      password: 'ff9abaf49c',
      serverUrl: 'http://answer65355.cdn-only.me'
    });
  };

  return (
    <div className="setup-container">
      <div className="setup-form">
        <div className="setup-header">
          <h1>📺 IPTV Player Setup</h1>
          <p>Enter your Xtream Codes API credentials to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="credentials-form">
          <div className="form-group">
            <label htmlFor="playlistName">Playlist Name (Optional)</label>
            <input
              type="text"
              id="playlistName"
              name="playlistName"
              value={credentials.playlistName}
              onChange={handleChange}
              placeholder="My IPTV Playlist"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="serverUrl">Server URL *</label>
            <input
              type="text"
              id="serverUrl"
              name="serverUrl"
              value={credentials.serverUrl}
              onChange={handleChange}
              placeholder="http://yourserver.com:8080"
              className={`form-input ${errors.serverUrl ? 'error' : ''}`}
            />
            {errors.serverUrl && <span className="error-text">{errors.serverUrl}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Your username"
                className={`form-input ${errors.username ? 'error' : ''}`}
              />
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Your password"
                className={`form-input ${errors.password ? 'error' : ''}`}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="setup-btn primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner small"></div>
                  Connecting...
                </>
              ) : (
                'Connect to IPTV Service'
              )}
            </button>

            <button 
              type="button" 
              className="setup-btn secondary"
              onClick={fillDemoCredentials}
              disabled={isLoading}
            >
              Use Demo Credentials
            </button>
          </div>
        </form>

        <div className="setup-info">
          <h3>ℹ️ What you need:</h3>
          <ul>
            <li>Your IPTV provider's server URL</li>
            <li>Username and password from your provider</li>
            <li>Make sure your subscription is active</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

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
  // Setup state
  const [isSetup, setIsSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [currentCredentials, setCurrentCredentials] = useState(null);

  // App state
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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Check for saved credentials on app start
  useEffect(() => {
    const savedCredentials = localStorage.getItem('iptvCredentials');
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        setCurrentCredentials(credentials);
        setIsSetup(true);
      } catch (e) {
        console.error('Error loading saved credentials:', e);
        localStorage.removeItem('iptvCredentials');
      }
    }
  }, []);

  // Setup IPTV connection
  const handleSetup = async (credentials) => {
    setSetupLoading(true);
    setError(null);

    try {
      // Send credentials to backend for testing
      const response = await fetch(`${BACKEND_URL}/api/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();
      
      if (result.status === 'success' || result.status === 'demo_mode') {
        // Save credentials and proceed
        localStorage.setItem('iptvCredentials', JSON.stringify(credentials));
        setCurrentCredentials(credentials);
        setIsSetup(true);
        setConnectionStatus(result.status === 'success' ? 'connected' : 'demo');
        
        // Load initial data
        await Promise.all([
          fetchCategories(),
          fetchStreams('live')
        ]);
      } else {
        setError(result.message || 'Failed to connect to IPTV service');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setError('Failed to connect to server');
    }
    
    setSetupLoading(false);
  };

  // Reset setup (logout)
  const resetSetup = () => {
    localStorage.removeItem('iptvCredentials');
    setIsSetup(false);
    setCurrentCredentials(null);
    setConnectionStatus('disconnected');
    setCurrentStream(null);
    setLiveChannels([]);
    setVodMovies([]);
    setSeriesShows([]);
    setActiveTab('live');
    setSearchQuery('');
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

  // Show setup form if not configured
  if (!isSetup) {
    return <SetupForm onSetup={handleSetup} isLoading={setupLoading} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>📺 {currentCredentials?.playlistName || 'IPTV Player'}</h1>
          <div className="header-controls">
            <div className="connection-status">
              <span className={`status-indicator ${connectionStatus}`}></span>
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'demo' && 'Demo Mode'}
              {connectionStatus === 'error' && 'Disconnected'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </div>
            <button onClick={resetSetup} className="logout-btn">
              ⚙️ Change Settings
            </button>
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
              <button onClick={() => window.location.reload()}>Retry</button>
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