import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';

// 1. Move TreeNode outside of the main component
const TreeNode = ({ label, category, items, expandedNodes, selectedFilters, toggleNode, toggleFilter }) => {
    if (!items || items.length === 0) return null;

    const isExpanded = expandedNodes[category];
    const hasActiveFilter = selectedFilters[category] && selectedFilters[category].length > 0;

    return (
        <div className="mb-2">
            <button
                onClick={() => toggleNode(category)}
                className={`flex items-center w-full p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ${hasActiveFilter ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
            >
                {isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                <span className="text-sm">{label}</span>
                {hasActiveFilter && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                        {selectedFilters[category].length}
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                    {items.map(([itemLabel, count]) => {
                        const isSelected = selectedFilters[category]?.includes(itemLabel);
                        return (
                            <div key={itemLabel} className="flex items-center group">
                                <label className="flex items-center w-full cursor-pointer py-1 pr-2 rounded hover:bg-gray-50">
                                    <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={isSelected || false}
                                        onChange={() => toggleFilter(category, itemLabel)}
                                    />
                                    <span className={`text-sm truncate mr-2 ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-600'}`}>
                                        {itemLabel}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-auto bg-gray-100 px-1.5 rounded-full min-w-[20px] text-center">
                                        {count}
                                    </span>
                                </label>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const MetadataTreeFilter = ({ resources, onFilterChange, selectedFilters = {}, onClearFilters, className = "" }) => {
    const [expandedNodes, setExpandedNodes] = useState({
        service_type: true,
        branch: true,
        document_date: true,
    });

    // Dynamically extract metadata options from resources
    const filterOptions = useMemo(() => {
        if (!resources || resources.length === 0) return {};

        const options = {
            service_type: {},
            branch: {},
            document_date: {},
        };

        resources.forEach(resource => {
            if (resource.service_type) {
                options.service_type[resource.service_type] = (options.service_type[resource.service_type] || 0) + 1;
            }
            if (resource.branch) {
                options.branch[resource.branch] = (options.branch[resource.branch] || 0) + 1;
            }
            if (resource.document_date) {
                options.document_date[resource.document_date] = (options.document_date[resource.document_date] || 0) + 1;
            }
        });

        return {
            service_type: Object.entries(options.service_type).sort((a, b) => b[1] - a[1]),
            branch: Object.entries(options.branch).sort((a, b) => b[1] - a[1]),
            document_date: Object.entries(options.document_date).sort((a, b) => b[0].localeCompare(a[0])),
        };
    }, [resources]);

    const toggleNode = (node) => {
        setExpandedNodes(prev => ({
            ...prev,
            [node]: !prev[node]
        }));
    };

    const toggleFilter = (category, value) => {
        const newFilters = { ...selectedFilters };

        if (!newFilters[category]) {
            newFilters[category] = [];
        }

        if (newFilters[category].includes(String(value))) {
            newFilters[category] = newFilters[category].filter(item => item !== String(value));
            if (newFilters[category].length === 0) {
                delete newFilters[category];
            }
        } else {
            newFilters[category].push(String(value));
        }

        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        if (onClearFilters) {
            onClearFilters();
        } else {
            onFilterChange({});
        }
    };

    const hasAnyFilter = Object.keys(selectedFilters).length > 0;

    // Helper object to safely pass state/handlers down cleanly
    const sharedProps = {
        expandedNodes,
        selectedFilters,
        toggleNode,
        toggleFilter
    };

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-800 flex items-center">
                    <Filter className="w-4 h-4 mr-2 text-blue-600" />
                    ማጣሪያ
                </h3>
                {hasAnyFilter && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center bg-white border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    >
                        <X className="w-3 h-3 mr-1" />
                        አጽዳ
                    </button>
                )}
            </div>

            <div className="p-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                <TreeNode label="የጉዳዩ ዓይነት (Case Type)" category="service_type" items={filterOptions.service_type} {...sharedProps} />
                <div className="border-b border-dashed border-gray-200 my-2 mx-2"></div>

                <TreeNode label="የሰነዱ መገኛ (branch)" category="branch" items={filterOptions.branch} {...sharedProps} />
                <div className="border-b border-dashed border-gray-200 my-2 mx-2"></div>

                <TreeNode label="የተዋዋሉበት ቀን" category="document_date" items={filterOptions.document_date} {...sharedProps} />
            </div>
        </div>
    );
};

export default MetadataTreeFilter;