import Carousel from "../components/UI/Carousel";
import dspaceService from "../services/dspaceService";
import CirculationEventsModal from "./CirculationEventsModal";
import { AuthContext } from "../contexts/AuthContext";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, Book, CheckCircle, Download, Filter, Heart, MapPin, UserPlus, Users, Search, X } from "lucide-react";
import CollectionsGrid from "./CollectionsGrid";
import ResourceTable from "./ResourceTable";
import HowItWorks from "../components/HowItWorks";
import Card from "../components/UI/Card";
import MetadataTreeFilter from "../components/MetadataTreeFilter";

const Home = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [allResources, setAllResources] = useState([]); // For all resources (mixed)
    const [catalogedResources, setCatalogedResources] = useState([]); // For Koha cataloged items
    const [dspaceItems, setDspaceItems] = useState([]); // For DSpace items fetched directly
    const [loading, setLoading] = useState(false);
    const [isCirculationModalOpen, setIsCirculationModalOpen] = useState(false);
    const [selectedCaseFile, setSelectedCaseFile] = useState(null);

    const [stats, setStats] = useState({
        totalResources: 0,
        mySubmissions: 0,
        allowedCollections: 0,
        communities: 0,
    });

    const [collections, setCollections] = useState([]);
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [activeFilters, setActiveFilters] = useState({});
    const [displayMode, setDisplayMode] = useState("digital"); // "digital", "cataloged"
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [dspacePagination, setDspacePagination] = useState({
        page: 0,
        size: 10,
        totalPages: 0,
        totalElements: 0,
    });

    const { user, token, djangoToken } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        // Initial fetch
        fetchAllResources();
        fetchSystemStats();
        fetchCollections();
    }, [user]);

    // Debounced search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery !== undefined) {
                if (displayMode === "cataloged") {
                    fetchCatalogedResources(searchQuery);
                } else if (selectedCollections.length > 0) {
                    fetchDspaceItemsByCollections(selectedCollections);
                } else {
                    fetchAllResources(searchQuery);
                }
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, selectedCollections, displayMode]);


    const fetchCollections = async () => {
    try {
        const collectionsList = await dspaceService.getCollections();
        // Fallback to empty array if the response structure differs
        setCollections(collectionsList || []); 
    } catch (error) {
        console.error("Error fetching collections:", error);
        setCollections([]);
    }
    };

    // Fetch all resources (using DSpace search)
    const fetchAllResources = async (query = "") => {
        setLoading(true);
        try {
            // Use DSpace service to search and immediately chain array transformations
            const mappedResults = (await dspaceService.searchItems(query))
                // Transform DSpace items to common resource format
                // Filter out collections - only include actual items
                .filter(item => {
                    const indexableObject = item._embedded?.indexableObject;
                    if (indexableObject?.type !== 'item') return false;
                    const metadata = indexableObject?.metadata || {};
                    const entityType = metadata["dspace.entity.type"]?.[0]?.value;
                    return entityType === "CaseFile";
                })
                .map(item => {
                    const metadata = item._embedded?.indexableObject?.metadata || {};
                    const getVal = (key) => {
                        const mk = metadata[key];
                        return mk && mk.length > 0 ? mk[0].value : "";
                    };
                    const getValList = (key) => {
                        const mk = metadata[key];
                        return mk ? mk.map(m => m.value).join(", ") : "";
                    };

                    // Extract collection name from owningCollection
                    let collectionName = null;
                    const indexableObject = item._embedded?.indexableObject;

                    // 1. Try embedded object (now available via embed=owningCollection)
                    if (indexableObject?._embedded?.owningCollection?.name) {
                        collectionName = indexableObject._embedded.owningCollection.name;
                    }
                    // 2. Try direct property
                    else if (indexableObject?.owningCollection?.name) {
                        collectionName = indexableObject.owningCollection.name;
                    }
                    // 3. Fallback to UUID from relationship link
                    else if (indexableObject?._links?.owningCollection?.href) {
                        const href = indexableObject._links.owningCollection.href;
                        // Handle both /collections/uuid and /items/uuid/owningCollection patterns
                        const uuidMatch = href.match(/collections\/([a-f0-9\-]+)/i) ||
                            href.match(/items\/([a-f0-9\-]+)\/owningCollection/i);
                        if (uuidMatch) {
                            collectionName = uuidMatch[1];
                        }
                    }

                    return {
                        id: item._embedded?.indexableObject?.uuid,
                        title: getVal("dc.title") || item._embedded?.indexableObject?.name,
                        authors: getValList("dc.contributor.author"),
                        year: getVal("dc.date.issued")?.substring(0, 4),
                        publisher: getVal("dc.publisher"),
                        source: "dspace",
                        collection_name: collectionName,
                        description: getVal("dc.description") || getVal("dc.description.abstract"),
                        abstract: getVal("dc.description.abstract"),
                        external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
                        resource_type: getVal("dc.type"),
                        language: getVal("dc.language"),
                        citation: getVal("dc.identifier.citation"),
                        sponsors: getVal("dc.description.sponsorship"),
                        series: getVal("dc.relation.ispartofseries"),
                        reportNo: getVal("dc.identifier.other") || getVal("dc.identifier.govdoc"),
                        isbn: getVal("dc.identifier.isbn"),
                        issn: getVal("dc.identifier.issn"),
                        subjects: getValList("dc.subject"),
                        format: getVal("dc.format"),
                        // Legal/Case fields mapping
                        bench_session: getVal("legal.bench.session"),
                        complaint_number: getVal("legal.case.complaintNumber"),
                        file_number: getVal("legal.case.fileNumber"),
                        case_document_type: getVal("legal.document.type"),
                        // judge_number: getVal("legal.judge.number"),
                        location: getVal("legal.location"),
                        case_status: getVal("legal.case.status"),
                        case_type: getVal("legal.case.type"),
                        // primary_judge: getVal("legal.judge.primary"),
                        registration_date: getVal("legal.date.registration"),
                        plaintiff: getVal("legal.case.plaintiff"),
                        defendant: getVal("legal.case.defendant"),
                        shelf_number: getVal("legal.physical.shelfNumber"),
                        row_number: getVal("legal.physical.rowNumber"),
                        col_number: getVal("legal.physical.colNumber"),
                        rfid: getVal("legal.physical.rfid"),
                    };
                });

            setAllResources(mappedResults);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching resources:", error);
            setAllResources([]);
        } finally {
            setLoading(false);
        }
    };
    // Fetch items from Koha (Cataloged)
    const fetchCatalogedResources = async (query = "") => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/resources/search/`, {
                params: {
                    q: query,
                    source: 'koha',
                    limit: 100
                }
            });

            if (response.data && response.data.results) {
                // Map the results to our consistent format
                const mapped = response.data.results.map(item => ({
                    ...item,
                    source: item.source || 'koha',
                    source_name: item.source_name || 'Koha Catalog'
                }));
                setCatalogedResources(mapped);
            }
        } catch (error) {
            console.error("Error fetching cataloged resources:", error);
            setCatalogedResources([]);
        } finally {
            setLoading(false);
        }
    };


    const fetchSystemStats = async () => {
        try {
            // 1. Fetch total collections list first to use as a potential fallback
            const collectionsList = await dspaceService.getCollections();
            const totalCols = collectionsList?.length || 0;

            // 2. Fetch search objects and filter strictly for items
            const searchObjects = await dspaceService.searchItems();
            const totalCaseFiles = searchObjects?.filter(
                obj => obj.dspaceObject?.type === 'item' || obj.type === 'item'
            ).length || 0;

            let mySubmissionsCount = 0;
            let allowedCollectionsCount = 0;

            if (user && user.id) {
                try {
                    const submissionsRes = await dspaceService.getMySubmissions(user.id);
                    mySubmissionsCount = submissionsRes?._embedded?.workspaceitems?.length || 0;

                    const authColRes = await dspaceService.getSubmitAuthorizedCollections(0, 100);
                    allowedCollectionsCount = authColRes?.collections?.length || totalCols;
                } catch (err) {
                    console.warn("Could not load user submissions / authorized collections:", err);
                    allowedCollectionsCount = totalCols;
                }
            }

            setStats({
                totalResources: totalCaseFiles, // Will now correctly show 3
                mySubmissions: mySubmissionsCount,
                allowedCollections: allowedCollectionsCount, // Will now show 3
                communities: totalCols, // Shows 3
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleCirculationClick = (resource) => {
        setSelectedCaseFile(resource);
        setIsCirculationModalOpen(true);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // Search is handled by useEffect now
    };

    const handleCollectionClick = (collection) => {
        setSelectedCollections((prev) => {
            const collectionId = collection.uuid || collection.id;
            const isAlreadySelected = prev.some(
                (c) => (c.uuid || c.id) === collectionId,
            );

            if (isAlreadySelected) {
                // Remove from selection
                const newSelection = prev.filter(
                    (c) => (c.uuid || c.id) !== collectionId,
                );
                if (newSelection.length === 0) {
                    // If no collections selected, fetch all items
                    fetchAllResources(searchQuery);
                } else {
                    // Fetch items for remaining collections
                    fetchDspaceItemsByCollections(newSelection);
                }
                return newSelection;
            } else {
                // Add to selection and fetch items
                const newSelection = [...prev, collection];
                fetchDspaceItemsByCollections(newSelection);
                return newSelection;
            }
        });

        // When a collection is selected, switch to digital mode
        setDisplayMode("digital");
        setCurrentPage(1);
        setActiveFilters({});
    };

    // Fetch items from specific DSpace collections
    const fetchDspaceItemsByCollections = async (collections) => {
        if (!collections || collections.length === 0) {
            return;
        }

        setLoading(true);
        try {
            // Fetch items from each collection and combine results
            const allItems = [];

            for (const collection of collections) {
                const collectionId = collection.uuid || collection.id;
                // Use DSpace discover API to search within a specific collection
                const params = new URLSearchParams({
                    query: searchQuery || "*",
                    scope: collectionId,
                    page: "0",
                    size: "100",
                    embed: "owningCollection"
                });

                const response = await fetch(
                    `/api/dspace/discover/search/objects?${params}`,
                    {
                        credentials: "include",
                        headers: dspaceService.getCsrfHeaders({ Accept: "application/json" }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const items = data._embedded?.searchResult?._embedded?.objects || [];

                    // Transform items to common format and filter out collections
                    const transformedItems = items
                        .filter(item => {
                            const indexableObject = item._embedded?.indexableObject;
                            if (indexableObject?.type !== 'item') return false;
                            const metadata = indexableObject?.metadata || {};
                            const entityType = metadata["dspace.entity.type"]?.[0]?.value;
                            return entityType === "CaseFile";
                        })
                        .map(item => {
                            const metadata = item._embedded?.indexableObject?.metadata || {};
                            const getVal = (key) => {
                                const mk = metadata[key];
                                return mk && mk.length > 0 ? mk[0].value : "";
                            };
                            const getValList = (key) => {
                                const mk = metadata[key];
                                return mk ? mk.map(m => m.value).join(", ") : "";
                            };

                            // Extract collection name from owningCollection
                            let collectionName = null;
                            const indexableObject = item._embedded?.indexableObject;

                            // 1. Try embedded object (now available via embed=owningCollection)
                            if (indexableObject?._embedded?.owningCollection?.name) {
                                collectionName = indexableObject._embedded.owningCollection.name;
                            }
                            // 2. Try direct property
                            else if (indexableObject?.owningCollection?.name) {
                                collectionName = indexableObject.owningCollection.name;
                            }
                            // 3. Fallback to UUID from relationship link
                            else if (indexableObject?._links?.owningCollection?.href) {
                                const href = indexableObject._links.owningCollection.href;
                                // Handle both /collections/uuid and /items/uuid/owningCollection patterns
                                const uuidMatch = href.match(/collections\/([a-f0-9\-]+)/i) ||
                                    href.match(/items\/([a-f0-9\-]+)\/owningCollection/i);
                                if (uuidMatch) {
                                    collectionName = uuidMatch[1];
                                }
                            }

                            return {
                                id: item._embedded?.indexableObject?.uuid,
                                title: getVal("dc.title") || item._embedded?.indexableObject?.name,
                                source: "dspace",
                                collection_name: collectionName,
                                external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
                                language: getVal("dc.language"),
                                bench_session: getVal("legal.bench.session"),
                                complaint_number: getVal("legal.case.complaintNumber"),
                                file_number: getVal("legal.case.fileNumber"),
                                case_document_type: getVal("legal.document.type"),
                                // judge_number: getVal("legal.judge.number"),
                                location: getVal("legal.location"),
                                // case_level: getVal("legal.case.level"),
                                case_status: getVal("legal.case.status"),
                                case_type: getVal("legal.case.type"),
                                // primary_judge: getVal("legal.judge.primary"),
                                registration_date: getVal("legal.date.registration"),
                                plaintiff: getVal("legal.case.plaintiff"),
                                defendant: getVal("legal.case.defendant"),
                                shelf_number: getVal("legal.physical.shelfNumber"),
                                row_number: getVal("legal.physical.rowNumber"),
                                col_number: getVal("legal.physical.colNumber"),
                                rfid: getVal("legal.physical.rfid"),
                            };
                        });

                    allItems.push(...transformedItems);
                }
            }

            // Post-process to map collection UUIDs to names
            const processedItems = allItems.map(resource => {
                if (resource.collection_name && collections.length > 0) {
                    // Check if collection_name is a UUID (matches UUID pattern)
                    const isUuid = /^[a-f0-9\-]{36}$/i.test(resource.collection_name);
                    if (isUuid) {
                        // Find matching collection by UUID
                        const matchingCollection = collections.find(
                            col => col.uuid === resource.collection_name || col.id === resource.collection_name
                        );
                        if (matchingCollection) {
                            return {
                                ...resource,
                                collection_name: matchingCollection.name
                            };
                        }
                    }
                }
                return resource;
            });

            setAllResources(processedItems);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching collection items:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearCollectionFilter = () => {
        setSelectedCollections([]);
        fetchAllResources(searchQuery);
        setCurrentPage(1);
        setActiveFilters({});
    };

    const handleDisplayModeChange = (mode) => {
        setDisplayMode(mode);
        setCurrentPage(1);
        setActiveFilters({}); // Reset all side filters when switching modes
        if (mode === "cataloged") {
            setSelectedCollections([]);
            fetchCatalogedResources(searchQuery);
        } else {
            fetchAllResources(searchQuery);
        }
    };

    const getResourcesToDisplay = () => {
        if (displayMode === "cataloged") {
            return catalogedResources;
        }
        return allResources;
    };

    const applyTreeFilters = (resources) => {
        if (Object.keys(activeFilters).length === 0) return resources;

        return resources.filter(resource => {
            // Check each filter category
            for (const [category, selectedValues] of Object.entries(activeFilters)) {
                if (!selectedValues || selectedValues.length === 0) continue;

                let resourceValue;
                if (category === 'case_type') {
                    resourceValue = resource.case_type;
                } 
                else if (category === 'case_status') {
                    resourceValue = resource.case_status;
                } 
                // else if (category === 'primary_judge') {
                //     resourceValue = resource.primary_judge;
                // } 
                else if (category === 'location') {
                    resourceValue = resource.location;
                } else if (category === 'registration_date') {
                    resourceValue = resource.registration_date;
                }

                if (resourceValue === null || resourceValue === undefined) {
                    return false;
                }

                if (!selectedValues.includes(String(resourceValue))) {
                    return false;
                }
            }
            return true;
        });
    };

    const baseResources = getResourcesToDisplay();
    // We compute filter options from the BASE resources (before filtering) 
    // so that the tree shows all available options in the current view/mode

    const resourcesToDisplay = applyTreeFilters(baseResources);

    const handleDspacePageChange = (newPage) => {
        if (selectedCollections.length > 0) {
            fetchDspaceItemsByCollections(
                selectedCollections,
                newPage,
                dspacePagination.size,
            );
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <Carousel />

            {/* Collections Section */}
            {/* <section className="bg-white py-16">
                <div className="max-w-[95%] px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Collections</h2>
                        <p className="text-gray-600">Select a collection to browse.</p>
                    </div>
                    <CollectionsGrid
                        collections={collections}
                        onCollectionClick={handleCollectionClick}
                        selectedCollections={selectedCollections}
                    />
                </div>
            </section> */}

            {/* Stats and Additional Sections - Same as before */}
            <div className="max-w-7xl mx-auto px-4 mt-10">
                {/* System Overview */}
                <section className="mb-16">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            የፌዴራል ጠቅላይ ፍርድ ቤት
                        </h2>
                        <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                            የፌደራል ጠቅላይ ፍርድ ቤት በ1934 ዓ.ም የተመሠረተ ፣ ቀልጣፋ፣ ውጤታማና ተደራሽ የዳንነት አገልግሎ በመስጠት የህግ የበላይነትን ለማረጋገጥ የሚሰራ ተቋም ነው።
                        </p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
                            <MapPin className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                            <h3 className="text-4xl font-bold text-gray-900 mb-2">
                                {stats.communities}
                            </h3>
                            <p className="text-gray-600 font-medium">የመዝገብ አይነቶች</p>
                        </Card>
                        <Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
                            <BarChart3 className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                            <h3 className="text-4xl font-bold text-gray-900 mb-2">
                                {stats.totalResources.toLocaleString()}
                            </h3>
                            <p className="text-gray-600 font-medium">ጠቅላላ የክስ ፋይሎች</p>
                        </Card>
                        <Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
                            <Download className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                            <h3 className="text-4xl font-bold text-gray-900 mb-2">
                                {user ? stats.mySubmissions : 0}
                            </h3>
                            <p className="text-gray-600 font-medium">የእኔ መዝገቦች (ማስረከቢያዎች)</p>
                        </Card>
                        <Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
                            <Users className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                            <h3 className="text-4xl font-bold text-gray-900 mb-2">
                                {user ? stats.allowedCollections : 0}
                            </h3>
                            <p className="text-gray-600 font-medium">የተፈቀዱ የመዝገብ አይነቶች</p>
                        </Card>
                    </div>
                </section>
            </div>

            {/* Search Bar Overlay */}
            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10 mb-8">
                <div className="bg-white p-4 rounded-xl">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ሰነዶችን፣ ፋይሎችን ይፈልጉ..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-900 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm cursor-pointer"
                        >
                            ፈልግ
                        </button>
                    </form>
                </div>
            </div>

            {/* Latest Additions / Featured Items */}
            <section className="bg-white">
                <div className="max-w-[95%] px-4">
                    {/* <div className="text-center mb-12">


                    </div> */}

                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                            የቅርብ ጊዜ ሰነዶች እና ካታሎጎች
                            <span className="text-gray-500 text-lg ml-2">
                                ({resourcesToDisplay.length} ውጤቶች)
                            </span>
                        </h3>
                        <div className="flex space-x-4"></div>
                    </div>

                    {/* Collection filter status - subtle version */}
                    {selectedCollections.length > 0 && displayMode === "digital" && (
                        <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-blue-700 mr-2">
                                        Viewing items from:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedCollections.map((collection) => (
                                            <span
                                                key={collection.uuid || collection.id}
                                                className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs"
                                            >
                                                {collection.name}
                                                <button
                                                    onClick={() => handleCollectionClick(collection)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {selectedCollections.length > 0 && (
                                    <button
                                        onClick={clearCollectionFilter}
                                        className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* DSpace pagination info */}
                            {dspaceItems.length > 0 && dspacePagination.totalPages > 1 && (
                                <div className="mt-2 pt-2 border-t border-blue-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-600 text-xs">
                                            Page {dspacePagination.number + 1} of{" "}
                                            {dspacePagination.totalPages}(
                                            {dspacePagination.totalElements} total items)
                                        </span>
                                        <div className="flex space-x-2">
                                            {dspacePagination.number > 0 && (
                                                <button
                                                    onClick={() =>
                                                        handleDspacePageChange(dspacePagination.number - 1)
                                                    }
                                                    className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
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
                                                        className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
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
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Show:</span>
                            <button
                                onClick={() => handleDisplayModeChange("digital")}
                                className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${displayMode === "digital"
                                    ? "bg-blue-600 text-white"
                                    : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                መዛግብት
                            </button>
                            <button
                                onClick={() => handleDisplayModeChange("cataloged")}
                                className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${displayMode === "cataloged"
                                    ? "bg-blue-600 text-white"
                                    : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                ወጪ ገቢ
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Sidebar - Metadata Tree Filter */}
                        <div className="lg:w-1/4">
                            <MetadataTreeFilter
                                resources={baseResources}
                                selectedFilters={activeFilters}
                                onFilterChange={setActiveFilters}
                                onClearFilters={() => setActiveFilters({})}
                                className="sticky top-4"
                            />
                        </div>

                        {/* Right Content - Resource Table */}
                        <div className="lg:w-3/4">
                            <ResourceTable
                                resources={resourcesToDisplay.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                                loading={loading}
                                onCirculationClick={handleCirculationClick}
                            />

                            {/* Pagination Controls */}
                            {resourcesToDisplay.length > pageSize && (
                                <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg border">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.max(1, currentPage - 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === 1}
                                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            ቀዳሚ
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            ቀጣይ
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                ከ <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> እስከ <span className="font-medium">{Math.min(currentPage * pageSize, resourcesToDisplay.length)}</span> ያሉት እየታዩ ነው (ከጠቅላላው {' '}
                                                <span className="font-medium">{resourcesToDisplay.length}</span> ውጤቶች)
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => {
                                                        setCurrentPage(Math.max(1, currentPage - 1));
                                                    }}
                                                    disabled={currentPage === 1}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                                                    }}
                                                    disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

            <CirculationEventsModal
                isOpen={isCirculationModalOpen}
                onClose={() => setIsCirculationModalOpen(false)}
                caseFile={selectedCaseFile}
            />
        </div>
    );
};

export default Home;
