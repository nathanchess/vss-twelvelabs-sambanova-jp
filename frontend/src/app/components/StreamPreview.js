'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
    PlayIcon,
    EyeIcon,
    VideoCameraIcon,
    SignalIcon,
    SignalSlashIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

// Precached HLS URLs per factory — no backend needed
const PRESET_HLS_URLS = {
    TextileFactory: [
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f5194436d5c05f8e73f590/stream/7e30db74-b1ad-4739-9575-4884609b11f7.m3u8', // ClothingLine
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f5097a50d73a53e9026eb0/stream/784306e2-f2ba-47b0-a8b3-420b2c402046.m3u8', // textile2
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f509191f2f3a5c7fba4c44/stream/c05f0089-e89a-420f-b10b-c60acd5c701a.m3u8', // textile1
    ],
    ConstructionSite: [
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f6656e13449bce96941e7e/stream/224779ae-e58a-44b1-9cd8-984ee0770c4a.m3u8', // Outside_Area
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f5090036d5c05f8e73f1c6/stream/730456ca-69db-45ac-a428-36fe10732207.m3u8', // OutsideConstruction
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f5088713449bce9693d609/stream/93b28240-75de-4303-a213-fe0895de7d8a.m3u8', // PipeWork
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f507eca66549584678d783/stream/901170f1-6722-478b-9898-000bd0b13b4f.m3u8', // BuildingConstruction
    ],
    MachineryFactory: [
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f563eef4b07b407a25c450/stream/f1cb1feb-7e9b-4534-abc5-164628bafae4.m3u8', // SugarLine_0000
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f563ecf4b07b407a25c44e/stream/aa4c3068-edf6-46eb-9d47-d8893a0f6f40.m3u8', // SugarLine_0003
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f563eaf4b07b407a25c44b/stream/6700486d-4e4d-4dbc-a46a-58c43b3ab8d4.m3u8', // SugarLine_0001
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f563e8f4b07b407a25c448/stream/9b61a98e-1d6b-499e-8480-5baeb6ff7fbd.m3u8', // SugarLine_0002
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f5622e1f2f3a5c7fba68fc/stream/35809177-b79e-46a4-8322-3554c98b65a7.m3u8', // FlameMetal
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/68f52abe50d73a53e9027708/stream/0b9f021c-fbf6-45cf-a2f5-718e98bdbd14.m3u8', // Steel
    ],
    JapanConstruction: [
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/69750e03a7d08a9a987efbae/stream/playlist.m3u8', // JapanForklift
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/69750e03af6d73889fd09995/stream/playlist.m3u8', // JapanSteelMaking
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/69750e017cff3af87ddb6d26/stream/playlist.m3u8', // JapanSteel
        'https://deuqpmn4rs7j5.cloudfront.net/68395b68fb13a12412d8114b/69750e004da6ef1ab83fbe8e/stream/playlist.m3u8', // JapanPipe
    ],
};

const FAKE_CONNECT_MS = 1500;

