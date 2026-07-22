import React from 'react';
import { X } from "lucide-react";
import ResourceTable from "./ResourceTable";
import MetadataTreeFilter from "../components/MetadataTreeFilter";
import { useHomeData } from "../features/home/hooks/useHomeData";
import HeroSection from "../features/home/components/HeroSection";
import SystemStats from "../features/home/components/SystemStats";

const Home = () => {
    const {
        searchQuery, setSearchQuery,
        loading,
        stats,
        selectedCollections,
        activeFilters, setActiveFilters,
        displayMode,
        currentPage, setCurrentPage,
        pageSize,
        dspacePagination,
        user,
        handleCirculationClick,
        handleSearch,
        handleCollectionClick,
        clearCollectionFilter,
        handleDisplayModeChange,
        handleDspacePageChange,
        baseResources,
        resourcesToDisplay,
        dspaceItems
    } = useHomeData();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
            />

            <div className="max-w-7xl mx-auto px-4 mt-10">
                {/* System Overview */}
                <SystemStats stats={stats} user={user} />
            </div>

            {/* Latest Additions / Featured Items */}
            <section className="bg-white py-12 rounded-t-3xl shadow-sm border-t border-gray-100" id="resource-section">
                <div className="max-w-[95%] px-4 mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                            የቅርብ ጊዜ ሰነዶች እና ካታሎጎች
                            <span className="text-sm font-medium bg-blue-100 text-blue-800 py-1 px-3 rounded-full ml-4">
                                {resourcesToDisplay.length} ውጤቶች
                            </span>
                        </h3>
                    </div>

                    {/* Collection filter status */}
                    {selectedCollections.length > 0 && displayMode === "digital" && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-blue-700 font-medium mr-2">
                                        Viewing items from:
                                    </span>
                                    {selectedCollections.map((collection) => (
                                        <span
                                            key={collection.uuid || collection.id}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-800 text-sm font-medium shadow-sm"
                                        >
                                            {collection.name}
                                            <button
                                                onClick={() => handleCollectionClick(collection)}
                                                className="ml-2 text-blue-500 hover:text-blue-800 transition-colors focus:outline-none cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                {selectedCollections.length > 0 && (
                                    <button
                                        onClick={clearCollectionFilter}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>

                            {/* DSpace pagination info */}
                            {dspaceItems.length > 0 && dspacePagination.totalPages > 1 && (
                                <div className="mt-4 pt-4 border-t border-blue-200/60">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-700 text-sm font-medium">
                                            Page {dspacePagination.number + 1} of{" "}
                                            {dspacePagination.totalPages} (
                                            {dspacePagination.totalElements} total items)
                                        </span>
                                        <div className="flex space-x-2">
                                            {dspacePagination.number > 0 && (
                                                <button
                                                    onClick={() =>
                                                        handleDspacePageChange(dspacePagination.number - 1)
                                                    }
                                                    className="px-3 py-1.5 text-sm font-medium bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
                                                >
                                                    Previous
                                                </button>
                                            )}
                                            {dspacePagination.number <
                                                dspacePagination.totalPages - 1 && (
                                                    <button
                                                        onClick={() =>
                                                            handleDspacePageChange(dspacePagination.number + 1)
                                                        }
                                                        className="px-3 py-1.5 text-sm font-medium bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
                                                    >
                                                        Next
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Display mode filters */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => handleDisplayModeChange("digital")}
                                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${displayMode === "digital"
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                መዛግብት (Digital)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Sidebar - Metadata Tree Filter */}
                        <div className="lg:w-1/4">
                            <MetadataTreeFilter
                                resources={baseResources}
                                selectedFilters={activeFilters}
                                onFilterChange={setActiveFilters}
                                onClearFilters={() => setActiveFilters({})}
                                className="sticky top-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                            />
                        </div>

                        {/* Right Content - Resource Table */}
                        <div className="lg:w-3/4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <ResourceTable
                                    resources={resourcesToDisplay.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                                    loading={loading}
                                    onCirculationClick={handleCirculationClick}
                                />
                            </div>

                            {/* Pagination Controls */}
                            {resourcesToDisplay.length > pageSize && (
                                <div className="mt-8 flex items-center justify-between bg-white px-6 py-4 border border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.max(1, currentPage - 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === 1}
                                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            ቀዳሚ
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            ቀጣይ
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                ከ <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> እስከ <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, resourcesToDisplay.length)}</span> ያሉት እየታዩ ነው (ከጠቅላላው <span className="font-semibold text-gray-900">{resourcesToDisplay.length}</span> ውጤቶች)
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => {
                                                        setCurrentPage(Math.max(1, currentPage - 1));
                                                        window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                                    }}
                                                    disabled={currentPage === 1}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transition-colors'}`}
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                    ገጽ {currentPage} ከ {Math.ceil(resourcesToDisplay.length / pageSize)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1));
                                                        window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                                    }}
                                                    disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transition-colors'}`}
                                                >
                                                    <span className="sr-only">ቀጣይ</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

