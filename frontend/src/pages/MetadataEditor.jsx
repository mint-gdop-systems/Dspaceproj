import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
    FileText,
    Image,
    File,
    Upload,
    Eye,
    ChevronLeft,
    ChevronRight as RightIcon,
    ZoomIn,
    ZoomOut,
    ChevronDown,
    Check,
    PlusCircle,
    Trash2,
} from "lucide-react";
import dspaceService from "../services/dspaceService";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const VALUE_PAIRS = {
    case_types: [
        { label: "የፍትሐብሔር መዝገብ (Civil)", value: "Civil" },
        { label: "የወንጀል መዝገብ (Criminal)", value: "Criminal" },
        { label: "የሰበር መዝገብ (Cassation)", value: "Cassation" },
    ],
    case_levels: [
        { label: "Registrar (ሬጅስትራር)", value: "Registrar" },
        { label: "Screening (ቅድመ ምርመራ)", value: "Screening" },
        { label: "Litigation (የችሎት ክርክር)", value: "Litigation" },
        { label: "Archive (መዝገብ ቤት)", value: "Archive" },
    ],
    case_status_types: [
        { label: "Active (በሂደት ላይ)", value: "Active" },
        { label: "Adjourned (የተቀጠረ)", value: "Adjourned" },
        { label: "Closed (የተዘጋ)", value: "Closed" },
    ],
    record_formats: [
        { label: "የኤሌክትሮኒክ ፋይል (E-File Only)", value: "Electronic" },
        { label: "የወረቀት ፋይል (Physical File Only)", value: "Physical" },
        { label: "ድብልቅ (Hybrid/Both)", value: "Hybrid" },
    ],
    document_sections: [
        { label: "1. Pleadings (የአቤቱታ/የክስ ክፍል)", value: "Pleadings" },
        { label: "2. Orders & Minutes (የቃለ-ጉባኤ እና የትዕዛዝ ክፍል)", value: "Orders_Minutes" },
        { label: "3. Evidence (የማስረጃ ክፍል)", value: "Evidence" },
        { label: "4. Administrative (የአስተዳደር ክፍል)", value: "Administrative" },
    ],
    document_types: [
        { label: "የክስ ማመልከቻ (Complaint)", value: "Complaint" },
        { label: "የመከላከያ መልስ (Defense Statement)", value: "Defense" },
        { label: "የችሎት ቃለ-ጉባኤ (Minutes)", value: "Minutes" },
        { label: "የመጨረሻ ውሳኔ (Final Judgment)", value: "Judgment" },
        { label: "የሰነድ ማስረጃ (Exhibit Document)", value: "Exhibit" },
        { label: "የባለሙያ ሪፖርት (Expert Report)", value: "Expert_Report" },
        { label: "የዳኝነት ክፍያ ደረሰኝ (Court Fee Receipt)", value: "Fee_Receipt" },
    ],
    active_status_types: [
        { label: "Active (ገቢ)", value: "Active" },
        { label: "Inactive (ውድቅ)", value: "Inactive" },
    ],
};

