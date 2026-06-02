import {
	ChevronDownIcon,
	Download,
	DownloadIcon,
	FileTextIcon,
	XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdfjs } from "react-pdf";
import { useAuth } from "@/contexts/auth-context";
import { houseTypeOptions } from "../utils/constants";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { houseColumns, vitalEventColumns } from "@/components/resource/columns";
import FilterLabel from "@/components/resource/filter-label";
import { FilterOperatorSelect } from "@/components/resource/filter-operator-select";
import { FilterValueInput } from "@/components/resource/filter-value-input";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PdfPreview } from "../components/pdf-preview";
import dspaceService from "../services/dspaceService";

export default function ResourceTable() {
	const { user } = useAuth();
	const [allResources, setAllResources] = useState([]);
	const [loading, setLoading] = useState(false);
	const [activeFilters, setActiveFilters] = useState({});
	const [activeTab, setActiveTab] = useState("house");

	const [columnFilters, setColumnFilters] = useState({
		entityType: { value: "House", operator: "equals" },
		houseType: { value: "", operator: "equals" },
		houseNumber: { value: "", operator: "contains" },
		husband: { value: "", operator: "contains" },
		wife: { value: "", operator: "contains" },
		itemidentifier: { value: "", operator: "equals" },
		eventType: { value: "", operator: "equals" },
		subjectName: { value: "", operator: "contains" },
		motherName: { value: "", operator: "contains" },
		fatherName: { value: "", operator: "contains" },
		gender: { value: "", operator: "equals" },
	});

	const enableDownload = import.meta.env.VITE_ENABLE_FILE_DOWNLOAD === "true";

	const [pagination, setPagination] = useState({
		number: 0,
		size: 10,
		totalPages: 0,
		totalElements: 0,
	});

	const filterSelectOptions = useMemo(() => {
		if (!allResources || allResources.length === 0) {
			return { parentCommunity: [], owningCollection: [] };
		}

		const pcCounts = {};
		const ocCounts = {};

		allResources.forEach((resource) => {
			if (resource.parentCommunity) {
				pcCounts[resource.parentCommunity] =
					(pcCounts[resource.parentCommunity] || 0) + 1;
			}
			if (resource.owningCollection) {
				ocCounts[resource.owningCollection] =
					(ocCounts[resource.owningCollection] || 0) + 1;
			}
		});

		return {
			parentCommunity: Object.entries(pcCounts).sort((a, b) => b[1] - a[1]),
			owningCollection: Object.entries(ocCounts).sort((a, b) => b[1] - a[1]),
		};
	}, [allResources]);

	const filteredWoredaOptions = useMemo(() => {
		if (!allResources || allResources.length === 0) return [];

		const selectedSubCity = activeFilters.parentCommunity?.[0];
		const filtered = selectedSubCity
			? allResources.filter((r) => r.parentCommunity === selectedSubCity)
			: allResources;

		const counts = {};
		filtered.forEach((resource) => {
			if (resource.owningCollection) {
				counts[resource.owningCollection] =
					(counts[resource.owningCollection] || 0) + 1;
			}
		});

		return Object.entries(counts).sort((a, b) => b[1] - a[1]);
	}, [allResources, activeFilters.parentCommunity]);

	const fetchAllResources = useCallback(async () => {
		setLoading(true);
		try {
			const response = await dspaceService.searchItems(
				columnFilters,
				pagination.number,
				pagination.size,
			);

			const results = response.objects;
			setPagination(response.page);

			const mappedResults = await Promise.all(
				results.map(async (item) => {
					const metadata = item._embedded?.indexableObject?.metadata || {};

					const getVal = (key) => metadata[key]?.[0]?.value || "";
					const getValList = (key) =>
						metadata[key]?.map((m) => m.value).join(", ") || "";

					const bundles =
						item._embedded?.indexableObject?._embedded?.bundles?._embedded
							?.bundles || [];

					const originalBundleId =
						bundles.find((bundle) => bundle.name === "ORIGINAL")?.uuid || null;

					const idFieldGroups = {
						issn: ["dc.identifier.issn"],
						filenumber: ["dc.identifier.filenumber"],
						other: ["dc.identifier.other"],
					};

					const identifierGroups = {};
					Object.entries(idFieldGroups).forEach(([group, keys]) => {
						const vals = keys.flatMap(
							(k) => metadata[k]?.map((m) => m.value) || [],
						);
						const uniq = Array.from(new Set(vals));
						if (uniq.length) identifierGroups[group] = uniq;
					});

					const identifiers = Array.from(
						new Set(Object.values(identifierGroups).flat()),
					);

					return {
						id: item._embedded?.indexableObject?.uuid,
						entityType: getVal("dspace.entity.type"),
						identifiers: identifiers,
						identifierGroups: identifierGroups,
						houseFamilyKey:
							getVal("crvs.identifier.houseFamilyKey") ||
							item._embedded?.indexableObject?.name,
						husband: getValList("crvs.head.husband"),
						wife: getValList("crvs.head.wife"),
						houseNumber: getVal("crvs.identifier.houseNumber"),
						houseType: getVal("crvs.identifier.houseType"),
						dateOfRegistration: getVal("crvs.date.registration"),
						eventType: getVal("crvs.vital.eventType"),

						eventSubject:
							getValList("crvs.birth.childName") ||
							getValList("crvs.death.personName") ||
							(getValList("crvs.marriage.husbandName") &&
							getValList("crvs.marriage.wifeName")
								? `${getValList("crvs.marriage.husbandName")} & ${getValList("crvs.marriage.wifeName")}`
								: getValList("crvs.marriage.husbandName")) ||
							"",
						eventDate:
							getVal("crvs.birth.dateOfBirth") ||
							getVal("crvs.marriage.date") ||
							getVal("crvs.divorce.courtApprovalDate") ||
							getVal("crvs.death.dateOfDeath") ||
							"",
						gender:
							getVal("crvs.birth.gender") || getVal("crvs.death.gender") || "",
						motherName:
							getValList("crvs.birth.motherName") ||
							getValList("crvs.death.motherName") ||
							"",
						fatherName:
							getValList("crvs.birth.fatherName") ||
							getValList("crvs.death.fatherName") ||
							"",

						source: "dspace",
						familySummary: getVal("crvs.description.summary"),
						external_id:
							item._embedded?.indexableObject?.handle ||
							item._embedded?.indexableObject?.uuid,

						owningCollection:
							item._embedded?.indexableObject?._embedded?.owningCollection
								?.name || null,
						parentCommunity:
							item._embedded?.indexableObject?._embedded?.owningCollection
								?._embedded?.parentCommunity?.name || "-",

						originalBundleId: originalBundleId,
					};
				}),
			);

			setAllResources(mappedResults);
		} catch (error) {
			console.error("Error fetching resources:", error);
			setAllResources([]);
		} finally {
			setLoading(false);
		}
	}, [columnFilters, pagination.number, pagination.size]);

	const handlePageChange = (newPage) => {
		setPagination((prev) => ({ ...prev, number: newPage }));
	};

	const handlePageSizeChange = (newSize) => {
		setPagination((prev) => ({ ...prev, size: newSize, number: 0 }));
	};

	// Initial fetch
	useEffect(() => {
		if (!user) {
			setAllResources([]);
			return;
		}
		fetchAllResources();
	}, [fetchAllResources, user]);

	const onColumnFilterChange = setColumnFilters;
	const onPageChange = handlePageChange;
	const onPageSizeChange = handlePageSizeChange;

	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [primaryBitstream, setPrimaryBitstream] = useState(null);
	const [bundledBitstreams, setBundledBitstreams] = useState(null);
	const [selectedBitstream, setSelectedBitstream] = useState(null);
	const [activePreviewBitstream, setActivePreviewBitstream] = useState(null);
	const [bitstreamContentUrls, setBitstreamContentUrls] = useState({});
	const [loadingBitstreamContent, setLoadingBitstreamContent] = useState({});
	const bitstreamContentUrlsRef = useRef({});
	const loadingBitstreamContentRef = useRef({});

	const allBitstreams = primaryBitstream
		? [primaryBitstream, ...(bundledBitstreams || [])]
		: bundledBitstreams || [];

	const releaseBitstreamContentUrls = useCallback(() => {
		Object.values(bitstreamContentUrlsRef.current).forEach((url) => {
			URL.revokeObjectURL(url);
		});
		bitstreamContentUrlsRef.current = {};
		loadingBitstreamContentRef.current = {};
		setBitstreamContentUrls({});
		setLoadingBitstreamContent({});
	}, []);

	const closePreview = useCallback(() => {
		setShowPreviewModal(false);
		setPrimaryBitstream(null);
		setBundledBitstreams(null);
		setSelectedBitstream(null);
		setActivePreviewBitstream(null);
		releaseBitstreamContentUrls();
	}, [releaseBitstreamContentUrls]);

	const ensureBitstreamContentUrl = useCallback(async (bitstream) => {
		const bitstreamUuid = bitstream?.uuid;
		if (
			!bitstreamUuid ||
			bitstreamContentUrlsRef.current[bitstreamUuid] ||
			loadingBitstreamContentRef.current[bitstreamUuid]
		) {
			return;
		}

		loadingBitstreamContentRef.current = {
			...loadingBitstreamContentRef.current,
			[bitstreamUuid]: true,
		};
		setLoadingBitstreamContent({ ...loadingBitstreamContentRef.current });

		try {
			const blob = await dspaceService.getBitstreamContent(bitstreamUuid);
			const objectUrl = URL.createObjectURL(blob);
			bitstreamContentUrlsRef.current = {
				...bitstreamContentUrlsRef.current,
				[bitstreamUuid]: objectUrl,
			};
			setBitstreamContentUrls({ ...bitstreamContentUrlsRef.current });
		} catch (error) {
			console.warn("Failed to fetch bitstream content", error);
		} finally {
			const { [bitstreamUuid]: _finished, ...remainingLoading } =
				loadingBitstreamContentRef.current;
			loadingBitstreamContentRef.current = remainingLoading;
			setLoadingBitstreamContent(remainingLoading);
		}
	}, []);

	const isImage = (b) => {
		if (!b?.name) return false;
		return /\.(jpe?g|png|gif|svg|webp|bmp)$/i.test(b.name);
	};

	const isPdf = (b) => {
		if (!b?.name) return false;
		return /\.pdf$/i.test(b.name);
	};

	const handleColumnFilterChange = (field, type, value) => {
		onColumnFilterChange((prev) => ({
			...prev,
			[field]: { ...prev[field], [type]: value },
		}));
	};

	const handleFilterSelectChange = (category, value) => {
		setActiveFilters((prev) => {
			if (value === "all") {
				const next = { ...prev };
				delete next[category];
				return next;
			}
			return { ...prev, [category]: [value] };
		});
	};

	const handleTabChange = (nextTab) => {
		setActiveTab(nextTab);
		setPagination((prev) => ({ ...prev, number: 0 }));
		onColumnFilterChange(() => ({
			entityType: {
				value: nextTab === "house" ? "House" : "VitalEvent",
				operator: "equals",
			},
			houseType: { value: "", operator: "equals" },
			houseNumber: { value: "", operator: "contains" },
			husband: { value: "", operator: "contains" },
			wife: { value: "", operator: "contains" },
			itemidentifier: { value: "", operator: "equals" },
			eventType: { value: "", operator: "equals" },
			subjectName: { value: "", operator: "contains" },
			motherName: { value: "", operator: "contains" },
			fatherName: { value: "", operator: "contains" },
			gender: { value: "", operator: "equals" },
		}));
	};

	const handlePreview = async (resource, e) => {
		e.stopPropagation();

		if (!resource.originalBundleId) {
			console.warn("No bitstream links found on resource");
			return;
		}

		const res = await dspaceService.getBitstreams(resource.originalBundleId);
		if (res.primaryBitstream || res.bundledBitstreams) {
			setPrimaryBitstream(res.primaryBitstream);
			setBundledBitstreams(
				res.bundledBitstreams?._embedded?.bitstreams.filter(
					(bitstream) => bitstream.uuid !== res?.primaryBitstream?.uuid,
				) ?? [],
			);

			setShowPreviewModal(true);
		}
	};

	const operators = [
		{ value: "equals", label: "Equals" },
		{ value: "notequals", label: "Not Equals" },
		{ value: "contains", label: "Contains" },
		{ value: "notcontains", label: "Not Contains" },
	];

	useEffect(() => {
		if (bundledBitstreams?.length > 0) {
			setSelectedBitstream(bundledBitstreams[0]);
		}
	}, [bundledBitstreams]);

	useEffect(() => {
		if (showPreviewModal && primaryBitstream) {
			setActivePreviewBitstream(primaryBitstream);
		}
	}, [showPreviewModal, primaryBitstream]);

	useEffect(() => {
		if (!showPreviewModal) return;

		[activePreviewBitstream, primaryBitstream, selectedBitstream].forEach(
			(bitstream) => {
				ensureBitstreamContentUrl(bitstream);
			},
		);
	}, [
		activePreviewBitstream,
		ensureBitstreamContentUrl,
		primaryBitstream,
		selectedBitstream,
		showPreviewModal,
	]);

	useEffect(() => {
		return releaseBitstreamContentUrls;
	}, [releaseBitstreamContentUrls]);

	const activePreviewUrl = activePreviewBitstream?.uuid
		? bitstreamContentUrls[activePreviewBitstream.uuid]
		: null;
	const primaryBitstreamUrl = primaryBitstream?.uuid
		? bitstreamContentUrls[primaryBitstream.uuid]
		: null;
	const selectedBitstreamUrl = selectedBitstream?.uuid
		? bitstreamContentUrls[selectedBitstream.uuid]
		: null;

	const renderBitstreamPreview = (bitstream, contentUrl, emptyMessage) => {
		if (!bitstream) {
			return <div className="text-muted-foreground">{emptyMessage}</div>;
		}

		const needsContent = isImage(bitstream) || isPdf(bitstream);
		if (needsContent && !contentUrl) {
			return (
				<div className="text-sm text-muted-foreground">
					{loadingBitstreamContent[bitstream.uuid]
						? "Loading file..."
						: "File preview is not available"}
				</div>
			);
		}

		if (isImage(bitstream)) {
			return (
				<img
					src={contentUrl}
					alt={bitstream?.name}
					className="max-h-[70vh] max-w-full object-contain rounded-md shadow-sm"
				/>
			);
		}

		if (isPdf(bitstream)) {
			return <PdfPreview fileUrl={contentUrl} />;
		}

		return (
			<div className="text-sm text-muted-foreground">
				<div className="font-medium mb-1">{bitstream?.name}</div>
				<div className="text-xs">Type: {bitstream?.format || "Unknown"}</div>
			</div>
		);
	};

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<div className="flex justify-between items-center mb-2">
				<div className="flex items-center gap-4">
					<TabsList className="h-9! m-0!">
						<TabsTrigger value="house">Resident</TabsTrigger>
						<TabsTrigger value="vitalEvent">Vital Events</TabsTrigger>
					</TabsList>
				</div>
			</div>

			<Card>
				<CardContent className="space-y-4">
					{/* Search Filter Grid - Always Visible */}
					<div className="bg-muted/50 p-4 rounded-lg">
						<div className="flex items-center justify-between mb-4">
							<h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								Detail Search
							</h4>
							{(columnFilters.houseNumber?.value ||
								columnFilters.houseType?.value ||
								columnFilters.husband?.value ||
								columnFilters.wife?.value ||
								columnFilters.itemidentifier?.value ||
								columnFilters.eventType?.value ||
								columnFilters.subjectName?.value ||
								columnFilters.motherName?.value ||
								columnFilters.fatherName?.value ||
								columnFilters.gender?.value ||
								activeFilters.parentCommunity ||
								activeFilters.owningCollection) && (
								<Button
									type="button"
									onClick={() => {
										onColumnFilterChange((prev) => ({
											...prev,
											houseType: { value: "", operator: "equals" },
											houseNumber: { value: "", operator: "contains" },
											husband: { value: "", operator: "contains" },
											wife: { value: "", operator: "contains" },
											itemidentifier: { value: "", operator: "equals" },
											eventType: { value: "", operator: "equals" },
											subjectName: { value: "", operator: "contains" },
											motherName: { value: "", operator: "contains" },
											fatherName: { value: "", operator: "contains" },
											gender: { value: "", operator: "equals" },
										}));
										setActiveFilters({});
									}}
									variant="destructive"
									size="sm"
								>
									<XIcon /> Clear Filters
								</Button>
							)}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{/* Shared Identifier Filter */}
							<div>
								<div className="flex items-center justify-between">
									<FilterLabel
										htmlFor="filter-itemidentifier"
										label="Identifier"
									/>
									<FilterOperatorSelect
										value={columnFilters.itemidentifier?.operator || "equals"}
										onChange={(value) =>
											handleColumnFilterChange(
												"itemidentifier",
												"operator",
												value,
											)
										}
										operators={operators}
									/>
								</div>
								<FilterValueInput
									id="filter-itemidentifier"
									placeholder="e.g. 123"
									value={columnFilters.itemidentifier?.value || ""}
									onChange={(value) =>
										handleColumnFilterChange("itemidentifier", "value", value)
									}
								/>
							</div>
							{/* Sub City Filter */}
							<div>
								<div className="h-8 flex items-center justify-between">
									<FilterLabel htmlFor="filter-sub-city" label="Sub City" />
								</div>
								<Select
									value={activeFilters.parentCommunity?.[0] || "all"}
									onValueChange={(value) =>
										handleFilterSelectChange("parentCommunity", value)
									}
								>
									<SelectTrigger id="filter-sub-city" className="w-full">
										<SelectValue placeholder="All Sub Cities" />
									</SelectTrigger>
									<SelectContent className="p-2">
										<SelectItem value="all">All Sub Cities</SelectItem>
										{filterSelectOptions.parentCommunity.map(
											([name, count]) => (
												<SelectItem key={name} value={name}>
													{name} ({count})
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
							{/* Woreda Filter */}
							<div>
								<div className="h-8 flex items-center justify-between">
									<FilterLabel htmlFor="filter-woreda" label="Woreda" />
								</div>
								<Select
									value={activeFilters.owningCollection?.[0] || "all"}
									onValueChange={(value) =>
										handleFilterSelectChange("owningCollection", value)
									}
								>
									<SelectTrigger id="filter-woreda" className="w-full">
										<SelectValue placeholder="All Woredas" />
									</SelectTrigger>
									<SelectContent className="p-2">
										<SelectItem value="all">All Woredas</SelectItem>
										{filteredWoredaOptions.map(([name, count]) => (
											<SelectItem key={name} value={name}>
												{name} ({count})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* House Specific Filters */}
						{activeTab === "house" && (
							<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel
											htmlFor="filter-house-number"
											label="House Number"
										/>
										<FilterOperatorSelect
											value={columnFilters.houseNumber?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange(
													"houseNumber",
													"operator",
													value,
												)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-house-number"
										placeholder="e.g. 123"
										value={columnFilters.houseNumber?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("houseNumber", "value", value)
										}
									/>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel
											htmlFor="filter-house-type"
											label="House Type"
										/>
										<FilterOperatorSelect
											value={columnFilters.houseType?.operator || "equals"}
											onChange={(value) =>
												handleColumnFilterChange("houseType", "operator", value)
											}
											operators={operators}
										/>
									</div>
									<Select
										value={columnFilters.houseType?.value || "all"}
										onValueChange={(value) =>
											handleColumnFilterChange(
												"houseType",
												"value",
												value === "all" ? "" : value,
											)
										}
									>
										<SelectTrigger id="filter-house-type" className="w-full">
											<SelectValue placeholder="All House Types" />
										</SelectTrigger>
										<SelectContent className="p-2">
											<SelectItem value="all">All House Types</SelectItem>
											{houseTypeOptions.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel
											htmlFor="filter-husband"
											label="Husband Name"
										/>
										<FilterOperatorSelect
											value={columnFilters.husband?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange("husband", "operator", value)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-husband"
										placeholder="Search husband..."
										value={columnFilters.husband?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("husband", "value", value)
										}
									/>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel htmlFor="filter-wife" label="Wife Name" />
										<FilterOperatorSelect
											value={columnFilters.wife?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange("wife", "operator", value)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-wife"
										placeholder="Search wife..."
										value={columnFilters.wife?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("wife", "value", value)
										}
									/>
								</div>
							</div>
						)}

						{activeTab === "vitalEvent" && (
							<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel
											htmlFor="filter-event-type"
											label="Event Type"
										/>
										<FilterOperatorSelect
											value={columnFilters.eventType?.operator || "equals"}
											onChange={(value) =>
												handleColumnFilterChange("eventType", "operator", value)
											}
											operators={operators}
										/>
									</div>
									<Select
										value={columnFilters.eventType?.value || "all"}
										onValueChange={(value) =>
											handleColumnFilterChange(
												"eventType",
												"value",
												value === "all" ? "" : value,
											)
										}
									>
										<SelectTrigger id="filter-event-type" className="w-full">
											<SelectValue placeholder="All Event Types" />
										</SelectTrigger>
										<SelectContent className="p-2">
											<SelectItem value="all">All Event Types</SelectItem>
											<SelectItem value="Birth">Birth</SelectItem>
											<SelectItem value="Marriage / Divorce">
												Marriage / Divorce
											</SelectItem>
											<SelectItem value="Death">Death</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1">
											<FilterLabel
												htmlFor="filter-subject-name"
												label="Subject Name"
											/>
										</div>
										<FilterOperatorSelect
											value={columnFilters.subjectName?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange(
													"subjectName",
													"operator",
													value,
												)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-subject-name"
										placeholder="Search subject..."
										value={columnFilters.subjectName?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("subjectName", "value", value)
										}
									/>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1">
											<FilterLabel
												htmlFor="filter-mother-name"
												label="Mother Name"
											/>
										</div>
										<FilterOperatorSelect
											value={columnFilters.motherName?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange(
													"motherName",
													"operator",
													value,
												)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-mother-name"
										placeholder="Search mother..."
										value={columnFilters.motherName?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("motherName", "value", value)
										}
									/>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1">
											<FilterLabel
												htmlFor="filter-father-name"
												label="Father Name"
											/>
										</div>
										<FilterOperatorSelect
											value={columnFilters.fatherName?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange(
													"fatherName",
													"operator",
													value,
												)
											}
											operators={operators}
										/>
									</div>
									<FilterValueInput
										id="filter-father-name"
										placeholder="Search father..."
										value={columnFilters.fatherName?.value || ""}
										onChange={(value) =>
											handleColumnFilterChange("fatherName", "value", value)
										}
									/>
								</div>
								<div>
									<div className="flex items-center justify-between">
										<FilterLabel htmlFor="filter-gender" label="Gender" />
										<FilterOperatorSelect
											value={columnFilters.gender?.operator || "contains"}
											onChange={(value) =>
												handleColumnFilterChange("gender", "operator", value)
											}
											operators={operators}
										/>
									</div>

									<Select
										value={columnFilters.gender?.value || "all"}
										onValueChange={(value) =>
											handleColumnFilterChange(
												"gender",
												"value",
												value === "all" ? "" : value,
											)
										}
									>
										<SelectTrigger id="filter-gender" className="w-full">
											<SelectValue placeholder="All Genders" />
										</SelectTrigger>
										<SelectContent className="p-2">
											<SelectItem value="all">All Genders</SelectItem>
											<SelectItem value="male">Male</SelectItem>
											<SelectItem value="female">Female</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						)}
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-border" />
							<p className="mt-4 text-muted-foreground text-lg">
								መዛግብት እና መጻሕፍት በመጫን ላይ...
							</p>
						</div>
					) : allResources.length === 0 ? (
						<div className="text-center py-12 bg-muted/50 rounded-lg">
							<FileTextIcon className="w-16 h-16 text-muted-foreground/80 mx-auto mb-4" />
							<h3 className="text-xl font-semibold text-muted-foreground/80 mb-2">
								ምንም መዝገቦች አልተገኙም
							</h3>
							<p className="text-muted-foreground/80 mb-4">
								የፍለጋ መስፈርቶችዎን ማስተካከል ወይም በምድብ ማሰስ ይሞክሩ
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<TabsContent value="house">
								<DataTable
									columns={houseColumns}
									data={allResources}
									meta={{ handlePreview }}
								/>
							</TabsContent>
							<TabsContent value="vitalEvent">
								<DataTable
									columns={vitalEventColumns}
									data={allResources}
									meta={{ handlePreview }}
								/>
							</TabsContent>
						</div>
					)}

					{/* Pagination Controls */}
					{allResources.length > 0 && (
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-t">
							{/* Results info */}
							<div className="text-sm text-muted-foreground text-center sm:text-left">
								Showing{" "}
								<span className="font-medium text-foreground">
									{pagination.number * pagination.size + 1}
								</span>{" "}
								to{" "}
								<span className="font-medium text-foreground">
									{Math.min(
										(pagination.number + 1) * pagination.size,
										pagination.totalElements,
									)}
								</span>{" "}
								of{" "}
								<span className="font-medium text-foreground">
									{pagination.totalElements}
								</span>{" "}
								results
							</div>

							{/* Controls */}
							<div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
								{/* Rows per page */}
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground whitespace-nowrap">
										Rows per page:
									</span>
									<Select
										value={pagination.size.toString()}
										onValueChange={(value) => onPageSizeChange(Number(value))}
									>
										<SelectTrigger className="w-fit text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="w-fit p-2">
											{[5, 10, 20, 50, 100].map((size) => (
												<SelectItem key={size} value={size.toString()}>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Pagination buttons */}
								<div className="flex items-center gap-2">
									{/* Previous */}
									<Button
										variant="outline"
										type="button"
										onClick={() => onPageChange(pagination.number - 1)}
										disabled={pagination.number === 0}
									>
										Previous
									</Button>

									{/* Page indicator */}
									<div className="flex items-center gap-2">
										<span className="min-w-10 flex items-center justify-center h-8 text-sm border border-border rounded-md">
											{pagination.number + 1}
										</span>

										<span className="text-muted-foreground text-sm">/</span>

										<span className="min-w-10 flex items-center justify-center h-8 text-sm border border-border rounded-md">
											{pagination.totalPages}
										</span>
									</div>

									{/* Next */}
									<Button
										variant="outline"
										type="button"
										onClick={() => onPageChange(pagination.number + 1)}
										disabled={pagination.number >= pagination.totalPages - 1}
									>
										Next
									</Button>
								</div>
							</div>
						</div>
					)}

					{/* Preview Modal with Backdrop */}
					{showPreviewModal && (
						<div
							className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4"
							role="dialog"
							aria-modal="true"
							onClick={(e) => {
								if (e.target === e.currentTarget) {
									closePreview();
								}
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									closePreview();
								}
							}}
						>
							{/** biome-ignore lint/a11y/noStaticElementInteractions: <ignore> */}
							{/** biome-ignore lint/a11y/useKeyWithClickEvents: <ignore> */}
							<div
								className="relative bg-foreground rounded-xl shadow-2xl w-[95vw] h-[95vh] flex overflow-hidden"
								onClick={(e) => e.stopPropagation()}
							>
								{/* Mobile: Single panel with dropdown */}
								<div className="lg:hidden flex flex-col w-full h-full overflow-hidden">
									<div className="flex flex-col min-w-0 bg-primary text-primary-foreground px-4 py-3 border-b">
										<div className="flex items-center justify-between gap-2">
											<div className="relative inline-block flex-1">
												<button
													type="button"
													className="w-full flex items-center justify-between px-3 py-2 text-left bg-primary/10 hover:bg-primary/20 text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
												>
													<span className="flex items-center gap-3">
														<ChevronDownIcon />
														<div className="flex-1 min-w-0">
															<div className="font-semibold truncate">
																{activePreviewBitstream?.name || "Preview"}
															</div>
															<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
																{activePreviewBitstream?.metadata?.[
																	"crvs.documentType"
																]?.[0]?.value && (
																	<span>
																		<span className="font-medium">Type:</span>{" "}
																		{
																			activePreviewBitstream.metadata[
																				"crvs.documentType"
																			][0].value
																		}
																	</span>
																)}
																{activePreviewBitstream?.metadata?.[
																	"crvs.document.status"
																]?.[0]?.value && (
																	<span>
																		<span className="font-medium">Status:</span>{" "}
																		{
																			activePreviewBitstream.metadata[
																				"crvs.document.status"
																			][0].value
																		}
																	</span>
																)}
																{activePreviewBitstream?.sizeBytes && (
																	<span>
																		<span className="font-medium">Size:</span>{" "}
																		{(
																			activePreviewBitstream.sizeBytes / 1024
																		).toFixed(1)}{" "}
																		KB
																	</span>
																)}
															</div>
														</div>
													</span>
												</button>
												<select
													value={activePreviewBitstream?.uuid}
													onChange={(e) =>
														setActivePreviewBitstream(
															allBitstreams.find(
																(b) => b.uuid === e.target.value,
															),
														)
													}
													className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
												>
													{allBitstreams.map((b, idx) => (
														<option key={b.uuid} value={b.uuid}>
															{idx === 0 ? "Primary: " : `File ${idx}: `}
															{b.name}
														</option>
													))}
												</select>
											</div>
											{enableDownload &&
												activePreviewBitstream &&
												activePreviewUrl && (
													<a
														href={activePreviewUrl}
														target="_blank"
														rel="noopener noreferrer"
														download={activePreviewBitstream.name}
														className="p-1.5 rounded hover:bg-white/20 transition-colors"
														title="Download"
													>
														<Download className="w-4 h-4" />
													</a>
												)}
										</div>
									</div>
									<div className="flex-1 overflow-auto p-4 bg-white flex flex-col">
										<div className="flex-1 overflow-auto flex items-center justify-center">
											{renderBitstreamPreview(
												activePreviewBitstream,
												activePreviewUrl,
												"No file selected",
											)}
										</div>
									</div>
								</div>

								{/* Desktop: Two panels side by side */}
								<div className="hidden lg:flex w-full h-full">
									{/* Left: Primary Bitstream */}
									<div className="flex flex-col w-1/2 h-full border-r overflow-hidden">
										<div className="h-18 flex flex-col justify-center border-b bg-primary text-primary-foreground px-4 py-3">
											<div className="flex items-center gap-2">
												<h2 className="text-lg font-semibold truncate text-ellipsis line-clamp-1">
													{primaryBitstream?.name || "Preview"}
												</h2>
												{enableDownload &&
													primaryBitstream &&
													primaryBitstreamUrl && (
														<a
															href={primaryBitstreamUrl}
															target="_blank"
															rel="noopener noreferrer"
															download={primaryBitstream.name}
															className="p-1.5 rounded hover:bg-white/20 transition-colors"
															title="Download"
														>
															<Download className="w-4 h-4" />
														</a>
													)}
											</div>
											<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90 mt-1">
												{primaryBitstream?.metadata?.["crvs.documentType"]?.[0]
													?.value && (
													<span>
														<span className="font-medium">Type:</span>{" "}
														{
															primaryBitstream.metadata["crvs.documentType"][0]
																.value
														}
													</span>
												)}
												{primaryBitstream?.metadata?.[
													"crvs.document.status"
												]?.[0]?.value && (
													<span>
														<span className="font-medium">Status:</span>{" "}
														{
															primaryBitstream.metadata[
																"crvs.document.status"
															][0].value
														}
													</span>
												)}
												{primaryBitstream?.sizeBytes && (
													<span>
														<span className="font-medium">Size:</span>{" "}
														{(primaryBitstream.sizeBytes / 1024).toFixed(1)} KB
													</span>
												)}
											</div>
										</div>
										<div className="flex-1 overflow-auto bg-white flex flex-col">
											<div className="flex-1 overflow-auto flex items-center justify-center">
												{renderBitstreamPreview(
													primaryBitstream,
													primaryBitstreamUrl,
													"Primary file not found",
												)}
											</div>
										</div>
									</div>

									{/* Right: Bundled Bitstreams */}
									<div className="flex flex-col w-1/2 h-full overflow-hidden">
										<div className="h-18 flex flex-col min-w-0 bg-primary text-primary-foreground px-4 py-3 border-b">
											<div className="flex items-start">
												<div className="relative inline-block">
													<button
														type="button"
														className="w-full flex items-center justify-between px-3 py-0.5 text-left bg-primary/10 hover:bg-primary/20 text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
													>
														<span className="flex items-center gap-4">
															<ChevronDownIcon />
															<div>
																<h2 className="text-lg font-semibold truncate text-ellipsis line-clamp-1">
																	{bundledBitstreams?.length > 0
																		? selectedBitstream?.name ||
																			primaryBitstream?.name
																		: "No Additional Files"}
																</h2>
																{bundledBitstreams?.length > 0 && (
																	<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90 text-ellipsis line-clamp-1">
																		{selectedBitstream?.metadata?.[
																			"crvs.documentType"
																		]?.[0]?.value && (
																			<span>
																				<span className="font-medium">
																					Type:
																				</span>{" "}
																				{
																					selectedBitstream.metadata[
																						"crvs.documentType"
																					][0].value
																				}
																			</span>
																		)}
																		{selectedBitstream?.metadata?.[
																			"crvs.document.status"
																		]?.[0]?.value && (
																			<span>
																				<span className="font-medium">
																					Status:
																				</span>{" "}
																				{
																					selectedBitstream.metadata[
																						"crvs.document.status"
																					][0].value
																				}
																			</span>
																		)}
																		{selectedBitstream?.sizeBytes && (
																			<span>
																				<span className="font-medium">
																					Size:
																				</span>{" "}
																				{(
																					selectedBitstream.sizeBytes / 1024
																				).toFixed(1)}{" "}
																				KB
																			</span>
																		)}
																	</div>
																)}
															</div>
														</span>
													</button>
													{bundledBitstreams?.length > 0 && (
														<select
															value={selectedBitstream?.uuid}
															onChange={(e) =>
																setSelectedBitstream(
																	bundledBitstreams.find(
																		(b) => b.uuid === e.target.value,
																	),
																)
															}
															className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
														>
															{bundledBitstreams.map((b) => (
																<option key={b.uuid} value={b.uuid}>
																	{b.name}
																</option>
															))}
														</select>
													)}
												</div>
												{enableDownload &&
													bundledBitstreams?.length > 0 &&
													selectedBitstream &&
													selectedBitstreamUrl && (
														<a
															href={selectedBitstreamUrl}
															target="_blank"
															rel="noopener noreferrer"
															download={selectedBitstream.name}
															className="p-1.5 rounded hover:bg-white/20 transition-colors mt-0.5"
															title="Download"
														>
															<DownloadIcon className="w-4 h-4" />
														</a>
													)}
											</div>
										</div>
										<div className="flex-1 overflow-auto bg-white flex flex-col">
											<div className="flex-1 overflow-auto flex items-center justify-center">
												{bundledBitstreams?.length > 0 ? (
													renderBitstreamPreview(
														selectedBitstream,
														selectedBitstreamUrl,
														"No additional files",
													)
												) : (
													<div className="text-muted-foreground">
														No additional files
													</div>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Close Button */}
								<button
									type="button"
									onClick={closePreview}
									className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white text-lg font-bold flex items-center justify-center transition-colors"
								>
									×
								</button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</Tabs>
	);
}