export default function StreamPreview({
    thumbnail_url,
    title,
    description,
    factoryId = null
}) {
    const [hovered, setHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [activeState, setActiveState] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const router = useRouter();
    const { language } = useLanguage();

    const [hlsUrl, setHlsUrl] = useState(null);
    const [cameraCount, setCameraCount] = useState(0);

    const presetUrls = PRESET_HLS_URLS[factoryId] || [];

    // Restore active state from localStorage (no API call)
    useEffect(() => {
        if (!factoryId) return;
        try {
            const stored = localStorage.getItem(factoryId);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.hlsUrls?.length > 0) {
                    setActiveState(true);
                    setHlsUrl(parsed.hlsUrls[0]);
                    setCameraCount(parsed.hlsUrls.length);
                }
            }
        } catch { /* ignore corrupted localStorage */ }
    }, [factoryId]);

    const handleCardClick = async () => {
        if (activeState) {
            router.push(`/${factoryId || 'unknown'}`);
        } else if (!isActivating && presetUrls.length > 0) {
            setIsActivating(true);

            // Fake connection delay so the UI shows the "Activating…" state
            await new Promise((resolve) => setTimeout(resolve, FAKE_CONNECT_MS));

            const hlsUrls = presetUrls;
            setActiveState(true);
            setIsActivating(false);
            setHlsUrl(hlsUrls[0]);
            setCameraCount(hlsUrls.length);

            localStorage.setItem(factoryId, JSON.stringify({
                hlsUrls,
                cameraCount: hlsUrls.length,
                title,
                description,
                thumbnail_url,
                factoryId,
                activatedAt: new Date().toISOString(),
            }));
        }
    };

    const handleViewClick = (e) => {
        e.stopPropagation(); // Prevent card click
        if (activeState) {
            router.push(`/${factoryId || 'unknown'}`);
        }
    };

    return (
        <div
            className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 ${isActivating
                    ? 'ring-2 ring-yellow-500/20 cursor-wait'
                    : activeState
                        ? 'ring-2 ring-lime-500/20 cursor-pointer'
                        : 'cursor-pointer'
                }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleCardClick}
        >
            {/* Thumbnail Container with Play Button Overlay */}
            <div className="relative h-48 bg-gray-200 overflow-hidden">
                {!imageError && thumbnail_url ? (
                    <Image
                        src={thumbnail_url}
                        alt={title || 'Factory thumbnail'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <VideoCameraIcon className="h-16 w-16 text-gray-600" />
                    </div>
                )}

                {/* Black Glassy Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300"></div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${activeState
                            ? 'bg-lime-500/90 group-hover:bg-lime-500 group-hover:scale-125'
                            : 'bg-white/95 group-hover:bg-white group-hover:scale-125'
                        }`}>
                        <PlayIcon className={`h-8 w-8 ml-1 ${activeState ? 'text-white' : 'text-gray-700'
                            }`} />
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-3 left-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${isActivating
                            ? 'bg-yellow-500/90 text-white'
                            : activeState
                                ? 'bg-lime-500/90 text-white'
                                : 'bg-gray-500/90 text-white'
                        }`}>
                        {isActivating ? (
                            <>
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                <span>{t('activating', language)}</span>
                            </>
                        ) : activeState ? (
                            <>
                                <SignalIcon className="h-4 w-4" />
                                <span>{t('active', language)}</span>
                            </>
                        ) : (
                            <>
                                <SignalSlashIcon className="h-4 w-4" />
                                <span>{t('inactive', language)}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Camera Count Badge */}
                <div className="absolute top-3 right-3">
                    <div className="bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center space-x-1">
                        <VideoCameraIcon className="h-4 w-4" />
                        <span>{cameraCount}</span>
                    </div>
                </div>

                {/* View Button - Only show when active */}
                {activeState && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={handleViewClick}
                            className="bg-lime-500 hover:bg-lime-600 text-white rounded-lg px-4 py-2 flex items-center space-x-2 text-sm font-medium shadow-lg transition-colors duration-200"
                        >
                            <EyeIcon className="h-4 w-4" />
                            <span>{t('view', language)}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div className="p-5">
                {/* Title */}
                <h3 className="font-bold text-lg text-gray-900 font-inter mb-2 group-hover:text-lime-600 transition-colors duration-300 line-clamp-2">
                    {title || 'Factory Name'}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {description || 'Factory description will appear here'}
                </p>

                {/* HLS URL Section */}
                <div className="mb-4">
                    {isActivating ? (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <ArrowPathIcon className="h-4 w-4 text-yellow-500 animate-spin" />
                                <span className="font-medium text-yellow-600">{t('activatingStream', language)}</span>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">{t('settingUpHLS', language)}</p>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        </div>
                    ) : activeState ? (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <SignalIcon className="h-4 w-4 text-lime-500" />
                                <span className="font-medium text-lime-600">{t('liveStreamAvailable', language)}</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">{t('hlsPublicUrl', language)}:</p>
                                <p className="text-xs font-mono text-gray-700 break-all">
                                    {(hlsUrl || placeholderHlsUrl).length > 50 ? `${(hlsUrl || placeholderHlsUrl).substring(0, 50)}...` : (hlsUrl || placeholderHlsUrl)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <SignalSlashIcon className="h-4 w-4" />
                            <span>{t('notActivatedNoHLS', language)}</span>
                        </div>
                    )}
                </div>

                {/* Camera Count Section */}
                <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                            <span>{cameraCount} Camera{cameraCount !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Click indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${isActivating
                                        ? 'bg-yellow-500 animate-pulse'
                                        : activeState
                                            ? 'bg-lime-500 animate-pulse'
                                            : 'bg-gray-400'
                                    }`}></div>
                                <span className="text-xs text-gray-500">
                                    {isActivating
                                        ? t('activating', language)
                                        : activeState
                                            ? t('clickToView', language)
                                            : t('clickToActivate', language)
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}