from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import aiohttp
import asyncio
from urllib.parse import urljoin
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="IPTV Player API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'iptv_database')

# IPTV Configuration
XTREAM_URL = os.getenv('XTREAM_URL')
XTREAM_USERNAME = os.getenv('XTREAM_USERNAME')
XTREAM_PASSWORD = os.getenv('XTREAM_PASSWORD')
PLAYLIST_NAME = os.getenv('PLAYLIST_NAME', 'My IPTV')

# Log configuration
logger.info(f"XTREAM_URL: {XTREAM_URL}")
logger.info(f"XTREAM_USERNAME: {XTREAM_USERNAME}")
logger.info(f"PLAYLIST_NAME: {PLAYLIST_NAME}")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class XtreamAPI:
    def __init__(self, url: str, username: str, password: str):
        if not url or not username or not password:
            logger.warning("Missing IPTV credentials. Some features will be disabled.")
            self.base_url = None
            self.username = None
            self.password = None
            self.session = None
            return
            
        self.base_url = url.rstrip('/')
        self.username = username
        self.password = password
        self.session = None
    
    def is_configured(self) -> bool:
        """Check if the API is properly configured"""
        return all([self.base_url, self.username, self.password])
    
    async def get_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close_session(self):
        if self.session:
            await self.session.close()
            self.session = None
    
    def build_url(self, action: str, **params):
        """Build API URL with authentication"""
        if not self.is_configured():
            return None
            
        url = f"{self.base_url}/player_api.php"
        params.update({
            'username': self.username,
            'password': self.password,
            'action': action
        })
        param_str = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{url}?{param_str}"
    
    async def make_request(self, url: str) -> Dict[Any, Any]:
        """Make HTTP request to Xtream API"""
        if not url:
            return {}
            
        session = await self.get_session()
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"API request failed: {response.status}")
                    return {}
        except Exception as e:
            logger.error(f"Request error: {str(e)}")
            return {}
    
    async def get_live_categories(self):
        """Get live TV categories"""
        if not self.is_configured():
            return []
        url = self.build_url('get_live_categories')
        return await self.make_request(url)
    
    async def get_live_streams(self, category_id: Optional[int] = None):
        """Get live streams"""
        if not self.is_configured():
            return []
        params = {}
        if category_id:
            params['category_id'] = category_id
        url = self.build_url('get_live_streams', **params)
        return await self.make_request(url)
    
    async def get_vod_categories(self):
        """Get VOD categories"""
        if not self.is_configured():
            return []
        url = self.build_url('get_vod_categories')
        return await self.make_request(url)
    
    async def get_vod_streams(self, category_id: Optional[int] = None):
        """Get VOD streams"""
        if not self.is_configured():
            return []
        params = {}
        if category_id:
            params['category_id'] = category_id
        url = self.build_url('get_vod_streams', **params)
        return await self.make_request(url)
    
    async def get_series_categories(self):
        """Get series categories"""
        if not self.is_configured():
            return []
        url = self.build_url('get_series_categories')
        return await self.make_request(url)
    
    async def get_series(self, category_id: Optional[int] = None):
        """Get series"""
        if not self.is_configured():
            return []
        params = {}
        if category_id:
            params['category_id'] = category_id
        url = self.build_url('get_series', **params)
        return await self.make_request(url)
    
    async def get_short_epg(self, stream_id: int, limit: int = 10):
        """Get EPG for a stream"""
        if not self.is_configured():
            return []
        url = self.build_url('get_short_epg', stream_id=stream_id, limit=limit)
        return await self.make_request(url)
    
    def get_stream_url(self, stream_id: int, stream_type: str = 'live'):
        """Generate stream URL"""
        if not self.is_configured():
            return ""
            
        if stream_type == 'live':
            return f"{self.base_url}/live/{self.username}/{self.password}/{stream_id}.m3u8"
        elif stream_type == 'movie':
            return f"{self.base_url}/movie/{self.username}/{self.password}/{stream_id}.mkv"
        elif stream_type == 'series':
            return f"{self.base_url}/series/{self.username}/{self.password}/{stream_id}.mkv"
        return ""

# Initialize Xtream API (with error handling)
try:
    xtream_api = XtreamAPI(XTREAM_URL, XTREAM_USERNAME, XTREAM_PASSWORD)
except Exception as e:
    logger.error(f"Failed to initialize Xtream API: {str(e)}")
    xtream_api = XtreamAPI(None, None, None)  # Create disabled instance

@app.on_event("startup")
async def startup_event():
    logger.info("IPTV Player API starting up...")
    if xtream_api.is_configured():
        logger.info(f"Connecting to Xtream server: {XTREAM_URL}")
    else:
        logger.warning("IPTV credentials not configured. Running in limited mode.")

@app.on_event("shutdown")
async def shutdown_event():
    await xtream_api.close_session()
    client.close()

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "IPTV Player API",
        "iptv_configured": xtream_api.is_configured()
    }

@app.get("/api/xtream/test")
async def test_connection():
    """Test Xtream API connection"""
    if not xtream_api.is_configured():
        return {
            "status": "error", 
            "message": "IPTV credentials not configured"
        }
    
    try:
        categories = await xtream_api.get_live_categories()
        if categories:
            return {
                "status": "success",
                "message": "Connection successful",
                "categories_count": len(categories) if isinstance(categories, list) else 0
            }
        else:
            return {"status": "error", "message": "No data received"}
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/api/categories/live")
async def get_live_categories():
    """Get live TV categories"""
    try:
        categories = await xtream_api.get_live_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching live categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories/vod")
