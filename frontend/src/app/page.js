'use client';

import StreamPreview from "./components/StreamPreview";
import {
  CpuChipIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  BoltIcon,
  EyeIcon,
  ChartBarIcon,
  PlayIcon,
  SignalIcon,
  XMarkIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";
import React from "react";
import { useState } from "react";
import { useLanguage } from "./context/LanguageContext";
import { t } from "./lib/translations";

import textile_thumbnail from "@/../public/textile_thumbnail.png";
import construction_thumbnail from "@/../public/construction_thumbnail.png"
import machinery_thumbnail from "@/../public/machinery_thumbnail.png"
import japan_thumbnail from "@/../public/japan_thumbnail.png"

export default function Home() {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* CCTV Dashboard Title */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 font-inter tracking-tight">
                {t('factoryCCTVDashboard', language)}
              </h1>
              <button
                onClick={() => setIsHelpModalOpen(!isHelpModalOpen)}
                className="flex items-center space-x-2 bg-lime-50 hover:bg-lime-100 text-lime-700 px-3 py-2 rounded-lg border border-lime-200 transition-colors duration-200"
              >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                <span className="font-medium text-sm">{t('getHelp', language)}</span>
              </button>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <VideoCameraIcon className="h-6 w-6 text-lime-600 mt-1" />
              </div>
              <div>
                <p className="text-lg text-gray-700 font-inter leading-relaxed">
                  {t('viewLiveFeeds', language)}
                  <span className="font-semibold text-lime-600"> {t('clickFactoryToStart', language)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Help Panel */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isHelpModalOpen ? 'max-h-screen opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'
          }`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-lime-500 to-green-600 rounded-lg">
                  <PlayIcon className="h-5 w-5 text-white" />
                </div>
                <span>{t('gettingStarted', language)}</span>
              </h3>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h4 className="text-gray-900 font-bold mb-2 text-base">{t('selectFactory', language)}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{t('selectFactoryDesc', language)}</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h4 className="text-gray-900 font-bold mb-2 text-base">{t('liveStreaming', language)}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{t('liveStreamingDesc', language)}</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h4 className="text-gray-900 font-bold mb-2 text-base">{t('aiIntelligence', language)}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{t('aiIntelligenceDesc', language)}</p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="p-4 bg-gradient-to-r from-lime-500 to-green-600 rounded-xl shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <VideoCameraIcon className="h-5 w-5 text-white" />
                </div>
                <p className="text-white font-bold text-base">{t('readyToRevolutionize', language)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Factory Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('availableFactories', language)}</h2>
            <div className="flex items-center space-x-2 bg-lime-50 px-3 py-1 rounded-full border border-lime-200">
              <VideoCameraIcon className="h-4 w-4 text-lime-600" />
              <span className="text-lime-700 font-medium text-sm">{t('clickToStartStream', language)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <StreamPreview
            thumbnail_url={textile_thumbnail}
            title={t('textileFactory', language)}
            description={t('textileFactoryDesc', language)}
            isActive={false}
            cameraCount={3}
            factoryId="TextileFactory"
          />
          <StreamPreview
            thumbnail_url={construction_thumbnail}
            title={t('constructionSite', language)}
            description={t('constructionSiteDesc', language)}
            isActive={false}
            cameraCount={3}
            factoryId={"ConstructionSite"}
          />
          <StreamPreview
            thumbnail_url={machinery_thumbnail}
            title={t('machineryFactory', language)}
            description={t('machineryFactoryDesc', language)}
            isActive={false}
            cameraCount={5}
            factoryId={"MachineryFactory"}
          />
          <StreamPreview
            thumbnail_url={japan_thumbnail}
            title={t('japanConstructionSite', language)}
            description={t('japanConstructionSiteDesc', language)}
            isActive={false}
            cameraCount={4}
            factoryId={"JapanConstruction"}
          />
        </div>
      </div>
    </div>
  );
}

