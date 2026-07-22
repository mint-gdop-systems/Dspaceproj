import React from 'react';
import { Search } from "lucide-react";

const HeroSection = ({ searchQuery, setSearchQuery, handleSearch }) => {
    return (
        <div className="bg-gradient-to-r from-[#265A91] to-[#4FA3D1] pb-16 pt-12 px-4 mb-16 relative">
            <div className="max-w-4xl mx-auto text-center relative z-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    የሰነድ ማረጋገጫና ምዝገባ አገልግሎት ፈልግ
                </h1>
                <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 max-w-3xl mx-auto">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="በሰነድ ቁጥር፣ በስም፣ ወይም በሚስጥር ቃል ይፈልጉ..."
                                className="w-full pl-12 pr-4 py-3 border-none rounded-lg focus:outline-none focus:ring-0 bg-transparent text-gray-800 text-lg transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-[#265A91] hover:bg-[#1a4066] text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-sm cursor-pointer"
                        >
                            ፈልግ
                        </button>
                    </form>
                </div>
            </div>

            {/* Decorative bottom curve/angle */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
                <svg className="relative block w-full h-[40px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,120.36,194,106.3,238.16,96.44,280.24,78.29,321.39,56.44Z" className="fill-gray-50"></path>
                </svg>
            </div>
        </div>
    );
};

export default HeroSection;
