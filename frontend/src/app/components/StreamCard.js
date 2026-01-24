import { useRef, useEffect, useState, memo } from 'react';
import Hls from 'hls.js';
import { getVideo, initDb } from '../lib/indexdb';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

// Simple duplicate URL prevention
const loadingBlobUrls = new Set(); // Track which Blob URLs are currently loading
const blobUrlCache = new Map(); // Cache of Blob URLs

// Basic concurrency control to prevent browser lag
let activeBlobLoads = 0;
const maxConcurrentBlobLoads = 2; // Allow max 2 blob videos to load at once
const blobLoadQueue = [];

// Cache size limit to prevent memory leaks
const MAX_CACHE_SIZE = 5;

// Cleanup function to prevent memory leaks
const cleanupCache = () => {
    if (blobUrlCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(blobUrlCache.entries());
        // Remove oldest entries (first half)
        const toRemove = entries.slice(0, Math.floor(entries.length / 2));
        toRemove.forEach(([key, blobUrl]) => {
            URL.revokeObjectURL(blobUrl);
            blobUrlCache.delete(key);
        });
        console.log(`🧹 Cleaned up ${toRemove.length} cached Blob URLs, cache size now:`, blobUrlCache.size);
    }
};

// Periodic cleanup to prevent memory leaks
setInterval(() => {
    cleanupCache();
}, 30000); // Clean up every 30 seconds

