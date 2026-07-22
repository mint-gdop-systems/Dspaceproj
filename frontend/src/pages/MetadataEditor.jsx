import { MetadataToolbar } from '../features/metadata/components/MetadataToolbar';
import { MetadataForm } from '../features/metadata/components/MetadataForm';
import { MetadataFileViewer } from '../features/metadata/components/MetadataFileViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/UI/tabs";
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
import { EthiopianDatePicker } from "ethiopian-date-picker-and-converter";
import "ethiopian-date-picker-and-converter/dist/cjs/style.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { VALUE_PAIRS, formatEthioDateString } from "../features/metadata/lib/constants";

import { RepeatableField } from "../features/metadata/components/RepeatableField";

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
  const [fileNumberStatus, setFileNumberStatus] = useState("idle"); // idle | checking | valid | duplicate
  const [activeEntityType, setActiveEntityType] = useState("");
  const [plaintiffs, setPlaintiffs] = useState([""]);
  const [defendants, setDefendants] = useState([""]);
  const [caseRepresentatives, setCaseRepresentatives] = useState([""]);
  const [manualEthioDate, setManualEthioDate] = useState("");

  // DARIS Dynamic Fields
  const [extraFields, setExtraFields] = useState({
    branchLocation: "",
    region: "",
    registrationDate: "",
    registrationAmDate: "",
    giverType: "",
    receiverType: "",
    femaleCount: "",
    maleCount: "",
    caseType: "",
    
    // Vehicle
    vehicleLibre: "",
    vehiclePlate: "",
    vehicleChassis: "",
    vehicleMotor: "",
    
    // Property
    propertyCarta: "",
    propertyCartaDate: "",
    propertyHouseNumber: "",
    propertyArea: "",
    
    // Financial/Loan
    estimatedValue: "",
    saleValue: "",
    loanAmount: "",
    loanStartDate: "",
    loanEndDate: "",
    
    // Corporate/Revocations
    organizationName: "",
    organizationType: "",
    tin: "",
    phone: "",
    totalContribution: "",
    totalShares: "",
    capital: "",
    meetingAgenda: "",
    meetingPlace: "",
    meetingTime: "",
    meetingDecision: "",
    revokedNumber: "",
    
    // Spatial extensions
    city: "",
    subcity: "",
    woreda: "",
    kebele: "",
    
    // Officers
    dataEncoderName: "",
    investigatorName: "",
    stampOfficerName: "",
  });

  const updateExtraField = (field, value) => {
    setExtraFields(prev => ({ ...prev, [field]: value }));
  };



  const handleManualEthioDateChange = (e) => {
    const val = e.target.value;
    setManualEthioDate(val);

    // Parse DD/MM/YYYY
    const parts = val.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      updateExtraField("registrationAmDate", `${year}-${month}-${day}`);
    } else {
      updateExtraField("registrationAmDate", ""); // clear if invalid
    }
  };

  const handlePickerDateChange = (date) => {
    if (!date || typeof date !== "string" || date.includes("undefined")) return;

    // Ignore incomplete dates like just the year
    if (date.trim().length === 4 && !isNaN(date.trim())) {
      return;
    }

    const formatted = formatEthioDateString(date);
    if (formatted && formatted.includes("-")) {
      const parts = formatted.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        updateExtraField("registrationAmDate", formatted);
        setManualEthioDate(`${d}/${m}/${y}`);
      }
    }
  };

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
    const saved = localStorage.getItem("metadataEditorState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.collectionId) setCollectionId(parsed.collectionId);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.fileNumber) setFileNumber(parsed.fileNumber);
        if (parsed.plaintiffs) setPlaintiffs(parsed.plaintiffs);
        if (parsed.defendants) setDefendants(parsed.defendants);
        if (parsed.caseRepresentatives)
          setCaseRepresentatives(parsed.caseRepresentatives);
        if (parsed.manualEthioDate) setManualEthioDate(parsed.manualEthioDate);
        if (parsed.extraFields) setExtraFields(parsed.extraFields);
      } catch (e) {
        console.error("Failed to parse cached metadata", e);
      }
    }
  }, []);

  useEffect(() => {
    // Only search on the frontend if the user is authenticated
    if (!dspaceService.isAuthenticated && !dspaceService.getStoredToken()) {
      setFileNumberStatus("idle");
      return;
    }

    // Only check if we have a file number
    if (!fileNumber || fileNumber.trim() === "") {
      setFileNumberStatus("idle");
      return;
    }

    setFileNumberStatus("checking");

    let isCurrent = true;
    const timer = setTimeout(async () => {
      const currentFileNumber = fileNumber.trim();
      const exists = await dspaceService.checkFileNumberExists(currentFileNumber);
      if (!isCurrent) return;
      if (exists) {
        setFileNumberStatus("duplicate");
      } else {
        setFileNumberStatus("valid");
      }
    }, 500);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [fileNumber]);

  useEffect(() => {
    const stateToSave = {
      collectionId,
      title,
      description,
      fileNumber,
      activeEntityType,
      plaintiffs,
      defendants,
      caseRepresentatives,
      manualEthioDate,
      extraFields,
    };
    localStorage.setItem("metadataEditorState", JSON.stringify(stateToSave));
  }, [
    collectionId,
    title,
    description,
    fileNumber,
    activeEntityType,
    plaintiffs,
    defendants,
    caseRepresentatives,
    manualEthioDate,
    extraFields,
  ]);

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



  useEffect(() => {
    if (!collectionId) {
      setActiveEntityType(""); // Clear if no collection is selected
    } else {
      const selectedCollection = collections.find((c) => c.uuid === collectionId);
      if (selectedCollection) {
        // In DSpace 7+, entityType is typically available either in embedded entityType or in metadata
        let type = "";
        if (selectedCollection._embedded?.entityType) {
            type = selectedCollection._embedded.entityType.label || selectedCollection._embedded.entityType.id || "";
        } else if (selectedCollection.metadata && selectedCollection.metadata["dspace.entity.type"]) {
            type = selectedCollection.metadata["dspace.entity.type"][0].value;
        } else {
            // Fallback inference from name if REST API didn't embed it properly
            const name = selectedCollection.name || "";
            if (name.includes("Vehicle Sales")) type = "VehicleSale";
            else if (name.includes("Real Estate Sales")) type = "HouseSale";
            else if (name.includes("Vehicle Gifts")) type = "VehicleGift";
            else if (name.includes("Property Gifts")) type = "HouseGift";
            else if (name.includes("Unsecured Loans")) type = "LoanUnsecured";
            else if (name.includes("Secured Loans")) type = "LoanSecured";
            else if (name.includes("Power of Attorney")) type = "PowerOfAttorney";
            else if (name.includes("Wills")) type = "Will";
            else if (name.includes("Corporate")) type = "CorporateArticles";
        }
        setActiveEntityType(type);
      }
    }
  }, [collectionId, collections]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  // Check if any file is greater than 50 MB (50 * 1024 * 1024 bytes)
  // const hasLargeFile = files.some((file) => file.size > 50 * 1024 * 1024);

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files || []);

    const processedFiles = await Promise.all(
      uploadedFiles.map(async (file) => {
        // 1. Strip the extension from the file name for the Title input
        const titleWithoutExtension =
          file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

        // // 2. Auto-calculate PDF pages
        // let calculatedPageCount = 1;
        // if (file.type === "application/pdf") {
        //   try {
        //     const arrayBuffer = await file.arrayBuffer();
        //     // Use the imported `pdfjs` from react-pdf to read PDF metadata
        //     const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        //     calculatedPageCount = pdf.numPages;
        //     console.log(`Calculated page count for ${file.name}: ${calculatedPageCount}`);
        //     console.log(`packages page count for ${file.name}: ${pdf.numPages}`);
        //   } catch (error) {
        //     calculatedPageCount=
        //     console.error("Error calculating PDF pages:", error);
        //   }
        // }

        // 3. Return the fully constructed file object
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified),
          fileObject: file, // Keep this as fileObject so handleFinalUpload doesn't break
          fileUrl: URL.createObjectURL(file),
          label: "",
          metadata: {
            title: titleWithoutExtension,
            type: "",
            description: "",
            pageCount: null,
          },
        };
      }),
    );

    const updatedFiles = [...files, ...processedFiles];
    setFiles(updatedFiles);

    // Auto-select the first file if none is selected
    if (processedFiles.length > 0 && !selectedFileId) {
      handleFileSelect(processedFiles[0].id);
    }

    // Reset the input
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
    if (uploading || files.length !== 2) {
      alert("Exactly 2 files are required before submitting. Current count: " + files.length);
      return;
    }

    if (!collectionId) {
      alert("Please select a Collection (የመዝገብ አይነት) before submitting.");
      return;
    }

    if (!fileNumber) {
      alert("Please enter a Case Number (የመዝገብ ቁጥር) before submitting.");
      return;
    }

    if (!activeEntityType && fileNumber) {
      // It's okay if activeEntityType is empty for standard collections, but warn if missing
      console.warn("No active entity type determined for this collection.");
    }



    // const hasMissingDocType = files.some(file => !file.metadata.type);
    // if (hasMissingDocType) {
    //   alert("Please select a Document Type (የሰነዱ ዓይነት) for all files before submitting.");
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
      setFileNumberStatus("checking");
      const duplicateExists = await dspaceService.checkFileNumberExists(fileNumber);
      if (duplicateExists) {
        setFileNumberStatus("duplicate");
        alert("Upload blocked: this case file number already exists.");
        return;
      }
      setFileNumberStatus("valid");

      // 1. Create workspace item
      const workspaceItem =
        await dspaceService.createWorkspaceItem(collectionId);
      const workspaceItemId = workspaceItem.id;

      // 2. Update metadata
      const metadata = {
        title: title || fileNumber, // Fallback if no specific title
        description: description,
        documentNumber: fileNumber,
        contractDate: extraFields.registrationDate || extraFields.registrationAmDate,
        branchLocation: extraFields.branchLocation,
        region: extraFields.region,
        
        // DARIS Page 2
        giverName: plaintiffs.filter((p) => p.trim()),
        receiverName: defendants.filter((d) => d.trim()),
        officerName: caseRepresentatives.filter((r) => r.trim()),
        
        activeEntityType,
        ...extraFields,
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
          if (
            fileItem.id === primaryFileId ||
            (!primaryFileId && files[0].id === fileItem.id)
          ) {
            await dspaceService.setWorkspaceItemPrimaryBitstream(
              workspaceItemId,
              bitstream.uuid,
            );
          }
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

      // Clear the cache
      localStorage.removeItem("metadataEditorState");

      // Reset form
      setFiles([]);
      setPrimaryFileId(null);
      setSelectedFileId(null);
      setTitle("");
      setDescription("");
      setFileNumber("");
      setPlaintiffs([""]);
      setDefendants([""]);
      setCaseRepresentatives([""]);
      setManualEthioDate("");
      setExtraFields({
        branchLocation: "",
        region: "",
        registrationDate: "",
        registrationAmDate: "",
        giverType: "",
        receiverType: "",
        femaleCount: "",
        maleCount: "",
        caseType: "",
        vehicleLibre: "",
        vehiclePlate: "",
        vehicleChassis: "",
        vehicleMotor: "",
        propertyCarta: "",
        propertyCartaDate: "",
        propertyHouseNumber: "",
        propertyArea: "",
        estimatedValue: "",
        saleValue: "",
        loanAmount: "",
        loanStartDate: "",
        loanEndDate: "",
        organizationName: "",
        organizationType: "",
        tin: "",
        phone: "",
        totalContribution: "",
        totalShares: "",
        capital: "",
        meetingAgenda: "",
        meetingPlace: "",
        meetingTime: "",
        meetingDecision: "",
        revokedNumber: "",
        city: "",
        subcity: "",
        woreda: "",
        kebele: "",
        dataEncoderName: "",
        investigatorName: "",
        stampOfficerName: "",
      });
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
  const onDocumentLoadError = () => setPdfError("Failed to load PDF.");
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
                type: "",
                pageCount: "",
                // status: "Active",
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
            type: "",
            pageCount: "",
            // status: "Active",
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
  const [activeTab, setActiveTab] = useState("metadata");
  const isSectionDisabled = fileNumberStatus !== "valid" && fileNumber !== "";

  return (
      <div className='flex-1 overflow-hidden p-4 md:p-6 flex flex-col'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="flex justify-center mb-6">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 max-w-[400px] w-full">
              <TabsTrigger value="metadata" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-8 py-2.5 text-sm font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-[#265A91] data-[state=active]:shadow-sm w-full">
                የሰነዶች መረጃ
              </TabsTrigger>
              <TabsTrigger value="file" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-8 py-2.5 text-sm font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-[#265A91] data-[state=active]:shadow-sm w-full">
                ሰነድ ማያያዛ
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="metadata" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0 border-0 focus-visible:ring-0">
            <MetadataForm
              onNext={() => setActiveTab("file")}
              selectedFile={selectedFile} handleFinalUpload={handleFinalUpload}
              collections={collections} collectionId={collectionId} setCollectionId={setCollectionId}
              title={title} setTitle={setTitle} description={description} setDescription={setDescription}
              fileNumber={fileNumber} setFileNumber={setFileNumber} fileNumberStatus={fileNumberStatus}
              activeEntityType={activeEntityType}
              plaintiffs={plaintiffs} setPlaintiffs={setPlaintiffs}
              defendants={defendants} setDefendants={setDefendants}
              caseRepresentatives={caseRepresentatives} setCaseRepresentatives={setCaseRepresentatives}
              manualEthioDate={manualEthioDate} setManualEthioDate={setManualEthioDate}
              extraFields={extraFields} updateExtraField={updateExtraField}
              handleManualEthioDateChange={handleManualEthioDateChange} handlePickerDateChange={handlePickerDateChange}
              isSectionDisabled={isSectionDisabled}
              files={files} setFiles={setFiles}
              selectedFileId={selectedFileId} setSelectedFileId={setSelectedFileId}
              getFileIcon={getFileIcon} formatFileSize={formatFileSize}
              primaryFileId={primaryFileId} setPrimaryFileId={setPrimaryFileId}
            />
          </TabsContent>
          <TabsContent value="file" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0 border-0 focus-visible:ring-0">
            <MetadataToolbar
              files={files} selectedFileId={selectedFileId} selectedFile={selectedFile}
              showFileDropdown={showFileDropdown} setShowFileDropdown={setShowFileDropdown}
              handleFileUpload={handleFileUpload} handleFileSelect={handleFileSelect}
              handleFinalUpload={handleFinalUpload} uploading={uploading}
              fileNumberStatus={fileNumberStatus} getFileIcon={getFileIcon}
              formatFileSize={formatFileSize} primaryFileId={primaryFileId} setPrimaryFileId={setPrimaryFileId}
            />
            <div className="flex flex-1 h-full overflow-hidden mt-4 space-x-4">
              <div className="w-1/3 overflow-y-auto bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-4 uppercase tracking-tighter">
                  መዝገብ ፋይሎች
                </label>
                {files.length > 0 ? (
                  <div className="space-y-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${selectedFileId === file.id ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        onClick={() => setSelectedFileId(file.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center overflow-hidden">
                            <div className="mr-3 p-1.5 bg-gray-100 rounded-md text-gray-600">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold truncate max-w-[150px]" title={file.name}>{file.name}</span>
                              <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to remove this file?")) {
                                const newFiles = files.filter((f) => f.id !== file.id);
                                setFiles(newFiles);
                                if (selectedFileId === file.id) setSelectedFileId(null);
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="space-y-2 mt-3">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Title</label>
                             <input type="text" value={file.metadata.title} onChange={(e) => { const newFiles = [...files]; const idx = newFiles.findIndex((f) => f.id === file.id); newFiles[idx].metadata.title = e.target.value; setFiles(newFiles); }} className="w-full text-xs p-1.5 border border-gray-200 rounded outline-none" onClick={(e) => e.stopPropagation()} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">የሰነዱ ዓይነት</label>
                             <select value={file.metadata.type} onChange={(e) => { const newFiles = [...files]; const idx = newFiles.findIndex((f) => f.id === file.id); newFiles[idx].metadata.type = e.target.value; setFiles(newFiles); }} className="w-full text-xs p-1.5 border border-gray-200 rounded outline-none" onClick={(e) => e.stopPropagation()}>
                               <option value="">Select Type</option>
                               {(VALUE_PAIRS.document_types || []).map((opt) => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                               ))}
                             </select>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No files selected.</p>
                )}
              </div>
              <div className="w-2/3 h-full overflow-hidden">
                <MetadataFileViewer
                  selectedFile={selectedFile} numPages={numPages} pageNumber={pageNumber} scale={scale}
                  pdfError={pdfError} changePage={changePage} zoomIn={zoomIn} zoomOut={zoomOut}
                  files={files} setFilesToMerge={setFilesToMerge} setIsMergeModalOpen={setIsMergeModalOpen}
                  setIsSplitModalOpen={setIsSplitModalOpen} isSplitModalOpen={isSplitModalOpen} handleRotate={handleRotate}
                  setRenameNewName={setRenameNewName} setIsRenameModalOpen={setIsRenameModalOpen} isRenameModalOpen={isRenameModalOpen}
                  onDocumentLoadSuccess={onDocumentLoadSuccess} onDocumentLoadError={onDocumentLoadError}
                  isMergeModalOpen={isMergeModalOpen} filesToMerge={filesToMerge} toggleFileForMerge={toggleFileForMerge}
                  mergeFileName={mergeFileName} setMergeFileName={setMergeFileName} handleMergeClick={handleMergeClick} handleMergeSubmit={handleMergeSubmit}
                  handleSplit={handleSplit} splitPages={splitPages} setSplitPages={setSplitPages}
                  splitNames={splitNames} handleSplitNameChange={handleSplitNameChange} handleSplitSubmit={handleSplitSubmit}
                  handleRename={handleRename} renameNewName={renameNewName} handleRenameSubmit={handleRenameSubmit}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    // </div>
  );
};
export default MetadataEditor;
