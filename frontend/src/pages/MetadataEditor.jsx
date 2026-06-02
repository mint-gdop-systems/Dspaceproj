import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
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
  Merge,
  Scissors,
  Pencil,
  RotateCw,
  X,
} from "lucide-react";
import dspaceService from "../services/dspaceService";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const VALUE_PAIRS = {
  case_types: [
    { label: "የፍትሐብሔር መዝገብ (Civil)", value: "Civil" },
    { label: "የወንጀል መዝገብ (Criminal)", value: "Criminal" },
    { label: "የሰበር መዝገብ (Cassation)", value: "Cassation" },
  ],
  // case_levels: [
  //   { label: "Registrar (ሬጅስትራር)", value: "Registrar" },
  //   { label: "Screening (ቅድመ ምርመራ)", value: "Screening" },
  //   { label: "Litigation (የችሎት ክርክር)", value: "Litigation" },
  //   { label: "Archive (መዝገብ ቤት)", value: "Archive" },
  // ],
  case_status_types: [
    { label: "Active (በሂደት ላይ)", value: "Active" },
    // { label: "Adjourned (የተቀጠረ)", value: "Adjourned" },
    { label: "Closed (የተዘጋ)", value: "Closed" },
  ],
  record_formats: [
    { label: "የኤሌክትሮኒክ ፋይል (E-File Only)", value: "Electronic" },
    { label: "የወረቀት ፋይል (Physical File Only)", value: "Physical" },
    { label: "ድብልቅ (Hybrid/Both)", value: "Hybrid" },
  ],
  document_sections: [
    { label: "1. Pleadings (የአቤቱታ/የክስ ክፍል)", value: "Pleadings" },
    {
      label: "2. Orders & Minutes (የቃለ-ጉባኤ እና የትዕዛዝ ክፍል)",
      value: "Orders_Minutes",
    },
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
    { label: "Active", value: "Active" },
    { label: "Inactive", value: "Inactive" },
  ],
  court_locations: [
    { label: "6 ኪሎ", value: "6 ኪሎ" },
    { label: "4 ኪሎ", value: "4 ኪሎ" },
    { label: "ፍርድ አፈፃፀም ያሬድ ት/ት ቤት ፊት ለፊት", value: "ፍርድ አፈፃፀም" },
  ],
  court_adjured_locations: [
    { label: "ልደታ - ፍትሐብሔር ምድብ (Lideta - Civil Division)", value: "ልደታ - ፍትሐብሔር ምድብ" },
    { label: "ልደታ - ወንጀል ምድብ (Lideta - Criminal Division)", value: "ልደታ - ወንጀል ምድብ" },
    { label: "አራዳ ምድብ ችሎት (Arada Division)", value: "አራዳ ምድብ ችሎት" },
    { label: "የካ ምድብ ችሎት (Yeka Division)", value: "የካ ምድብ ችሎት" },
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
  // const [language, setLanguage] = useState("en_US");
  const [description, setDescription] = useState("");

  // Traditional Page One
  const [fileNumber, setFileNumber] = useState("");
  const [caseType, setCaseType] = useState("");
  const [plaintiffs, setPlaintiffs] = useState([""]);
  const [defendants, setDefendants] = useState([""]);
  const [caseRepresentatives, setCaseRepresentatives] = useState([""]);
  const [registrationDate, setRegistrationDate] = useState("");

  // Traditional Page Two
  // const [caseLevel, setCaseLevel] = useState("");
  const [caseStatus, setCaseStatus] = useState("");
  // const [primaryJudge, setPrimaryJudge] = useState("");
  // const [judgeNumber, setJudgeNumber] = useState("");
  const [location, setLocation] = useState("");
  const [benchSession, setBenchSession] = useState("");
  const [recordFormat, setRecordFormat] = useState("");
  const [shelfNumber, setShelfNumber] = useState("");
  const [rowNumber, setRowNumber] = useState("");
  const [colNumber, setColNumber] = useState("");
  const [rfid, setRfid] = useState("");

  // PDF viewer states
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  // Merge Modal states
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [filesToMerge, setFilesToMerge] = useState([]);
  const [mergeFileName, setMergeFileName] = useState("");

  // Split Modal states
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitPages, setSplitPages] = useState("");
  const [splitNames, setSplitNames] = useState([]);

  // Rename Modal states
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameNewName, setRenameNewName] = useState("");

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
      },
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

    if (!fileNumber || !collectionId) {
      alert("Please fill mandatory fields: Case Number and Collection.");
      return;
    }

    // Judge Number validation (1-9)
    // if (
    //   judgeNumber &&
    //   (isNaN(judgeNumber) ||
    //     parseInt(judgeNumber) < 1 ||
    //     parseInt(judgeNumber) > 9)
    // ) {
    //   alert("Judge Number must be a number between 1 and 9.");
    //   setUploading(false);
    //   return;
    // }

    setUploading(true);

    // Check if user is authenticated with DSpace
    if (!dspaceService.isAuthenticated && !dspaceService.authToken) {
      alert("Please sign in before uploading.");
      setUploading(false);
      return;
    }

    try {
      // 1. Create workspace item
      const workspaceItem =
        await dspaceService.createWorkspaceItem(collectionId);
      const workspaceItemId = workspaceItem.id;

      // 2. Update metadata
      const metadata = {
        title: title || fileNumber, // Fallback if no specific title
        description: description,
        // language: language,
        // Traditional Page 1
        fileNumber,
        caseType,
        plaintiff: plaintiffs.filter((p) => p.trim()),
        defendant: defendants.filter((d) => d.trim()),
        caseRepresentative: caseRepresentatives.filter((r) => r.trim()),
        registrationDate,
        // Traditional Page 2
        // caseLevel,
        caseStatus,
        // primaryJudge,
        // judgeNumber,
        location,
        benchSession,
        recordFormat,
        shelfNumber,
        rowNumber,
        colNumber,
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
        const bitstream = await dspaceService.uploadFile(
          workspaceItemId,
          fileItem.fileObject,
        );
        if (bitstream && bitstream.uuid) {
          await dspaceService.updateBitstreamMetadata(
            bitstream.uuid,
            fileItem.metadata,
          );
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
      // setCaseLevel("");
      setCaseStatus("");
      // setPrimaryJudge("");
      // setJudgeNumber("");
      setLocation("");
      setBenchSession("");
      setRecordFormat("");
      setShelfNumber("");
      setRowNumber("");
      setColNumber("");
      setRfid("");
    } catch (e) {
      console.error("Critical upload error:", e);
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
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

  // --- PDF Tool Helper ---
  const updateFileInList = (fileId, newFileObj, newName) => {
    const newUrl = URL.createObjectURL(newFileObj);
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          return {
            ...f,
            fileObject: newFileObj,
            fileUrl: newUrl,
            size: newFileObj.size,
            name: newName || f.name,
            lastModified: new Date(),
          };
        }
        return f;
      }),
    );
    if (selectedFileId === fileId) {
      setPageNumber(1);
    }
  };

  const getSameOriginMediaUrl = (url) => {
    if (!url) return url;
    try {
      const parsedUrl = new URL(url, window.location.origin);
      if (parsedUrl.pathname.startsWith("/media/")) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
      return parsedUrl.href;
    } catch {
      return url;
    }
  };

  // --- Rotate ---
  const handleRotate = async (angle) => {
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile.fileObject);
      formData.append("page", pageNumber);
      formData.append("angle", angle);
      const response = await fetch("/api/resources/pdf/rotate/", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const blob = await response.blob();
        const newFile = new File([blob], selectedFile.name, {
          type: "application/pdf",
        });
        updateFileInList(selectedFile.id, newFile);
      } else {
        alert("Rotate failed");
      }
    } catch (error) {
      console.error(error);
      alert("Rotate error");
    }
  };

  // --- Split ---
  const handleSplit = () => {
    if (!selectedFile) return;
    setSplitPages(String(pageNumber));
    const baseName = selectedFile.name.replace(".pdf", "");
    setSplitNames([`${baseName}_part1`, `${baseName}_part2`]);
    setIsSplitModalOpen(true);
  };

  useEffect(() => {
    if (!isSplitModalOpen) return;
    const points = splitPages.split(",").filter((p) => p.trim() !== "").length;
    const numParts = points + 1;
    setSplitNames((prev) => {
      const newNames = [...prev];
      if (newNames.length < numParts) {
        for (let i = newNames.length; i < numParts; i++) {
          const baseName = selectedFile
            ? selectedFile.name.replace(".pdf", "")
            : "file";
          newNames.push(`${baseName}_part${i + 1}`);
        }
      } else if (newNames.length > numParts && numParts > 0) {
        return newNames.slice(0, numParts);
      }
      return newNames;
    });
  }, [splitPages, isSplitModalOpen, selectedFile]);

  const handleSplitNameChange = (index, value) => {
    const newNames = [...splitNames];
    newNames[index] = value;
    setSplitNames(newNames);
  };

  const handleSplitSubmit = async () => {
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile.fileObject);
      formData.append("pages", splitPages);
      formData.append("names", JSON.stringify(splitNames));
      const response = await fetch("/api/resources/pdf/split/", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        const newFiles = [];
        for (const fileData of data.files) {
          try {
            const res = await fetch(getSameOriginMediaUrl(fileData.url));
            if (!res.ok) {
              console.error(`Failed to fetch split file: ${res.status}`);
              continue;
            }
            const blob = await res.blob();

            // Validate that blob is not empty
            if (blob.size === 0) {
              console.error("Received empty blob for split file");
              continue;
            }

            // Validate blob is actually PDF data
            const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            const header = String.fromCharCode.apply(null, uint8);
            if (header !== "%PDF") {
              console.error(
                "Invalid PDF header. Received:",
                header,
                "Blob type:",
                blob.type,
                "Size:",
                blob.size,
              );
              console.error(
                "First 100 bytes:",
                await blob
                  .slice(0, 100)
                  .text()
                  .catch(() => "Could not read"),
              );
              continue;
            }

            const newFileItem = {
              id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: fileData.name,
              type: "application/pdf",
              size: blob.size,
              lastModified: new Date(),
              fileObject: new File([blob], fileData.name, {
                type: "application/pdf",
              }),
              fileUrl: URL.createObjectURL(blob),
              label: "",
              metadata: {
                title: fileData.name,
                section: "",
                type: "",
                exhibitCode: "",
                status: "Active",
                description: "",
              },
            };
            newFiles.push(newFileItem);
          } catch (e) {
            console.error("Failed to load split file", e);
          }
        }

        if (newFiles.length === 0) {
          alert("Failed to load split files. The PDFs may be corrupted.");
          return;
        }

        setFiles((prev) => [...prev, ...newFiles]);
        setIsSplitModalOpen(false);
        alert(`Split successful! ${newFiles.length} file(s) added to list.`);
      } else {
        const err = await response.json();
        alert(`Split failed: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Split error: " + (error.message || "Unknown error"));
    }
  };

  // --- Rename ---
  const handleRename = () => {
    if (!selectedFile) return;
    setRenameNewName(selectedFile.name.replace(".pdf", ""));
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedFile || !renameNewName) return;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile.fileObject);
      formData.append("title", renameNewName);
      const response = await fetch("/api/resources/pdf/rename/", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        let finalName = renameNewName;
        if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";
        const blob = await response.blob();
        const newFile = new File([blob], finalName, {
          type: "application/pdf",
        });
        updateFileInList(selectedFile.id, newFile, finalName);
        setIsRenameModalOpen(false);
      } else {
        alert("Rename failed");
      }
    } catch (error) {
      console.error(error);
      alert("Rename error");
    }
  };

  // --- Merge ---
  useEffect(() => {
    if (isMergeModalOpen && selectedFile) {
      setFilesToMerge([selectedFile.id]);
      setMergeFileName(`merged_${selectedFile.name.replace(".pdf", "")}.pdf`);
    }
  }, [isMergeModalOpen, selectedFile]);

  const handleMergeClick = () => {
    if (!selectedFile) return;
    setIsMergeModalOpen(true);
  };

  const toggleFileForMerge = (fileId) => {
    setFilesToMerge((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      }
      return [...prev, fileId];
    });
  };

  const handleMergeSubmit = async () => {
    if (filesToMerge.length < 2) {
      alert("Please select at least 2 files to merge.");
      return;
    }
    try {
      const formData = new FormData();
      const orderedFilesToMerge = filesToMerge
        .map((id) => files.find((f) => f.id === id))
        .filter(Boolean);
      orderedFilesToMerge.forEach((file) => {
        formData.append("files", file.fileObject);
      });
      const response = await fetch("/api/resources/pdf/merge/", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const blob = await response.blob();
        let finalName = mergeFileName || "merged.pdf";
        if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";
        const newFile = new File([blob], finalName, {
          type: "application/pdf",
        });
        const newFileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: finalName,
          type: "application/pdf",
          size: newFile.size,
          lastModified: new Date(),
          fileObject: newFile,
          fileUrl: URL.createObjectURL(newFile),
          label: "",
          metadata: {
            title: finalName,
            section: "",
            type: "",
            exhibitCode: "",
            status: "Active",
            description: "",
          },
        };
        setFiles((prev) => [...prev, newFileItem]);
        setIsMergeModalOpen(false);
        alert("Merged file added to list");
        setTimeout(() => {
          handleFileSelect(newFileItem.id);
        }, 100);
      } else {
        alert("Merge failed");
      }
    } catch (error) {
      console.error(error);
      alert("Merge error");
    }
  };

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
                          <div
                            className="ml-2 flex items-center"
                            title="Set as Primary File"
                          >
                            <input
                              type="radio"
                              name="primaryFile"
                              checked={
                                primaryFileId === file.id ||
                                (!primaryFileId && files[0].id === file.id)
                              }
                              onChange={() => setPrimaryFileId(file.id)}
                              className="cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 ml-1">
                              Primary
                            </span>
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
                    የመዝገብ አይነት ይምረጡ
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="collection"
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="" disabled>
                      የመዝገብ አይነት ይምረጡ
                    </option>
                    {collections.map((c) => (
                      <option key={c.uuid} value={c.uuid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">
                    የመዝገብ መረጃ (Case Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="fileNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የመዝገብ ቁጥር (Case Number)
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        id="fileNumber"
                        type="text"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                        required
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Primary identification is mandatory. [cite: 25]
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="caseType"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የጉዳዩ አይነት (Case Type)
                      </label>
                      <select
                        id="caseType"
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Type</option>
                        {VALUE_PAIRS.case_types.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <RepeatableField
                          label="ከሳሽ/አመልካች (Plaintiff/Applicant)"
                          values={plaintiffs}
                          setValues={setPlaintiffs}
                          placeholder="Enter plaintiff name"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The party initiating the legal action. (ከሳሽ ወይም አመልካች)
                          [cite: 57, 73]
                        </p>
                      </div>
                      <div>
                        <RepeatableField
                          label="ተከሳሽ/መልስ ሰጪ (Defendant/Respondent)"
                          values={defendants}
                          setValues={setDefendants}
                          placeholder="Enter defendant name"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The party against whom the action is brought. (ተከሳሽ ወይም
                          መልስ ሰጪ) [cite: 57, 74]
                        </p>
                      </div>
                    </div>

                    <RepeatableField
                      label="የሕግ ወኪል/ጠበቃ (Legal Representative)"
                      values={caseRepresentatives}
                      setValues={setCaseRepresentatives}
                      placeholder="Enter representative name"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        መዝገቡ የተከፈተበት ቀን
                      </label>
                      <input
                        type="date"
                        value={registrationDate}
                        onChange={(e) => setRegistrationDate(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">
                    ተጨማሪ ዝርዝር መረጃ (Additional Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* <div>
                      <label
                        htmlFor="caseLevel"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የመዝገቡ ደረጃ (Case Level)
                      </label>
                      <select
                        id="caseLevel"
                        value={caseLevel}
                        onChange={(e) => setCaseLevel(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Level</option>
                        {VALUE_PAIRS.case_levels.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Current process stage: Registrar, Screening, etc. [cite:
                        18]
                      </p>
                    </div> */}
                    <div>
                      <label
                        htmlFor="caseStatus"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የመዝገቡ ሁኔታ (Case Status)
                      </label>
                      <select
                        id="caseStatus"
                        value={caseStatus}
                        onChange={(e) => setCaseStatus(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Status</option>
                        {VALUE_PAIRS.case_status_types.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* <div>
                      <label
                        htmlFor="primaryJudge"
                        className="block text-sm font-medium text-gray-700"
                      >
                        ሰብሳቢ ዳኛ (Primary Judge)
                      </label>
                      <input
                        id="primaryJudge"
                        type="text"
                        value={primaryJudge}
                        onChange={(e) => setPrimaryJudge(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div> */}
                    {/* <div>
                      <label
                        htmlFor="judgeNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የዳኛ ብዛት (Total number of judges)
                      </label>
                      <input
                        id="judgeNumber"
                        type="number"
                        value={judgeNumber}
                        onChange={(e) => setJudgeNumber(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div> */}
                    <div>
                      <label
                        htmlFor="location"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የፍርድ ቤቱ ቦታ/ምድብ (Location/Division)
                      </label>
                      <select
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Location</option>
                        {VALUE_PAIRS.court_locations.map((loc) => (
                          <option key={loc.value} value={loc.value}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="benchSession"
                        className="block text-sm font-medium text-gray-700"
                      >
                        ችሎት (Bench)
                      </label>
                      <select
                        id="benchSession"
                        value={benchSession}
                        onChange={(e) => setBenchSession(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="">Select Bench</option>
                        {VALUE_PAIRS.court_adjured_locations.map((loc) => (
                          <option key={loc.value} value={loc.value}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      የሰነዱ ዝርዝር መግለጫ (Description)
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="3"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      placeholder="ስለ ሰነዱ አጭር መግለጫ እዚህ ያስገቡ..."
                    ></textarea>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">
                    የማህደር አደረጃጀት (Physical Storage)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* <div className="col-span-2">
                      <label
                        htmlFor="recordFormat"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የፋይል አደረጃጀት (Record Format)
                      </label>
                      <select
                        id="recordFormat"
                        value={recordFormat}
                        onChange={(e) => setRecordFormat(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Format</option>
                        {VALUE_PAIRS.record_formats.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose Physical, E-File, or Hybrid. [cite: 51]
                      </p>
                    </div> */}
                    {/* {recordFormat !== "Electronic" && (
                      <> */}
                        <div>
                          <label
                            htmlFor="shelfNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            መደርደሪያ ቁጥር (Shelf No.)
                          </label>
                          <input
                            id="shelfNumber"
                            type="text"
                            value={shelfNumber}
                            onChange={(e) => setShelfNumber(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Required for physical files. [cite: 52]
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor="rowNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            ረድፍ ቁጥር (Row No.)
                          </label>
                          <input
                            id="rowNumber"
                            type="text"
                            value={rowNumber}
                            onChange={(e) => setRowNumber(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="colNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            አምድ ቁጥር (Column No.)
                          </label>
                          <input
                            id="colNumber"
                            type="text"
                            value={colNumber}
                            onChange={(e) => setColNumber(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      {/* </>) */}
                    {/* } */}
                    <div>
                      <label
                        htmlFor="rfid"
                        className="block text-sm font-medium text-gray-700"
                      >
                        RFID Tag
                      </label>
                      <input
                        id="rfid"
                        type="text"
                        value={rfid}
                        onChange={(e) => setRfid(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* File List Section */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-bold text-gray-800 mb-4 uppercase tracking-tighter">
                    መዝገብ ፋይሎች
                  </label>
                  {files.length > 0 ? (
                    <div className="space-y-6">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className={`p-4 rounded-lg border-2 transition-all ${selectedFileId === file.id ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white shadow-sm"}`}
                        >
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                            <div className="flex items-center overflow-hidden">
                              <div className="mr-3 p-2 bg-gray-100 rounded-md text-gray-600">
                                {getFileIcon(file.type)}
                              </div>
                              <div className="flex flex-col">
                                <span
                                  className="text-sm font-bold truncate max-w-[200px]"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name="primaryFile"
                                  checked={
                                    primaryFileId === file.id ||
                                    (!primaryFileId && files[0].id === file.id)
                                  }
                                  onChange={() => setPrimaryFileId(file.id)}
                                  className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-xs text-gray-600 font-bold uppercase tracking-tight">
                                  Set as Primary
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to remove this file?",
                                    )
                                  ) {
                                    const newFiles = files.filter(
                                      (f) => f.id !== file.id,
                                    );
                                    setFiles(newFiles);
                                    if (selectedFileId === file.id)
                                      setSelectedFileId(null);
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
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                value={file.metadata.title}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.title = e.target.value;
                                  setFiles(newFiles);
                                }}
                                className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                                placeholder="File Name"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                የሰነድ ክፍል (Section)
                              </label>
                              <select
                                value={file.metadata.section}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.section =
                                    e.target.value;
                                  setFiles(newFiles);
                                }}
                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                              >
                                <option value="">Select Section</option>
                                {VALUE_PAIRS.document_sections.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                የሰነዱ ዓይነት (Type)
                              </label>
                              <select
                                value={file.metadata.type}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.type = e.target.value;
                                  setFiles(newFiles);
                                }}
                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                              >
                                <option value="">Select Type</option>
                                {VALUE_PAIRS.document_types.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                የማስረጃ ኮድ (Exhibit Code)
                              </label>
                              <input
                                type="text"
                                value={file.metadata.exhibitCode}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.exhibitCode =
                                    e.target.value;
                                  setFiles(newFiles);
                                }}
                                className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                                placeholder="e.g. ከ-1 or ተ-1"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                ሁኔታ (Status)
                              </label>
                              <select
                                value={file.metadata.status}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.status =
                                    e.target.value;
                                  setFiles(newFiles);
                                }}
                                className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9"
                              >
                                {VALUE_PAIRS.active_status_types.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                Description
                              </label>
                              <textarea
                                value={file.metadata.description}
                                onChange={(e) => {
                                  const newFiles = [...files];
                                  const idx = newFiles.findIndex(
                                    (f) => f.id === file.id,
                                  );
                                  newFiles[idx].metadata.description =
                                    e.target.value;
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
                    <p className="text-sm text-gray-500 italic">
                      No files selected.
                    </p>
                  )}
                </div>
              </form>
            ) : (
              <div className="text-center text-gray-500 pt-16">
                <FileText size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold">የተመረጠ ፋይል የለም</h3>
                <p>እባክዎ መጀመሪያ ፋይል ይጫኑ (Upload)፤ ከዚያም ሜታዳታውን ለማስተካከል ፋይሉን ይምረጡ።</p>
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
                    <button
                      type="button"
                      onClick={() => changePage(-1)}
                      disabled={pageNumber <= 1}
                      className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>
                      {/* Page {pageNumber} of {numPages} */}
                      ገጽ {pageNumber} ከ {numPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => changePage(1)}
                      disabled={pageNumber >= numPages}
                      className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"
                    >
                      <RightIcon size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={zoomOut}
                      className="px-2 py-1 bg-gray-300 rounded cursor-pointer"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <span>{Math.round(scale * 100)}%</span>
                    <button
                      type="button"
                      onClick={zoomIn}
                      className="px-2 py-1 bg-gray-300 rounded cursor-pointer"
                    >
                      <ZoomIn size={18} />
                    </button>

                    <div className="h-6 w-px bg-gray-400 mx-2"></div>

                    {/* Merge */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleMergeClick}
                        className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
                        title="Merge with another file"
                      >
                        <Merge size={18} />
                      </button>
                      {isMergeModalOpen && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-50">
                          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Merge Files
                            </h3>
                            <button
                              type="button"
                              onClick={() => setIsMergeModalOpen(false)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="p-3">
                            <div className="space-y-3">
                              <div>
                                <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                                  {files
                                    .filter((f) => f.type === "application/pdf")
                                    .map((file) => (
                                      <label
                                        key={file.id}
                                        className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 border-gray-100 transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={filesToMerge.includes(
                                            file.id,
                                          )}
                                          onChange={() =>
                                            toggleFileForMerge(file.id)
                                          }
                                          className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2.5 text-xs text-gray-700 truncate select-none">
                                          {file.name}
                                        </span>
                                      </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 text-right">
                                  {filesToMerge.length} files selected
                                </p>
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={mergeFileName}
                                  onChange={(e) =>
                                    setMergeFileName(e.target.value)
                                  }
                                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="merged_filename.pdf"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-2 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={handleMergeSubmit}
                              className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none disabled:opacity-50 transition-colors"
                              disabled={filesToMerge.length < 2}
                            >
                              Merge Files
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Split */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleSplit}
                        className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
                        title="Split at this page"
                      >
                        <Scissors size={18} />
                      </button>
                      {isSplitModalOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Split PDF
                            </h3>
                            <button
                              type="button"
                              onClick={() => setIsSplitModalOpen(false)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label
                                htmlFor="splitPages"
                                className="block text-xs font-medium text-gray-700 mb-1"
                              >
                                Split at Pages (comma separated)
                              </label>
                              <input
                                id="splitPages"
                                type="text"
                                value={splitPages}
                                onChange={(e) => setSplitPages(e.target.value)}
                                placeholder="e.g. 2, 5"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                              />
                              <p className="text-[10px] text-gray-500 mt-1">
                                Splits occur after the specified page numbers.
                                Example: "2, 5" creates 3 files (Pages 1-2, 3-5,
                                6-End).
                              </p>
                            </div>
                            <div className="border-t border-gray-100 pt-2">
                              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                                Output Filenames
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {splitNames.map((name, idx) => (
                                  <div key={idx}>
                                    <label
                                      htmlFor={`splitName-${idx}`}
                                      className="block text-[10px] text-gray-500 mb-0.5"
                                    >
                                      Part {idx + 1}
                                    </label>
                                    <input
                                      id={`splitName-${idx}`}
                                      type="text"
                                      value={name}
                                      onChange={(e) =>
                                        handleSplitNameChange(
                                          idx,
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                      placeholder={`Filename for part ${idx + 1}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={handleSplitSubmit}
                                disabled={
                                  splitNames.some((n) => !n.trim()) ||
                                  !splitPages
                                }
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Split Files
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rename */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleRename}
                        className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
                        title="Rename"
                      >
                        <Pencil size={18} />
                      </button>
                      {isRenameModalOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Rename File
                            </h3>
                            <button
                              type="button"
                              onClick={() => setIsRenameModalOpen(false)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="mb-3">
                            <label
                              htmlFor="renameNewName"
                              className="block text-xs font-medium text-gray-700 mb-1"
                            >
                              New Filename
                            </label>
                            <input
                              id="renameNewName"
                              type="text"
                              value={renameNewName}
                              onChange={(e) => setRenameNewName(e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                              placeholder="Enter new filename"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleRenameSubmit}
                              disabled={!renameNewName.trim()}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Rename
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rotate */}
                    <button
                      type="button"
                      onClick={() => handleRotate(90)}
                      className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
                      title="Rotate Page 90°"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>
                )}
                <div className="flex-1 w-full overflow-auto p-4 flex items-center justify-center">
                  {selectedFile.type === "application/pdf" ? (
                    <Document
                      key={selectedFile.id}
                      file={selectedFile.fileUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      error={pdfError && <div>{pdfError}</div>}
                      loading="Loading PDF..."
                    >
                      <Page pageNumber={pageNumber} scale={scale} />
                    </Document>
                  ) : selectedFile.type.startsWith("image/") ? (
                    <img
                      src={selectedFile.fileUrl}
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-500 pt-16">
                      Unsupported file type for preview.
                    </div>
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