const StreamCard = memo(function StreamCard({ hls_url, video_url, stream_url }) {

    const videoRef = useRef(null);
    const isMountedRef = useRef(true);
    const playTimeoutRef = useRef(null);
    const dbRef = useRef(null);
    const hlsRef = useRef(null);
    const objectUrlRef = useRef(null);
    const objectUrlKeyRef = useRef(null);
    const lastPlayAttemptRef = useRef(0);
    const hasRequestedInitialPlayRef = useRef(false);
    const containerRef = useRef(null);
    const isVisibleRef = useRef(false);
    const observerRef = useRef(null);
    const isDestroyingHlsRef = useRef(false); // Prevent HLS operations during destruction
    const pendingPlayPromiseRef = useRef(null); // Track pending play() promise
    const viewportDebounceRef = useRef(null); // Debounce viewport changes

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isInViewport, setIsInViewport] = useState(false);
    const [isBlobLoaded, setIsBlobLoaded] = useState(false);
    const [lastRetryTime, setLastRetryTime] = useState(0);
    const maxRetries = 3;
    const retryCooldown = 1000; // 1 second cooldown
    const { language } = useLanguage();

    const url = stream_url || hls_url || video_url;

    const initDatabase = async () => {
        const db = await initDb();
        dbRef.current = db;
    }

    useEffect(() => {
        initDatabase();
    }, []);

    // Intersection Observer for viewport-based lazy loading
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                const isVisible = entry.isIntersecting;

                // Debounce viewport changes to prevent rapid re-initialization
                if (viewportDebounceRef.current) {
                    clearTimeout(viewportDebounceRef.current);
                }

                viewportDebounceRef.current = setTimeout(async () => {
                    isVisibleRef.current = isVisible;
                    setIsInViewport(isVisible);

                    // If going out of viewport, cleanup properly
                    if (!isVisible && videoRef.current) {
                        console.log('👁️ Video going out of viewport, cleaning up URL:', url);

                        // Wait for any pending play promise to resolve/reject before pausing
                        if (pendingPlayPromiseRef.current) {
                            try {
                                await pendingPlayPromiseRef.current;
                            } catch (e) {
                                // Ignore - just waiting for it to complete
                            }
                            pendingPlayPromiseRef.current = null;
                        }

                        // Now safe to pause
                        videoRef.current.pause();
                        videoRef.current.src = ''; // Clear video source

                        // Safely destroy HLS instance
                        if (hlsRef.current && !isDestroyingHlsRef.current) {
                            isDestroyingHlsRef.current = true;
                            try {
                                hlsRef.current.destroy();
                            } catch (e) {
                                console.log('HLS destroy error (safe to ignore):', e);
                            }
                            hlsRef.current = null;
                            isDestroyingHlsRef.current = false;
                        }

                        if (objectUrlRef.current) {
                            console.log('🗑️ Revoking Blob URL:', objectUrlRef.current);
                            URL.revokeObjectURL(objectUrlRef.current);
                            objectUrlRef.current = null;
                            objectUrlKeyRef.current = null;
                        }
                    }
                }, 300); // 300ms debounce
            },
            {
                root: null,
                rootMargin: '50px', // Start loading 50px before entering viewport
                threshold: 0.1
            }
        );

        observer.observe(containerRef.current);
        observerRef.current = observer;

        return () => {
            if (viewportDebounceRef.current) {
                clearTimeout(viewportDebounceRef.current);
            }
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const debouncedPlay = () => {
        if (playTimeoutRef.current) {
            clearTimeout(playTimeoutRef.current);
        }
        playTimeoutRef.current = setTimeout(() => {
            safePlay();
        }, 100);
    };

    const throttledPlay = () => {
        if (!isMountedRef.current || !isVisibleRef.current) {
            console.log('⏸️ throttledPlay skipped - not mounted or not visible');
            return;
        }

        // Skip if video is already playing
        if (videoRef.current && !videoRef.current.paused) {
            console.log('⏸️ throttledPlay skipped - video already playing');
            return;
        }

        const now = Date.now();
        if (now - lastPlayAttemptRef.current < 1000) {
            console.log('⏸️ throttledPlay skipped - too soon since last attempt');
            return; // Simple 1 second throttle
        }
        console.log('▶️ throttledPlay proceeding for URL:', url);
        lastPlayAttemptRef.current = now;
        debouncedPlay();
    };

    const safePlay = async (retryCount = 0) => {
        // Don't attempt play if HLS is being destroyed
        if (isDestroyingHlsRef.current) {
            console.log('⏸️ safePlay skipped - HLS is being destroyed');
            return;
        }

        if (!videoRef.current || !isMountedRef.current) {
            console.log('⏸️ safePlay skipped - no video ref or not mounted');
            return;
        }

        try {
            if (!videoRef.current.paused) {
                console.log('⏸️ safePlay skipped - video already playing');
                return;
            }
            console.log('🎬 Attempting to play video for URL:', url, 'retry:', retryCount);

            // Track the play promise so we can await it during cleanup
            const playPromise = videoRef.current.play();
            pendingPlayPromiseRef.current = playPromise;

            await playPromise;
            pendingPlayPromiseRef.current = null;

            if (!hasRequestedInitialPlayRef.current) {
                console.log('✅ Video started playing successfully for URL:', url);
            }
        } catch (error) {
            pendingPlayPromiseRef.current = null;

            // AbortError is usually from intentional cleanup - don't spam retries
            if (error.name === 'AbortError') {
                console.log('⏸️ Play aborted (likely cleanup) for URL:', url);
                // Only retry if still mounted and visible, and not many retries
                if (!isMountedRef.current || !isVisibleRef.current || isDestroyingHlsRef.current) return;
                if (retryCount < 2) {
                    setTimeout(() => safePlay(retryCount + 1), 500);
                }
                return;
            } else if (error.name === 'NotAllowedError') {
                // Autoplay blocked; keep UI responsive but don't spam retries
                console.log('⏸️ Autoplay blocked for URL:', url);
                setIsLoading(false);
                return;
            } else {
                console.log('Video play error:', error);
                if (retryCount < 2 && isMountedRef.current) {
                    console.log(`Retrying video play (attempt ${retryCount + 1})`);
                    setTimeout(() => safePlay(retryCount + 1), 500);
                } else if (isMountedRef.current) {
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        }
    };

    const retryStream = () => {
        if (retryCount < maxRetries) {
            console.log(`Retrying stream (attempt ${retryCount + 1}/${maxRetries})`);
            setRetryCount(prev => prev + 1);
            setHasError(false);
            setIsLoading(true);
        }
    };

    useEffect(() => {
        console.log('🔄 StreamCard useEffect triggered for URL:', url, 'isInViewport:', isInViewport);
        isMountedRef.current = true;

        let hls;

        if (!url) {
            console.log('No stream URL provided');
            if (isMountedRef.current) {
                setIsLoading(false);
                setHasError(true);
            }
            return;
        }

        // Only proceed if in viewport
        if (!isVisibleRef.current) {
            console.log('👁️ StreamCard not in viewport, skipping initialization for URL:', url);
            return;
        }

        // Reset states
        if (isMountedRef.current) {
            setIsLoading(true);
            setHasError(false);
        }

        // Check if it's a number in the indexdb
        const isNumber = !isNaN(url);

        const getVideoFromDB = async () => {
            console.log('📦 getVideoFromDB called for URL:', url, 'isBlobLoaded:', isBlobLoaded);

            // Check if already loaded
            if (isBlobLoaded) {
                console.log('✅ Blob already loaded, skipping for URL:', url);
                return;
            }

            // Check if this specific URL is already loading
            if (loadingBlobUrls.has(url)) {
                console.log(`Blob URL ${url} already loading, skipping...`);
                return;
            }

            if (blobUrlCache.has(url)) {
                console.log(`💾 Blob URL ${url} already cached, using cached version...`);
                const cachedBlobUrl = blobUrlCache.get(url);
                if (videoRef.current && isMountedRef.current) {
                    if (videoRef.current.src !== cachedBlobUrl) {
                        console.log('🔄 Setting cached Blob URL to video element');
                        videoRef.current.src = cachedBlobUrl;
                    }
                    console.log('▶️ Calling throttledPlay for cached Blob URL');
                    throttledPlay();
                    setIsLoading(false);
                    setHasError(false);
                    setIsBlobLoaded(true);
                }
                return;
            }

            // Check concurrency limit
            if (activeBlobLoads >= maxConcurrentBlobLoads) {
                console.log('⏳ Blob load concurrency limit reached, queueing...', 'active:', activeBlobLoads, 'max:', maxConcurrentBlobLoads);
                return new Promise((resolve) => {
                    blobLoadQueue.push(() => {
                        getVideoFromDB().then(resolve);
                    });
                });
            }

            loadingBlobUrls.add(url);
            activeBlobLoads++;
            console.log(`🚀 Starting Blob load for ${url} (${activeBlobLoads}/${maxConcurrentBlobLoads})`);

            if (!dbRef.current) {
                console.log('Database not ready, initializing...');
                const newDb = await initDb();
                dbRef.current = newDb;
            }

            try {
                console.log('📥 Fetching video from IndexedDB for URL:', url);
                const video = await getVideo(dbRef.current, url);
                console.log('📥 Video fetched from DB:', video);

                if (!video) {
                    console.error('Video not found in database');
                    if (isMountedRef.current) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                    return;
                }

                // Create and cache the Blob URL
                const newKey = `db-${url}`;
                if (objectUrlKeyRef.current !== newKey) {
                    if (objectUrlRef.current) {
                        URL.revokeObjectURL(objectUrlRef.current);
                        objectUrlRef.current = null;
                    }
                    objectUrlRef.current = URL.createObjectURL(video.video);
                    objectUrlKeyRef.current = newKey;

                    // Cache the Blob URL for future use
                    blobUrlCache.set(url, objectUrlRef.current);
                    console.log('💾 Created and cached Video ObjectURL:', objectUrlRef.current, 'Cache size:', blobUrlCache.size);

                    // Cleanup cache if it gets too large
                    cleanupCache();
                }

                if (videoRef.current && isMountedRef.current) {
                    if (videoRef.current.src !== objectUrlRef.current) {
                        console.log('🔄 Setting new Blob URL to video element');
                        videoRef.current.src = objectUrlRef.current;
                    }
                    console.log('▶️ Calling throttledPlay for new Blob URL');
                    throttledPlay();
                    setIsLoading(false);
                    setHasError(false);
                    setIsBlobLoaded(true);

                }

            } catch (error) {
                console.error('Error getting video from database:', error);
                if (isMountedRef.current) {
                    setHasError(true);
                    setIsLoading(false);
                }
            } finally {
                loadingBlobUrls.delete(url);
                activeBlobLoads--;
                console.log(`✅ Finished Blob load for ${url} (${activeBlobLoads}/${maxConcurrentBlobLoads})`);

                // Process next in queue
                if (blobLoadQueue.length > 0) {
                    console.log('🔄 Processing next in queue, remaining:', blobLoadQueue.length);
                    const nextLoad = blobLoadQueue.shift();
                    setTimeout(nextLoad, 500); // Small delay between loads
                }
            }
        };

        try {
            if (isNumber) {
                // Small delay to stagger blob loading
                setTimeout(() => {
                    if (isMountedRef.current && isVisibleRef.current) {
                        getVideoFromDB();
                    }
                }, Math.random() * 300); // Random delay 0-300ms
            } else {
                if (Hls.isSupported()) {
                    // Don't create new HLS instance if one is being destroyed
                    if (isDestroyingHlsRef.current) {
                        console.log('⏸️ Skipping HLS init - previous instance still being destroyed');
                        return;
                    }

                    // Cleanup any existing HLS instance first
                    if (hlsRef.current) {
                        isDestroyingHlsRef.current = true;
                        try {
                            hlsRef.current.destroy();
                        } catch (e) {
                            // Safe to ignore
                        }
                        hlsRef.current = null;
                        isDestroyingHlsRef.current = false;
                    }

                    hlsRef.current = new Hls({
                        // Disable web worker to prevent demuxerWorker crashes
                        enableWorker: false,

                        // Manifest loading settings
                        manifestLoadingMaxRetry: 10,
                        manifestLoadingRetryDelay: 1000,
                        manifestLoadingMaxRetryTimeout: 30000,

                        // Fragment loading settings
                        fragLoadingMaxRetry: 6,
                        fragLoadingRetryDelay: 1000,
                        fragLoadingTimeOut: 20000,

                        // Live stream settings - conservative for high-latency networks (Cloudflare tunnel)
                        liveSyncDurationCount: 3,           // Sync to 3 segments behind live edge
                        liveMaxLatencyDurationCount: 15,    // Allow more latency for tunnel
                        liveBackBufferLength: 60,           // Keep 60 seconds of back buffer

                        // Buffer settings - larger buffers for stability
                        maxBufferLength: 60,                // Buffer up to 60 seconds
                        maxMaxBufferLength: 120,            // Allow up to 120 seconds max
                        maxBufferSize: 120 * 1000 * 1000,   // 120 MB buffer
                        maxBufferHole: 1.0,                 // Allow 1 second gaps (more tolerant)

                        // DISABLE Low Latency Mode - tunnel adds too much latency
                        lowLatencyMode: false,

                        // Start a bit behind live edge for buffer stability
                        startPosition: -1,

                        // More lenient stall detection
                        highBufferWatchdogPeriod: 3,        // Wait 3 seconds before stall detection
                    });

                    try {
                        hlsRef.current.loadSource(url);
                        hlsRef.current.attachMedia(videoRef.current);
                    } catch (error) {
                        console.error('Error loading stream:', error);
                        if (isMountedRef.current) {
                            setHasError(true);
                            setIsLoading(false);
                        }
                    }

                    hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (isMountedRef.current) {
                            setIsLoading(false);
                            console.log('📋 Manifest parsed for URL:', url, '- waiting for buffer...');
                        }
                    });

                    // Wait for first fragment to be buffered before playing
                    // This prevents the race condition where play() is called before data is ready
                    hlsRef.current.on(Hls.Events.FRAG_BUFFERED, () => {
                        // Guard against destroyed HLS instance
                        if (!hlsRef.current || isDestroyingHlsRef.current) return;

                        if (isMountedRef.current && videoRef.current && videoRef.current.paused) {
                            try {
                                const buffered = videoRef.current.buffered;
                                if (buffered.length > 0) {
                                    const bufferEnd = buffered.end(buffered.length - 1);
                                    const currentTime = videoRef.current.currentTime;
                                    const bufferAmount = bufferEnd - currentTime;

                                    // Only play when we have at least 2 seconds of buffer
                                    if (bufferAmount >= 2) {
                                        console.log(`📦 Buffer ready (${bufferAmount.toFixed(1)}s) for URL:`, url);
                                        throttledPlay();
                                    }
                                }
                            } catch (e) {
                                // SourceBuffer may have been removed - ignore silently
                            }
                        }
                    });

                    // Removed HLS fallback timeout to prevent spam

                    hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
                        // Skip if HLS is being destroyed or already destroyed
                        if (isDestroyingHlsRef.current || !hlsRef.current) {
                            console.log('⏸️ HLS error handler skipped - instance is being/already destroyed');
                            return;
                        }

                        console.log('HLS error:', event, data);

                        // Check cooldown before retrying
                        const now = Date.now();
                        if (now - lastRetryTime < retryCooldown) {
                            console.log('⏸️ Retry cooldown active, skipping retry');
                            return;
                        }

                        // Handle internalException - usually means HLS is in bad state
                        if (data.details === 'internalException') {
                            console.log('⚠️ HLS internal exception - cleaning up safely');
                            if (hlsRef.current && !isDestroyingHlsRef.current) {
                                isDestroyingHlsRef.current = true;
                                try {
                                    hlsRef.current.destroy();
                                } catch (e) {
                                    // Safe to ignore
                                }
                                hlsRef.current = null;
                                isDestroyingHlsRef.current = false;
                            }
                            if (isMountedRef.current) {
                                setIsLoading(false);
                                // Don't set error - stream might recover on next viewport entry
                            }
                            return;
                        }

                        // Check if it's a 404 error for gap.mp4 - stop retrying these
                        if (data.details === 'fragLoadError' && data.response && data.response.code === 404) {
                            console.log('🚫 404 error for fragment, stopping retries to prevent spam');
                            if (isMountedRef.current) {
                                setIsLoading(false);
                                // Don't set error state, just stop trying
                            }
                            return;
                        }

                        const safeDestroy = () => {
                            if (hlsRef.current && !isDestroyingHlsRef.current) {
                                isDestroyingHlsRef.current = true;
                                try {
                                    hlsRef.current.destroy();
                                } catch (e) {
                                    // Safe to ignore
                                }
                                hlsRef.current = null;
                                isDestroyingHlsRef.current = false;
                            }
                        };

                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    // Check if it's a 404 error, don't retry those
                                    if (data.response && data.response.code === 404) {
                                        console.log('🚫 Fatal 404 error, stopping retries');
                                        safeDestroy();
                                        if (isMountedRef.current) {
                                            setIsLoading(false);
                                        }
                                        return;
                                    }
                                    console.log('Fatal network error. Restarting load...');
                                    setLastRetryTime(now);
                                    if (hlsRef.current) hlsRef.current.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    // Don't use recoverMediaError() - it corrupts internal state
                                    // Instead, destroy and let user retry or component remount
                                    console.log('Fatal media error. Cleaning up HLS instance...');
                                    safeDestroy();
                                    if (isMountedRef.current) {
                                        setIsLoading(false);
                                        // Don't set hasError - stream might work on retry
                                    }
                                    break;
                                default:
                                    console.log('Unrecoverable error. Destroying HLS.');
                                    safeDestroy();
                                    if (isMountedRef.current) {
                                        setHasError(true);
                                        setIsLoading(false);
                                    }
                                    return;
                            }
                        } else {
                            // Only retry non-404 errors
                            if (data.details === 'manifestLoadTimeOut') {
                                console.log('Non-fatal manifest timeout, retrying...');
                                setLastRetryTime(now);
                                if (hlsRef.current) hlsRef.current.startLoad();
                            } else if (data.details === 'fragLoadError' && data.response && data.response.code === 404) {
                                console.log('🚫 Non-fatal 404 error, stopping retries');
                                // Don't retry 404 errors
                                return;
                            } else if (data.details === 'bufferStalledError') {
                                console.log('⏳ Buffer stalled - stream may be slow, waiting...');
                                // Don't spam retries for buffer stalls - just wait
                                return;
                            }
                        }

                        // After recovery, don't force play - let FRAG_BUFFERED handle it
                        // when buffer is ready again
                    });
                } // End of if (Hls.isSupported())
                else if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                    videoRef.current.src = url;
                    throttledPlay();
                } else {
                    console.log('HLS not supported and native HLS not available');
                    if (isMountedRef.current) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                }
            }


            // Attach element-level listeners to keep loading state accurate and avoid black screens
            const el = videoRef.current;
            const handlePlaying = () => {
                if (isMountedRef.current) setIsLoading(false);
                hasRequestedInitialPlayRef.current = false;
            };
            const handleCanPlay = () => {
                if (!isMountedRef.current) return;
                // Don't trigger play here - let FRAG_BUFFERED handler control playback timing
                // This prevents play attempts before buffer is adequately filled
            };
            const handleWaiting = () => {
                if (isMountedRef.current && videoRef.current && videoRef.current.paused) setIsLoading(true);
                hasRequestedInitialPlayRef.current = false;
            };
            if (el) {
                el.addEventListener('playing', handlePlaying);
                el.addEventListener('canplay', handleCanPlay);
                el.addEventListener('waiting', handleWaiting);
                el.addEventListener('stalled', handleWaiting);
            }

            return () => {
                isMountedRef.current = false;

                // Clear any pending debounce
                if (viewportDebounceRef.current) {
                    clearTimeout(viewportDebounceRef.current);
                }

                if (playTimeoutRef.current) {
                    clearTimeout(playTimeoutRef.current);
                }
                if (el) {
                    el.removeEventListener('playing', handlePlaying);
                    el.removeEventListener('canplay', handleCanPlay);
                    el.removeEventListener('waiting', handleWaiting);
                    el.removeEventListener('stalled', handleWaiting);
                }

                // Wait for pending play promise before cleaning up video element
                const cleanupVideo = async () => {
                    if (pendingPlayPromiseRef.current) {
                        try {
                            await pendingPlayPromiseRef.current;
                        } catch (e) {
                            // Ignore - just waiting for completion
                        }
                        pendingPlayPromiseRef.current = null;
                    }

                    if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.removeAttribute('src');
                        videoRef.current.load();
                    }
                };
                cleanupVideo();

                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                    objectUrlKeyRef.current = null;
                }

                // Remove from cache when component unmounts
                if (blobUrlCache.has(url)) {
                    const blobUrl = blobUrlCache.get(url);
                    URL.revokeObjectURL(blobUrl);
                    blobUrlCache.delete(url);
                    console.log('🗑️ Cleaned up Blob URL on unmount:', url, 'Cache size now:', blobUrlCache.size);
                }

                // Safely destroy HLS
                if (hlsRef.current && !isDestroyingHlsRef.current) {
                    isDestroyingHlsRef.current = true;
                    try {
                        hlsRef.current.destroy();
                    } catch (e) {
                        console.log('HLS cleanup destroy error (safe to ignore):', e);
                    }
                    hlsRef.current = null;
                    isDestroyingHlsRef.current = false;
                }

            }

        }
        catch (error) {
            console.error('Error loading stream:', error);
            if (isMountedRef.current) {
                setHasError(true);
                setIsLoading(false);
            }
        }
    }, [url, isInViewport]);

    return (
        <div ref={containerRef} className="relative w-full h-full">
            <video
                crossOrigin={"anonymous"}
                type="application/x-mpegURL"
                ref={videoRef}
                muted
                loop
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover"
                style={{ pointerEvents: 'none' }}
                preload={isInViewport ? "metadata" : "none"}
            />

            {/* Loading overlay */}
            {isLoading && isInViewport && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">{t('loadingStream', language)}</p>
                    </div>
                </div>
            )}

            {/* Out of viewport placeholder */}
            {!isInViewport && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                        <div className="w-8 h-8 border-2 border-gray-400 rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">{t('scrollToLoad', language)}</p>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {hasError && (
                <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-red-400 mb-2">⚠️</div>
                        <p className="text-sm">{t('streamUnavailable', language)}</p>
                        <p className="text-xs opacity-75 mb-3">{t('checkConnection', language)}</p>
                        {retryCount < maxRetries && (
                            <button
                                onClick={retryStream}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs transition-colors"
                            >
                                {t('retry', language)} ({retryCount}/{maxRetries})
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default StreamCard;