const RepeatableField = ({ label, values, setValues, placeholder }) => {
    const addField = () => setValues([...values, ""]);
    const removeField = (index) =>
        setValues(values.filter((_, i) => i !== index));
    const updateField = (index, value) => {
        const newValues = [...values];
        newValues[index] = value;
        setValues(newValues);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            {values.map((value, index) => (
                <div key={index} className="flex items-center mb-2">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => updateField(index, e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="ml-2 text-red-600 hover:text-red-800"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={addField}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
                <PlusCircle size={16} className="mr-1" />
                Add {label}
            </button>
        </div>
    );
};

const MetadataEditor = () => {
    const [files, setFiles] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);

    // Form state
    const [collections, setCollections] = useState([]);
    const [collectionId, setCollectionId] = useState("");
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("en_US");
    const [description, setDescription] = useState("");

    // Traditional Page One
    const [fileNumber, setFileNumber] = useState("");
    const [caseType, setCaseType] = useState("");
    const [plaintiffs, setPlaintiffs] = useState([""]);
    const [defendants, setDefendants] = useState([""]);
    const [caseRepresentatives, setCaseRepresentatives] = useState([""]);
    const [registrationDate, setRegistrationDate] = useState("");

    // Traditional Page Two
    const [caseLevel, setCaseLevel] = useState("");
    const [caseStatus, setCaseStatus] = useState("");
    const [primaryJudge, setPrimaryJudge] = useState("");
    const [judgeNumber, setJudgeNumber] = useState("");
    const [location, setLocation] = useState("");
    const [benchSession, setBenchSession] = useState("");
    const [recordFormat, setRecordFormat] = useState("");
    const [shelfNumber, setShelfNumber] = useState("");
    const [rowNumber, setRowNumber] = useState("");
    const [rfid, setRfid] = useState("");


    // PDF viewer states
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfError, setPdfError] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);

    useEffect(() => {
        const fetchDspaceCollections = async () => {
            try {
                const fetchedCollections = await dspaceService.getCollections();
                setCollections(fetchedCollections);
            } catch (error) {
                console.error("Failed to fetch DSpace collections:", error);
            }
        };
        fetchDspaceCollections();
    }, []);

    const selectedFile = files.find((f) => f.id === selectedFileId);

    const handleFileUpload = (event) => {
        const uploadedFiles = Array.from(event.target.files || []);

        const newFileItems = uploadedFiles.map((file) => ({
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified),
            fileObject: file,
            fileUrl: URL.createObjectURL(file),
            label: "",
            metadata: {
                title: file.name,
                section: "",
                type: "",
                exhibitCode: "",
                status: "Active",
                description: "",
            }
        }));

        const updatedFiles = [...files, ...newFileItems];
        setFiles(updatedFiles);

        if (newFileItems.length > 0 && !selectedFileId) {
            handleFileSelect(newFileItems[0].id);
        }

        event.target.value = "";
    };

    const handleFileSelect = (fileId) => {
        setSelectedFileId(fileId);
        const file = files.find((f) => f.id === fileId);
        if (file) {
            setTitle(file.name); // Default title to filename
        }
        setShowFileDropdown(false);
        setPageNumber(1);
        setNumPages(null);
        setPdfError(null);
    };

    const [primaryFileId, setPrimaryFileId] = useState(null);

    const handleFinalUpload = async () => {
        if (uploading || files.length === 0) {
            alert("Please select files to upload.");
            return;
        }

        if (
            !fileNumber ||
            !collectionId
        ) {
            alert(
                "Please fill mandatory fields: Case Number and Collection."
            );
            return;
        }

        // Judge Number validation (1-9)
        if (judgeNumber && (isNaN(judgeNumber) || parseInt(judgeNumber) < 1 || parseInt(judgeNumber) > 9)) {
            alert("Judge Number must be a number between 1 and 9.");
            setUploading(false);
            return;
        }

        setUploading(true);

        // Check if user is authenticated with DSpace
        if (!dspaceService.isAuthenticated && !dspaceService.authToken) {
            alert("Please sign in before uploading.");
            setUploading(false);
            return;
        }

        try {
            // 1. Create workspace item
            const workspaceItem = await dspaceService.createWorkspaceItem(collectionId);
            const workspaceItemId = workspaceItem.id;

            // 2. Update metadata
            const metadata = {
                title: title || fileNumber, // Fallback if no specific title
                description: description,
                language: language,
                // Traditional Page 1
                fileNumber,
                caseType,
                plaintiff: plaintiffs.filter(p => p.trim()),
                defendant: defendants.filter(d => d.trim()),
                caseRepresentative: caseRepresentatives.filter(r => r.trim()),
                registrationDate,
                // Traditional Page 2
                caseLevel,
                caseStatus,
                primaryJudge,
                judgeNumber,
                location,
                benchSession,
                recordFormat,
                shelfNumber,
                rowNumber,
                rfid,
            };

            await dspaceService.updateMetadata(workspaceItemId, metadata);

            // 3. Upload files
            const filesToUpload = [...files].sort((a, b) => {
                if (a.id === primaryFileId) return -1;
                if (b.id === primaryFileId) return 1;
                return 0;
            });

            for (const fileItem of filesToUpload) {
                const bitstream = await dspaceService.uploadFile(workspaceItemId, fileItem.fileObject);
                if (bitstream && bitstream.uuid) {
                    await dspaceService.updateBitstreamMetadata(bitstream.uuid, fileItem.metadata);
                } else {
                    console.error(`Failed to upload file: ${fileItem.name}`);
                }
            }

            // 4. Submit to workflow
            await dspaceService.submitWorkspaceItem(workspaceItem);

            alert("Upload successful! Item submitted to workflow.");

            // Reset form
            setFiles([]);
            setPrimaryFileId(null);
            setSelectedFileId(null);
            setTitle("");
            setDescription("");
            setFileNumber("");
            setCaseType("");
            setPlaintiffs([""]);
            setDefendants([""]);
            setCaseRepresentatives([""]);
            setRegistrationDate("");
            setCaseLevel("");
            setCaseStatus("");
            setPrimaryJudge("");
            setJudgeNumber("");
            setLocation("");
            setBenchSession("");
            setRecordFormat("");
            setShelfNumber("");
            setRowNumber("");
            setRfid("");
        } catch (e) {
            console.error("Critical upload error:", e);
            alert(`Upload failed: ${e.message}`);
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (type) => {
        if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
        if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setPdfError(null);
    };
    const onDocumentLoadError = (error) => setPdfError("Failed to load PDF.");
    const changePage = (offset) =>
        setPageNumber((prev) => Math.min(Math.max(prev + offset, 1), numPages));
    const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-300 p-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold text-gray-800 ml-4">Upload File</h1>
                    <div className="flex items-center space-x-3 mr-4">
                        <label className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                            <Upload className="w-3 h-3 mr-1" />
                            Upload Files
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>

                        <div className="relative">
                            <button
                                onClick={() => setShowFileDropdown(!showFileDropdown)}
                                className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm"
                            >
                                <Eye className="w-3 h-3 mr-1.5 text-gray-600" />
                                <span className="text-gray-700">
                                    {selectedFile ? selectedFile.name : "Select File"}
                                </span>
                                <ChevronDown
                                    className={`w-3 h-3 ml-1.5 text-gray-500 transition-transform ${showFileDropdown ? "rotate-180" : ""}`}
                                />
                            </button>
                            {showFileDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                    <div className="p-2">
                                        {files.length > 0 ? (
                                            files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className={`w-full flex items-center px-2.5 py-2 hover:bg-blue-50 ${selectedFileId === file.id ? "bg-blue-50" : ""}`}
                                                >
                                                    <button
                                                        onClick={() => handleFileSelect(file.id)}
                                                        className="flex-grow flex items-center text-left"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            {selectedFileId === file.id ? (
                                                                <Check className="w-3.5 h-3.5 text-blue-600" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 border border-gray-400 rounded"></div>
                                                            )}
                                                        </div>
                                                        <div className="ml-2 flex-shrink-0">
                                                            {getFileIcon(file.type)}
                                                        </div>
                                                        <div className="ml-2 flex-1 min-w-0">
                                                            <div className="font-medium text-gray-900 truncate text-sm">
                                                                {file.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {formatFileSize(file.size)} • {file.type}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <div className="ml-2 flex items-center" title="Set as Primary File">
                                                        <input
                                                            type="radio"
                                                            name="primaryFile"
                                                            checked={primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)}
                                                            onChange={() => setPrimaryFileId(file.id)}
                                                            className="cursor-pointer"
                                                        />
                                                        <span className="text-xs text-gray-500 ml-1">Primary</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-gray-600 text-sm">
                                                No files uploaded.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleFinalUpload}
                            disabled={uploading || files.length === 0}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400"
                        >
                            {uploading ? "Uploading..." : "Submit"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Metadata Form */}
                <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-300 bg-white">
                    <div className="max-w-2xl mx-auto">
                        {selectedFile ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleFinalUpload();
                                }}
                                className="space-y-6"
                            >
                                <div>
                                    <label
                                        htmlFor="collection"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Select Collection *
                                    </label>
                                    <select
                                        id="collection"
                                        value={collectionId}
                                        onChange={(e) => setCollectionId(e.target.value)}
                                        required
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="" disabled>
                                            Select a collection
                                        </option>
                                        {collections.map((c) => (
                                            <option key={c.uuid} value={c.uuid}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                                    <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Enter title (optional, defaults to case number)" />
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-800 mb-4">Traditional Page One (Case Details)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="fileNumber" className="block text-sm font-medium text-gray-700">የመዝገብ ቁጥር (Case Number) *</label>
                                            <input id="fileNumber" type="text" value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                            <p className="text-xs text-gray-500 mt-1">Primary identification is mandatory. [cite: 25]</p>
                                        </div>
                                        <div>
                                            <label htmlFor="caseType" className="block text-sm font-medium text-gray-700">የጉዳዩ አይነት (Case Type)</label>
                                            <select id="caseType" value={caseType} onChange={(e) => setCaseType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                                <option value="">Select Type</option>
                                                {VALUE_PAIRS.case_types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-4">
                                        <RepeatableField
                                            label="ከሳሽ/አመልካች (Plaintiff/Applicant)"
                                            values={plaintiffs}
                                            setValues={setPlaintiffs}
                                            placeholder="Enter plaintiff name"
                                        />
                                        <p className="text-xs text-gray-500">The party initiating the legal action. (ከሳሽ ወይም አመልካች) [cite: 57, 73]</p>
                                        
                                        <RepeatableField
                                            label="ተከሳሽ/መልስ ሰጪ (Defendant/Respondent)"
                                            values={defendants}
                                            setValues={setDefendants}
                                            placeholder="Enter defendant name"
                                        />
                                        <p className="text-xs text-gray-500">The party against whom the action is brought. (ተከሳሽ ወይም መልስ ሰጪ) [cite: 57, 74]</p>

                                        <RepeatableField
                                            label="የሕግ ወኪል/ጠበቃ (Legal Representative)"
                                            values={caseRepresentatives}
                                            setValues={setCaseRepresentatives}
                                            placeholder="Enter representative name"
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ምዝገባ ቀን (Registration Date)</label>
                                            <input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-800 mb-4">Traditional Page Two (Additional Details)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="caseLevel" className="block text-sm font-medium text-gray-700">የመዝገቡ ደረጃ (Case Level)</label>
                                            <select id="caseLevel" value={caseLevel} onChange={(e) => setCaseLevel(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                                <option value="">Select Level</option>
                                                {VALUE_PAIRS.case_levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Current process stage: Registrar, Screening, etc. [cite: 18]</p>
                                        </div>
                                        <div>
                                            <label htmlFor="caseStatus" className="block text-sm font-medium text-gray-700">የመዝገቡ ሁኔታ (Case Status)</label>
                                            <select id="caseStatus" value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                                <option value="">Select Status</option>
                                                {VALUE_PAIRS.case_status_types.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="primaryJudge" className="block text-sm font-medium text-gray-700">ሰብሳቢ ዳኛ (Primary Judge)</label>
                                            <input id="primaryJudge" type="text" value={primaryJudge} onChange={(e) => setPrimaryJudge(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="judgeNumber" className="block text-sm font-medium text-gray-700">የዳኛ ብዛት (Total number of judges)</label>
                                            <input id="judgeNumber" type="number" value={judgeNumber} onChange={(e) => setJudgeNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">የፍርድ ቤቱ ቦታ/ምድብ (Location/Division)</label>
                                            <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="benchSession" className="block text-sm font-medium text-gray-700">ችሎት (Bench)</label>
                                            <input id="benchSession" type="text" value={benchSession} onChange={(e) => setBenchSession(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Enter the description of the Case"></textarea>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-800 mb-4">Physical Storage & Format</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label htmlFor="recordFormat" className="block text-sm font-medium text-gray-700">የፋይል አደረጃጀት (Record Format)</label>
                                            <select id="recordFormat" value={recordFormat} onChange={(e) => setRecordFormat(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                                <option value="">Select Format</option>
                                                {VALUE_PAIRS.record_formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Choose Physical, E-File, or Hybrid. [cite: 51]</p>
                                        </div>
                                        {recordFormat !== "Electronic" && (
                                            <>
                                                <div>
                                                    <label htmlFor="shelfNumber" className="block text-sm font-medium text-gray-700">መደርደሪያ ቁጥር (Shelf No.)</label>
                                                    <input id="shelfNumber" type="text" value={shelfNumber} onChange={(e) => setShelfNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                                    <p className="text-xs text-gray-500 mt-1">Required for physical files. [cite: 52]</p>
                                                </div>
                                                <div>
                                                    <label htmlFor="rowNumber" className="block text-sm font-medium text-gray-700">ረድፍ ቁጥር (Row No.)</label>
                                                    <input id="rowNumber" type="text" value={rowNumber} onChange={(e) => setRowNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <label htmlFor="rfid" className="block text-sm font-medium text-gray-700">RFID Tag</label>
                                            <input id="rfid" type="text" value={rfid} onChange={(e) => setRfid(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* File List Section */}
                                <div className="border-t border-gray-200 pt-6">
                                    <label className="block text-sm font-bold text-gray-800 mb-4 uppercase tracking-tighter">File Metadata (Bitstream)</label>
                                    {files.length > 0 ? (
                                        <div className="space-y-6">
                                            {files.map((file) => (
                                                <div key={file.id} className={`p-4 rounded-lg border-2 transition-all ${selectedFileId === file.id ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white shadow-sm"}`}>
                                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                                        <div className="flex items-center overflow-hidden">
                                                            <div className="mr-3 p-2 bg-gray-100 rounded-md text-gray-600">{getFileIcon(file.type)}</div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                                                <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            <label className="inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="primaryFile"
                                                                    checked={primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)}
                                                                    onChange={() => setPrimaryFileId(file.id)}
                                                                    className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                                />
                                                                <span className="ml-2 text-xs text-gray-600 font-bold uppercase tracking-tight">Set as Primary</span>
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (window.confirm("Are you sure you want to remove this file?")) {
                                                                        const newFiles = files.filter(f => f.id !== file.id);
                                                                        setFiles(newFiles);
                                                                        if (selectedFileId === file.id) setSelectedFileId(null);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Title</label>
                                                            <input
                                                                type="text"
                                                                value={file.metadata.title}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.title = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                                                                placeholder="File Name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">የሰነድ ክፍል (Section)</label>
                                                            <select
                                                                value={file.metadata.section}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.section = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                                                            >
                                                                <option value="">Select Section</option>
                                                                {VALUE_PAIRS.document_sections.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">የሰነዱ ዓይነት (Type)</label>
                                                            <select
                                                                value={file.metadata.type}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.type = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                                                            >
                                                                <option value="">Select Type</option>
                                                                {VALUE_PAIRS.document_types.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">የማስረጃ ኮድ (Exhibit Code)</label>
                                                            <input
                                                                type="text"
                                                                value={file.metadata.exhibitCode}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.exhibitCode = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                                                                placeholder="e.g. ከ-1 or ተ-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">ሁኔታ (Status)</label>
                                                            <select
                                                                value={file.metadata.status}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.status = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                                                            >
                                                                {VALUE_PAIRS.active_status_types.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Description</label>
                                                            <textarea
                                                                value={file.metadata.description}
                                                                onChange={(e) => {
                                                                    const newFiles = [...files];
                                                                    const idx = newFiles.findIndex(f => f.id === file.id);
                                                                    newFiles[idx].metadata.description = e.target.value;
                                                                    setFiles(newFiles);
                                                                }}
                                                                rows="2"
                                                                className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none min-h-[60px]"
                                                                placeholder="Enter description for this file"
                                                            ></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No files selected.</p>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-gray-500 pt-16">
                                <FileText size={48} className="mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">No file selected</h3>
                                <p>Please upload a file and select it to edit metadata.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - File Preview */}
                <div className="w-1/2 overflow-hidden bg-gray-100">
                    <div className="h-full flex flex-col">
                        {selectedFile ? (
                            <>
                                {selectedFile.type === "application/pdf" && numPages && (
                                    <div className="bg-gray-200 p-2 flex items-center justify-center space-x-4 border-b border-gray-300">
                                        <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
                                        <span>Page {pageNumber} of {numPages}</span>
                                        <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50"><RightIcon size={18} /></button>
                                        <button onClick={zoomOut} className="px-2 py-1 bg-gray-300 rounded"><ZoomOut size={18} /></button>
                                        <span>{Math.round(scale * 100)}%</span>
                                        <button onClick={zoomIn} className="px-2 py-1 bg-gray-300 rounded"><ZoomIn size={18} /></button>
                                    </div>
                                )}
                                <div className="flex-1 overflow-auto p-4">
                                    {selectedFile.type === "application/pdf" ? (
                                        <Document file={selectedFile.fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} error={pdfError && <div>{pdfError}</div>} loading="Loading PDF...">
                                            <Page pageNumber={pageNumber} scale={scale} />
                                        </Document>
                                    ) : selectedFile.type.startsWith("image/") ? (
                                        <img src={selectedFile.fileUrl} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-500 pt-16">Unsupported file type for preview.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Eye size={48} className="mb-4" />
                                <h3 className="text-lg font-semibold">Preview</h3>
                                <p>Select a file to preview.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetadataEditor;