async def get_vod_categories():
    """Get VOD categories"""
    try:
        categories = await xtream_api.get_vod_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching VOD categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories/series")
async def get_series_categories():
    """Get series categories"""
    try:
        categories = await xtream_api.get_series_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching series categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/live")
async def get_live_streams(category_id: Optional[int] = None):
    """Get live streams"""
    try:
        streams = await xtream_api.get_live_streams(category_id)
        # Add stream URLs to each stream
        if isinstance(streams, list):
            for stream in streams:
                if 'stream_id' in stream:
                    stream['stream_url'] = xtream_api.get_stream_url(stream['stream_id'], 'live')
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching live streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/vod")
async def get_vod_streams(category_id: Optional[int] = None):
    """Get VOD streams"""
    try:
        streams = await xtream_api.get_vod_streams(category_id)
        # Add stream URLs to each stream
        if isinstance(streams, list):
            for stream in streams:
                if 'stream_id' in stream:
                    stream['stream_url'] = xtream_api.get_stream_url(stream['stream_id'], 'movie')
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching VOD streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/series")
async def get_series_streams(category_id: Optional[int] = None):
    """Get series streams"""
    try:
        streams = await xtream_api.get_series(category_id)
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching series streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/epg/{stream_id}")
async def get_epg(stream_id: int, limit: int = 10):
    """Get EPG for a stream"""
    try:
        epg = await xtream_api.get_short_epg(stream_id, limit)
        return {"epg": epg}
    except Exception as e:
        logger.error(f"Error fetching EPG: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def search_content(q: str, type: str = "all"):
    """Search across live streams, VOD, and series"""
    try:
        results = {
            "live": [],
            "vod": [],
            "series": []
        }
        
        if type in ["all", "live"]:
            live_streams = await xtream_api.get_live_streams()
            if isinstance(live_streams, list):
                results["live"] = [
                    stream for stream in live_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        if type in ["all", "vod"]:
            vod_streams = await xtream_api.get_vod_streams()
            if isinstance(vod_streams, list):
                results["vod"] = [
                    stream for stream in vod_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        if type in ["all", "series"]:
            series_streams = await xtream_api.get_series()
            if isinstance(series_streams, list):
                results["series"] = [
                    stream for stream in series_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        return results
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/playlist-info")
async def get_playlist_info():
    """Get playlist information"""
    return {
        "name": PLAYLIST_NAME,
        "server": XTREAM_URL,
        "status": "active" if xtream_api.is_configured() else "not_configured",
        "configured": xtream_api.is_configured()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

@app.get("/api/categories/live")
async def get_live_categories():
    """Get live TV categories"""
    try:
        categories = await xtream_api.get_live_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching live categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories/vod")
async def get_vod_categories():
    """Get VOD categories"""
    try:
        categories = await xtream_api.get_vod_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching VOD categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories/series")
async def get_series_categories():
    """Get series categories"""
    try:
        categories = await xtream_api.get_series_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching series categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/live")
async def get_live_streams(category_id: Optional[int] = None):
    """Get live streams"""
    try:
        streams = await xtream_api.get_live_streams(category_id)
        # Add stream URLs to each stream
        if isinstance(streams, list):
            for stream in streams:
                if 'stream_id' in stream:
                    stream['stream_url'] = xtream_api.get_stream_url(stream['stream_id'], 'live')
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching live streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/vod")
async def get_vod_streams(category_id: Optional[int] = None):
    """Get VOD streams"""
    try:
        streams = await xtream_api.get_vod_streams(category_id)
        # Add stream URLs to each stream
        if isinstance(streams, list):
            for stream in streams:
                if 'stream_id' in stream:
                    stream['stream_url'] = xtream_api.get_stream_url(stream['stream_id'], 'movie')
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching VOD streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/series")
async def get_series_streams(category_id: Optional[int] = None):
    """Get series streams"""
    try:
        streams = await xtream_api.get_series(category_id)
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Error fetching series streams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/epg/{stream_id}")
async def get_epg(stream_id: int, limit: int = 10):
    """Get EPG for a stream"""
    try:
        epg = await xtream_api.get_short_epg(stream_id, limit)
        return {"epg": epg}
    except Exception as e:
        logger.error(f"Error fetching EPG: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def search_content(q: str, type: str = "all"):
    """Search across live streams, VOD, and series"""
    try:
        results = {
            "live": [],
            "vod": [],
            "series": []
        }
        
        if type in ["all", "live"]:
            live_streams = await xtream_api.get_live_streams()
            if isinstance(live_streams, list):
                results["live"] = [
                    stream for stream in live_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        if type in ["all", "vod"]:
            vod_streams = await xtream_api.get_vod_streams()
            if isinstance(vod_streams, list):
                results["vod"] = [
                    stream for stream in vod_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        if type in ["all", "series"]:
            series_streams = await xtream_api.get_series()
            if isinstance(series_streams, list):
                results["series"] = [
                    stream for stream in series_streams 
                    if q.lower() in stream.get('name', '').lower()
                ][:20]  # Limit results
        
        return results
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/playlist-info")
async def get_playlist_info():
    """Get playlist information"""
    return {
        "name": PLAYLIST_NAME,
        "server": XTREAM_URL,
        "status": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)