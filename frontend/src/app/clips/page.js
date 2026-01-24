'use client';

import { useEffect, useState } from 'react';
import ClipSort from '../components/ClipSort';
import UploadVideo from '../components/UploadVideo';
import {
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import ClipCard from '../components/ClipCard';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function Clips() {

  const [isVisible, setIsVisible] = useState(false);
  const [clipData, setClipData] = useState([]);
  const [filteredClipData, setFilteredClipData] = useState([]);
  const { language } = useLanguage();

  useEffect(() => {
    loadClipData();
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Update filtered data when clipData changes
  useEffect(() => {
    setFilteredClipData(clipData);
  }, [clipData]);

  // Handle filter changes from ClipSort component
  const handleFilterChange = (filteredClips) => {
    setFilteredClipData(filteredClips);
  };

  const sampleIds = [('13380578_3840_2160_25fps.mp4', '2ec57a48-d330-4404-a26a-0587348fa865')]
  const presetFactoryVideos = {
    "TextileFactory": ["68f509361f2f3a5c7fba4c51", "68f509d0f4b07b407a25a81a"],
    "ConstructionSite": ["68f508e513449bce9693d62f", "68f50811a66549584678d792"],
    "MachineryFactory": ["68f5197550d73a53e90272c2", "68f52b0c1f2f3a5c7fba54db", "68f56255f4b07b407a25c3b6", "68f5640650d73a53e9028c42", "68f5640df4b07b407a25c462", "68f5640f36d5c05f8e740f69", "68f56411f4b07b407a25c466"],
    "JapanConstruction": ["69750de7af6d73889fd0998b", "69750de87cff3af87ddb6d1d", "69750decaf6d73889fd09990", "69750deb7cff3af87ddb6d1e"]
  }

  const loadClipData = async () => {

    const VSS_BASE_URL = process.env.NEXT_PUBLIC_VSS_BASE_URL;

    if (!VSS_BASE_URL) {
      console.error("No VSS base URL found");
      return;
    }

    console.log("Loading clip data");

    try {

      console.log("Fetching VSS file data");

      // Fetch NVIDIA VSS file data mappings for VSS ID and file name.
      const vss_response = await fetch(`${VSS_BASE_URL}/files?purpose=vision`);

      if (!vss_response.ok) {
        console.error("Failed to load clip data");
        return;
      }
      const vss_data = await vss_response.json();
      const vss_file_data = vss_data['data'];

      // Fetch Twelve Labs for file data and file name.
      const response = await fetch('/api/video', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error("Failed to load clip data");
        return;
      }

      const data = await response.json();

      // Check for empty HLS
      for (let fileName in data) {
        const fileData = data[fileName];
        if (!fileData.hls || !fileData.hls.video_url) {
          console.log("Deleting clip with empty HLS", fileName);
          delete data[fileName];
        }
      }

      console.log(data)

      const textileFactoryActivated = localStorage.getItem('TextileFactory') !== null;
      const constructionSiteActivated = localStorage.getItem('ConstructionSite') !== null;
      const machineryFactoryActivated = localStorage.getItem('MachineryFactory') !== null;

      console.log("Textile factory activated", textileFactoryActivated);
      console.log("Construction site activated", constructionSiteActivated);
      console.log("Machinery factory activated", machineryFactoryActivated);

      // Map VSS file data to Twelve Labs file data and sample IDs.
      for (let sampleId of sampleIds) {
        const fileName = sampleId[0];
        const vssId = sampleId[1];
        if (fileName in data) {
          data[fileName]['vss_id'] = vssId;
        }
      }

      for (let fileName in data) {

        const fileData = data[fileName];
        const pegasusId = fileData['pegasusId'];

        console.log("Pegasus ID", pegasusId);
        console.log("Textile factory preset", presetFactoryVideos['TextileFactory'].includes(pegasusId));
        console.log("Construction site preset", presetFactoryVideos['ConstructionSite'].includes(pegasusId));
        console.log("Machinery factory preset", presetFactoryVideos['MachineryFactory'].includes(pegasusId));

        if (pegasusId && presetFactoryVideos['TextileFactory'].includes(pegasusId) && textileFactoryActivated === false) {
          console.log("Deleting textile factory clip", fileName);
          delete data[fileName];
        }

        if (pegasusId && presetFactoryVideos['ConstructionSite'].includes(pegasusId) && constructionSiteActivated === false) {
          console.log("Deleting construction site clip", fileName);
          delete data[fileName];
        }

        if (pegasusId && presetFactoryVideos['MachineryFactory'].includes(pegasusId) && machineryFactoryActivated === false) {
          console.log("Deleting machinery factory clip", fileName);
          delete data[fileName];
        }
      }

      console.log("Mapped data", data);

      setClipData(data);

      return data;

    } catch (error) {
      console.error("Error loading clip data", error);
      return;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClipSort clipData={clipData} onFilterChange={handleFilterChange} />

      {/* Header Section */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>

          {/* Description */}
          <div className={`transition-all duration-1000 delay-200 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h1 className="text-4xl font-bold text-gray-900 font-inter tracking-tight mb-4">
                {t('clipStorage', language)}
              </h1>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-6 w-6 text-lime-600 mt-1" />
                </div>
                <div>
                  <p className="text-lg text-gray-700 font-inter leading-relaxed">
                    {t('clipStorageDesc', language)}
                    <span className="font-semibold text-lime-600"> {t('twelveLabsPegasus', language)}</span>.
                    {t('clipsAutoIndexed', language)}
                  </p>


                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`transition-all duration-1000 delay-800 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

            {/* Upload Video Component */}
            <UploadVideo />

            {/* Clip Cards */}
            {filteredClipData && (Array.isArray(filteredClipData) ? filteredClipData : Object.values(filteredClipData)).map((clip, index) => (
              <ClipCard
                key={index}
                vss_id={clip.vss_id}
                video_url={clip.hls.video_url}
                thumbnail_url={clip.hls.thumbnail_urls[0]}
                createdAt={clip.createdAt}
                duration={clip.duration}
                name={clip.filename}
                searchScore={clip.searchScore}
                searchConfidence={clip.searchConfidence}
              />
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}