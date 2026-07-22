import { useState, useEffect, useContext } from "react";
import axios from "axios";
import dspaceService from "../../../services/dspaceService";
import { AuthContext } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const useHomeData = () => {
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
            const mappedResults = (await dspaceService.searchItems(query))
                .filter(item => {
                    const indexableObject = item._embedded?.indexableObject;
                    return indexableObject?.type === 'item';
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

                    let collectionName = null;
                    const indexableObject = item._embedded?.indexableObject;

                    if (indexableObject?._embedded?.owningCollection?.name) {
                        collectionName = indexableObject._embedded.owningCollection.name;
                    }
                    else if (indexableObject?.owningCollection?.name) {
                        collectionName = indexableObject.owningCollection.name;
                    }
                    else if (indexableObject?._links?.owningCollection?.href) {
                        const href = indexableObject._links.owningCollection.href;
                        const uuidMatch = href.match(/collections\/([a-f0-9-]+)/i) ||
                            href.match(/items\/([a-f0-9-]+)\/owningCollection/i);
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
                        entity_type: getVal("dspace.entity.type"),
                        file_number: getVal("dars.document.number"),
                        case_document_type: getVal("dars.document.type"),
                        branch: getVal("dars.branch.location"),
                        case_status: getVal("dars.case.status"),
                        service_type: getVal("dars.case.type"),
                        document_date: getVal("dars.document.date"),
                        plaintiff: getValList("dars.giver.name"),
                        defendant: getValList("dars.receiver.name"),
                        city: getVal("dars.spatial.city"),
                        subcity: getVal("dars.spatial.subcity"),
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
            const collectionsList = await dspaceService.getCollections();
            const totalCols = collectionsList?.length || 0;
            const totalCaseFiles = await dspaceService.getSearchTotal();

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
                totalResources: totalCaseFiles,
                mySubmissions: mySubmissionsCount,
                allowedCollections: allowedCollectionsCount,
                communities: totalCols,
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
    };

    const handleCollectionClick = (collection) => {
        setSelectedCollections((prev) => {
            const collectionId = collection.uuid || collection.id;
            const isAlreadySelected = prev.some((c) => (c.uuid || c.id) === collectionId);

            if (isAlreadySelected) {
                const newSelection = prev.filter((c) => (c.uuid || c.id) !== collectionId);
                if (newSelection.length === 0) {
                    fetchAllResources(searchQuery);
                } else {
                    fetchDspaceItemsByCollections(newSelection);
                }
                return newSelection;
            } else {
                const newSelection = [...prev, collection];
                fetchDspaceItemsByCollections(newSelection);
                return newSelection;
            }
        });

        setDisplayMode("digital");
        setCurrentPage(1);
        setActiveFilters({});
    };

    const fetchDspaceItemsByCollections = async (collections) => {
        if (!collections || collections.length === 0) {
            return;
        }

        setLoading(true);
        try {
            const allItems = [];

            for (const collection of collections) {
                const collectionId = collection.uuid || collection.id;
                const params = new URLSearchParams({
                    query: searchQuery || "*",
                    scope: collectionId,
                    page: "0",
                    size: "100"
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

                    const transformedItems = items
                        .filter(item => {
                            const indexableObject = item._embedded?.indexableObject;
                            return indexableObject?.type === 'item';
                        })
                        .map(item => {
                            const metadata = item._embedded?.indexableObject?.metadata || {};
                            const getVal = (key) => {
                                const mk = metadata[key];
                                return mk && mk.length > 0 ? mk[0].value : "";
                            };
                            
                            let collectionName = null;
                            const indexableObject = item._embedded?.indexableObject;

                            if (indexableObject?._embedded?.owningCollection?.name) {
                                collectionName = indexableObject._embedded.owningCollection.name;
                            }
                            else if (indexableObject?.owningCollection?.name) {
                                collectionName = indexableObject.owningCollection.name;
                            }
                            else if (indexableObject?._links?.owningCollection?.href) {
                                const href = indexableObject._links.owningCollection.href;
                                const uuidMatch = href.match(/collections\/([a-f0-9-]+)/i) ||
                                    href.match(/items\/([a-f0-9-]+)\/owningCollection/i);
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
                                entity_type: getVal("dspace.entity.type"),
                                file_number: getVal("dars.document.number"),
                                case_document_type: getVal("dars.document.type"),
                                branch: getVal("dars.branch.location"),
                                case_status: getVal("dars.case.status"),
                                service_type: getVal("dars.case.type"),
                                document_date: getVal("dars.document.date"),
                                plaintiff: getVal("dars.giver.name"),
                                defendant: getVal("dars.receiver.name"),
                                city: getVal("dars.spatial.city"),
                                subcity: getVal("dars.spatial.subcity"),
                            };
                        });

                    allItems.push(...transformedItems);
                }
            }

            const processedItems = allItems.map(resource => {
                if (resource.collection_name && collections.length > 0) {
                    const isUuid = /^[a-f0-9-]{36}$/i.test(resource.collection_name);
                    if (isUuid) {
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
        setActiveFilters({}); 
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
            for (const [category, selectedValues] of Object.entries(activeFilters)) {
                if (!selectedValues || selectedValues.length === 0) continue;

                let resourceValue;
                if (category === 'case_type') {
                    resourceValue = resource.case_type;
                } 
                else if (category === 'case_status') {
                    resourceValue = resource.case_status;
                } 
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

    return {
        searchQuery, setSearchQuery,
        allResources, setAllResources,
        catalogedResources, setCatalogedResources,
        dspaceItems, setDspaceItems,
        loading, setLoading,
        isCirculationModalOpen, setIsCirculationModalOpen,
        selectedCaseFile, setSelectedCaseFile,
        stats, setStats,
        collections, setCollections,
        selectedCollections, setSelectedCollections,
        activeFilters, setActiveFilters,
        displayMode, setDisplayMode,
        currentPage, setCurrentPage,
        pageSize,
        dspacePagination, setDspacePagination,
        user, token, djangoToken,
        navigate,
        
        fetchCollections,
        fetchAllResources,
        fetchCatalogedResources,
        fetchSystemStats,
        handleCirculationClick,
        handleSearch,
        handleCollectionClick,
        fetchDspaceItemsByCollections,
        clearCollectionFilter,
        handleDisplayModeChange,
        getResourcesToDisplay,
        applyTreeFilters,
        handleDspacePageChange,
        baseResources,
        resourcesToDisplay
    };
};
