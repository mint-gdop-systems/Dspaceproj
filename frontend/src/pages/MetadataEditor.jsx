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

const VALUE_PAIRS = {
  dars_branch_locations: [
    { label: "6 ኪሎ", value: "6 ኪሎ" },
    { label: "4 ኪሎ", value: "4 ኪሎ" },
  ],
  regions_list: [
    { label: "አዲስ አበባ", value: "አዲስ አበባ" },
    { label: "ድሬዳዋ", value: "ድሬዳዋ" },
    { label: "ኦሮሚያ", value: "ኦሮሚያ" },
    { label: "አማራ", value: "አማራ" },
    { label: "ሶማሌ", value: "ሶማሌ" },
    { label: "ትግራይ", value: "ትግራይ" },
    { label: "አፋር", value: "አፋር" },
    { label: "ሲዳማ", value: "ሲዳማ" },
    { label: "ቤኒሻንጉል-ጉሙዝ", value: "ቤኒሻንጉል-ጉሙዝ" },
    { label: "ጋምቤላ", value: "ጋምቤላ" },
    { label: "ሐረሪ", value: "ሐረሪ" },
    { label: "ደቡብ ምዕራብ ኢትዮጵያ ሕዝቦች", value: "ደቡብ ምዕራብ ኢትዮጵያ ሕዝቦች" },
    { label: "ደቡብ ኢትዮጵያ", value: "ደቡብ ኢትዮጵያ" },
    { label: "ማዕከላዊ ኢትዮጵያ", value: "ማዕከላዊ ኢትዮጵያ" },
  ],
  dars_customer_types: [
    { label: "ግለሰብ (Individual)", value: "individual" },
    { label: "ድርጅት (Organization)", value: "organization" },
  ],
  dars_service_types: [
    { label: "የሽያጭ ውሎች (Sales Contracts)", value: "sales" },
    { label: "የስጦታ ውሎች (Gift Contracts)", value: "gifts" },
    { label: "የብድር ውሎች (Loan Contracts)", value: "loans" },
    { label: "የውክልና ውሎች (Power of Attorney)", value: "poa" },
    { label: "የኑዛዜና የውጭ ጉዳይ ሰነዶች (Wills & Foreign Affairs)", value: "wills_foreign" },
    { label: "የድርጅትና ማህበራት ሰነዶች (Corporate & Assoc.)", value: "corporate" },
  ],
  case_types_sales: [
    { label: "የመኪና ሽያጭ (Vehicle Sale)", value: "vehicle_sale" },
    { label: "የቤት ሽያጭ (House Sale)", value: "house_sale" },
  ],
  case_types_gifts: [
    { label: "ተሽከርካሪ ስጦታ (Vehicle Gift)", value: "vehicle_gift" },
    { label: "የማይንቀሳቀስ ንብረት ስጦታ (Property Gift)", value: "property_gift" },
  ],
  case_types_loans: [
    { label: "ብድር ያለመያዣ (Unsecured Loan)", value: "unsecured_loan" },
    { label: "ብድር በመያዣ (Secured Loan)", value: "secured_loan" },
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

  const formatEthioDateString = (dateStr) => {
    if (!dateStr) return dateStr;
    const ethioMonths = {
      መስከረም: "01",
      ጥቅምት: "02",
      ኅዳር: "03",
      ታኅሣሥ: "04",
      ጥር: "05",
      የካቲት: "06",
      መጋቢት: "07",
      ሚያዝያ: "08",
      ግንቦት: "09",
      ሰኔ: "10",
      ሐምሌ: "11",
      ነሐሴ: "12",
      ጳጉሜን: "13",
      ጳጉሜ: "13",
    };
    const parts = dateStr.trim().split(" ");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const monthName = parts[1].trim();
      const year = parts[2];
      const month = ethioMonths[monthName];
      if (month && year && day) {
        return `${year}-${month}-${day}`;
      }
    }
    return dateStr;
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
  const hasLargeFile = files.some((file) => file.size > 50 * 1024 * 1024);

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
  const isSectionDisabled = fileNumberStatus !== "valid" && fileNumber !== "";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-300 p-3">
        <div className="flex flex-col">
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
                disabled={
                  uploading ||
                  files.length !== 2 ||
                  fileNumberStatus === "checking" ||
                  fileNumberStatus === "duplicate"
                  // hasLargeFile === true
                }
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400"
              >
                {uploading ? "Uploading..." : "Submit"}
              </button>
            </div>
          </div>
          {files.length !== 2 && (
            <div className="flex justify-end mr-4 mt-2">
              <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                Exactly 2 files are required before submitting. Current count: {files.length}
              </span>
            </div>
          )}
          {/* New check for file size limits */}
          {/* {hasLargeFile && (
            <div className="flex justify-end mr-4 mt-2">
              <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                One or more files exceed the 50 MB size limit. Please compress large files before submitting.
              </span>
            </div>
          )} */}
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
                    የመዝገብ መረጃ
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="fileNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        የሰነድ ቁጥር (Document Number)
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
                        Primary identification is mandatory.
                      </p>
                      {fileNumberStatus === "checking" && (
                        <p className="text-xs text-yellow-600 mt-1 flex items-center">
                          <span className="w-3 h-3 mr-1 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></span>{" "}
                          Checking...
                        </p>
                      )}
                      {fileNumberStatus === "valid" && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          ✓ Valid - no duplications
                        </p>
                      )}
                      {fileNumberStatus === "duplicate" && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          ✗ This document number already exists
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        የውል ቀን (Contract/Registration Date)
                      </label>
                      <input
                        type="date"
                        value={extraFields.registrationDate}
                        onChange={(e) => updateExtraField("registrationDate", e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* DARIS Page 1 Spatial & Demographics */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ቅርንጫፍ (Branch Location)
                      </label>
                      <select
                        value={extraFields.branchLocation}
                        onChange={(e) => updateExtraField("branchLocation", e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Branch</option>
                        {(VALUE_PAIRS.dars_branch_locations || []).map((loc) => (
                          <option key={loc.value} value={loc.value}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        የአባሪ ብዛት (Attachments)
                      </label>
                      <input
                        type="text"
                        value={extraFields.attachments || ""}
                        onChange={(e) => updateExtraField("attachments", e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ሴት ብዛት (Female Count)</label>
                      <input type="number" value={extraFields.femaleCount} onChange={(e) => updateExtraField("femaleCount", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ወንድ ብዛት (Male Count)</label>
                      <input type="number" value={extraFields.maleCount} onChange={(e) => updateExtraField("maleCount", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                  </div>

                  <fieldset
                    className="contents"
                    disabled={isSectionDisabled}
                  >
                    <div className={`mt-4 space-y-4 transition-opacity duration-200 ${isSectionDisabled ? "opacity-50 pointer-events-none" : ""}`}>
                      <h3 className="text-md font-semibold text-gray-800 mb-4 border-t pt-4">
                        የደንበኞች መረጃ (Parties Info)
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">የውል ሰጪ ደንበኛ አይነት (Giver Type)</label>
                            <select value={extraFields.giverType} onChange={(e) => updateExtraField("giverType", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                              <option value="">Select Type</option>
                              {(VALUE_PAIRS.dars_customer_types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <RepeatableField label={<>ውል ሰጪ ስም (Giver Name)<span className="text-red-500 ml-1">*</span></>} values={plaintiffs} setValues={setPlaintiffs} placeholder="Enter giver name" />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">የውል ተቀባይ ደንበኛ አይነት (Receiver Type)</label>
                            <select value={extraFields.receiverType} onChange={(e) => updateExtraField("receiverType", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                              <option value="">Select Type</option>
                              {(VALUE_PAIRS.dars_customer_types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <RepeatableField label={<>ውል ተቀባይ ስም (Receiver Name)<span className="text-red-500 ml-1">*</span></>} values={defendants} setValues={setDefendants} placeholder="Enter receiver name" />
                          </div>
                        </div>
                      </div>
                      
                      {activeEntityType === 'VehicleSale' || activeEntityType === 'VehicleGift' ? (
                        <div className="mt-4 p-4 border rounded bg-blue-50">
                          <h4 className="font-bold text-blue-900 mb-2">የተሽከርካሪ መረጃ (Vehicle Info)</h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm">የጉዳይ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS[activeEntityType === 'VehicleSale' ? 'case_types_sales' : 'case_types_gifts'] || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">Libre / ሊብሬ</label>
                              <input type="text" value={extraFields.vehicleLibre} onChange={(e) => updateExtraField("vehicleLibre", e.target.value)} className="w-full p-2 border rounded" placeholder="Identifier..." />
                            </div>
                            <div>
                              <label className="block text-sm">Plate / የሰሌዳ ቁጥር</label>
                              <input type="text" value={extraFields.vehiclePlate} onChange={(e) => updateExtraField("vehiclePlate", e.target.value)} className="w-full p-2 border rounded" placeholder="Plate..." />
                            </div>
                            <div>
                              <label className="block text-sm">Chassis / ቻንሲ ቁጥር</label>
                              <input type="text" value={extraFields.vehicleChassis} onChange={(e) => updateExtraField("vehicleChassis", e.target.value)} className="w-full p-2 border rounded" placeholder="Chassis..." />
                            </div>
                            <div>
                              <label className="block text-sm">Motor / ሞተር ቁጥር</label>
                              <input type="text" value={extraFields.vehicleMotor} onChange={(e) => updateExtraField("vehicleMotor", e.target.value)} className="w-full p-2 border rounded" placeholder="Motor..." />
                            </div>
                            <div>
                              <label className="block text-sm">የግምት ዋጋ (Est. Value)</label>
                              <input type="number" value={extraFields.estimatedValue} onChange={(e) => updateExtraField("estimatedValue", e.target.value)} className="w-full p-2 border rounded" placeholder="Amount..." />
                            </div>
                            {activeEntityType === 'VehicleSale' && (
                              <div>
                                <label className="block text-sm">የተሸጠበት ዋጋ (Sale Value)</label>
                                <input type="number" value={extraFields.saleValue} onChange={(e) => updateExtraField("saleValue", e.target.value)} className="w-full p-2 border rounded" placeholder="Amount..." />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : activeEntityType === 'HouseSale' || activeEntityType === 'HouseGift' ? (
                        <div className="mt-4 p-4 border rounded bg-green-50">
                          <h4 className="font-bold text-green-900 mb-2">የንብረት መረጃ (Property Info)</h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm">የጉዳይ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS[activeEntityType === 'HouseSale' ? 'case_types_sales' : 'case_types_gifts'] || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">Carta / ካርታ</label>
                              <input type="text" value={extraFields.propertyCarta} onChange={(e) => updateExtraField("propertyCarta", e.target.value)} className="w-full p-2 border rounded" placeholder="Identifier..." />
                            </div>
                            <div>
                              <label className="block text-sm">ካርታ የተሰጠበት (Carta Date)</label>
                              <input type="date" value={extraFields.propertyCartaDate} onChange={(e) => updateExtraField("propertyCartaDate", e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                              <label className="block text-sm">ክልል (Region)</label>
                              <select value={extraFields.region} onChange={(e) => updateExtraField("region", e.target.value)} className="w-full p-2 border rounded bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                                <option value="">Select Region</option>
                                {(VALUE_PAIRS.regions_list || []).map((loc) => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm">ከተማ (City)</label>
                              <input type="text" value={extraFields.city} onChange={(e) => updateExtraField("city", e.target.value)} className="w-full p-2 border rounded" placeholder="City..." />
                            </div>
                            <div>
                              <label className="block text-sm">ክፍለ ከተማ (Sub-city)</label>
                              <input type="text" value={extraFields.subcity} onChange={(e) => updateExtraField("subcity", e.target.value)} className="w-full p-2 border rounded" placeholder="Sub-city..." />
                            </div>
                            <div>
                              <label className="block text-sm">ወረዳ (Woreda)</label>
                              <input type="text" value={extraFields.woreda} onChange={(e) => updateExtraField("woreda", e.target.value)} className="w-full p-2 border rounded" placeholder="Woreda..." />
                            </div>
                            <div>
                              <label className="block text-sm">ቀበሌ (Kebele)</label>
                              <input type="text" value={extraFields.kebele} onChange={(e) => updateExtraField("kebele", e.target.value)} className="w-full p-2 border rounded" placeholder="Kebele..." />
                            </div>
                            <div>
                              <label className="block text-sm">House Number / የቤት ቁጥር</label>
                              <input type="text" value={extraFields.propertyHouseNumber} onChange={(e) => updateExtraField("propertyHouseNumber", e.target.value)} className="w-full p-2 border rounded" placeholder="House Num..." />
                            </div>
                            <div>
                              <label className="block text-sm">የቦታ ስፋት (Area sqm)</label>
                              <input type="text" value={extraFields.propertyArea} onChange={(e) => updateExtraField("propertyArea", e.target.value)} className="w-full p-2 border rounded" placeholder="Area..." />
                            </div>
                            {activeEntityType === 'HouseSale' && (
                              <div>
                                <label className="block text-sm">የተሸጠበት ዋጋ (Sale Value)</label>
                                <input type="number" value={extraFields.saleValue} onChange={(e) => updateExtraField("saleValue", e.target.value)} className="w-full p-2 border rounded" placeholder="Amount..." />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : activeEntityType === 'LoanUnsecured' || activeEntityType === 'LoanSecured' ? (
                        <div className="mt-4 p-4 border rounded bg-purple-50">
                          <h4 className="font-bold text-purple-900 mb-2">የብድር መረጃ (Loan Info)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">የጉዳይ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS.case_types_loans || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm">Loan Amount / የብድር መጠን</label>
                              <input type="number" value={extraFields.loanAmount} onChange={(e) => updateExtraField("loanAmount", e.target.value)} className="w-full p-2 border rounded" placeholder="Amount..." />
                            </div>
                            <div>
                              <label className="block text-sm">ብድር መጀመርያ ቀን (Start Date)</label>
                              <input type="date" value={extraFields.loanStartDate} onChange={(e) => updateExtraField("loanStartDate", e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                              <label className="block text-sm">ብድር ማብቂያ ቀን (End Date)</label>
                              <input type="date" value={extraFields.loanEndDate} onChange={(e) => updateExtraField("loanEndDate", e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                          </div>
                        </div>
                      ) : activeEntityType === 'PowerOfAttorney' || activeEntityType === 'POARevocation' || activeEntityType === 'LoanClearance' ? (
                        <div className="mt-4 p-4 border rounded bg-yellow-50">
                          <h4 className="font-bold text-yellow-900 mb-2">{activeEntityType === 'PowerOfAttorney' ? 'የውክልና መረጃ (POA Info)' : 'የስረዛ መረጃ (Revocation Info)'}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">የጉዳይ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS.case_types_poa || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            {(activeEntityType === 'POARevocation' || activeEntityType === 'LoanClearance') && (
                              <div>
                                <label className="block text-sm">የተሻረው ውክልና/ኑዛዜ ቁጥር (Revoked Doc Number)</label>
                                <input type="text" value={extraFields.revokedNumber} onChange={(e) => updateExtraField("revokedNumber", e.target.value)} className="w-full p-2 border rounded" placeholder="Doc Num..." />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : activeEntityType === 'CorporateArticles' ? (
                        <div className="mt-4 p-4 border rounded bg-gray-100">
                          <h4 className="font-bold text-gray-900 mb-2">የድርጅት መረጃ (Corporate Info)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">Organization Name / የድርጅት ስም</label>
                              <input type="text" value={extraFields.organizationName} onChange={(e) => updateExtraField("organizationName", e.target.value)} className="w-full p-2 border rounded" placeholder="Name..." />
                            </div>
                            <div>
                              <label className="block text-sm">የጉዳዩ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS.case_types_auth || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm">የማህበሩ አይነት (Assoc. Type)</label>
                              <input type="text" value={extraFields.organizationType} onChange={(e) => updateExtraField("organizationType", e.target.value)} className="w-full p-2 border rounded" placeholder="Type..." />
                            </div>
                            <div>
                              <label className="block text-sm">TIN / የግብር ከፋይ መለያ ቁጥር</label>
                              <input type="text" value={extraFields.tin} onChange={(e) => updateExtraField("tin", e.target.value)} className="w-full p-2 border rounded" placeholder="TIN..." />
                            </div>
                            
                            {/* Spatial fields for Corporate Articles */}
                            <div>
                              <label className="block text-sm">ክልል (Region)</label>
                              <select value={extraFields.region} onChange={(e) => updateExtraField("region", e.target.value)} className="w-full p-2 border rounded bg-white shadow-sm">
                                <option value="">Select Region</option>
                                {(VALUE_PAIRS.regions_list || []).map((loc) => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm">ከተማ (City)</label>
                              <input type="text" value={extraFields.city} onChange={(e) => updateExtraField("city", e.target.value)} className="w-full p-2 border rounded" placeholder="City..." />
                            </div>
                            <div>
                              <label className="block text-sm">ክፍለ ከተማ (Sub-city)</label>
                              <input type="text" value={extraFields.subcity} onChange={(e) => updateExtraField("subcity", e.target.value)} className="w-full p-2 border rounded" placeholder="Sub-city..." />
                            </div>
                            <div>
                              <label className="block text-sm">ወረዳ (Woreda)</label>
                              <input type="text" value={extraFields.woreda} onChange={(e) => updateExtraField("woreda", e.target.value)} className="w-full p-2 border rounded" placeholder="Woreda..." />
                            </div>
                            <div>
                              <label className="block text-sm">ቀበሌ (Kebele)</label>
                              <input type="text" value={extraFields.kebele} onChange={(e) => updateExtraField("kebele", e.target.value)} className="w-full p-2 border rounded" placeholder="Kebele..." />
                            </div>
                            <div>
                              <label className="block text-sm">House Number / የቤት ቁጥር</label>
                              <input type="text" value={extraFields.propertyHouseNumber} onChange={(e) => updateExtraField("propertyHouseNumber", e.target.value)} className="w-full p-2 border rounded" placeholder="House Num..." />
                            </div>
                            <div>
                              <label className="block text-sm">ስልክ ቁጥር (Phone No)</label>
                              <input type="text" value={extraFields.phone} onChange={(e) => updateExtraField("phone", e.target.value)} className="w-full p-2 border rounded" placeholder="Phone..." />
                            </div>
                            <div>
                              <label className="block text-sm">ጠቅላላ መዋጮ (Total Contribution)</label>
                              <input type="text" value={extraFields.totalContribution} onChange={(e) => updateExtraField("totalContribution", e.target.value)} className="w-full p-2 border rounded" placeholder="Contribution..." />
                            </div>
                            <div>
                              <label className="block text-sm">ጠቅላላ የአክሲዮን ብዛት (Total Shares)</label>
                              <input type="text" value={extraFields.totalShares} onChange={(e) => updateExtraField("totalShares", e.target.value)} className="w-full p-2 border rounded" placeholder="Shares..." />
                            </div>
                            <div>
                              <label className="block text-sm">ካፒታል (Capital)</label>
                              <input type="text" value={extraFields.capital} onChange={(e) => updateExtraField("capital", e.target.value)} className="w-full p-2 border rounded" placeholder="Capital..." />
                            </div>
                          </div>
                        </div>
                      ) : activeEntityType === 'CorporateMinutes' ? (
                        <div className="mt-4 p-4 border rounded bg-gray-100">
                          <h4 className="font-bold text-gray-900 mb-2">የስብሰባ ቃለ-ጉባኤ (Corporate Minutes)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm">የማህበሩ ስም (Assoc. Name)</label>
                              <input type="text" value={extraFields.organizationName} onChange={(e) => updateExtraField("organizationName", e.target.value)} className="w-full p-2 border rounded" placeholder="Name..." />
                            </div>
                            <div>
                              <label className="block text-sm">የጉዳዩ አይነት (Case Type)</label>
                              <select value={extraFields.caseType} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 border rounded">
                                <option value="">Select Case Type</option>
                                {(VALUE_PAIRS.case_types_auth || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm">የስብሰባ አጀንዳ (Agenda)</label>
                              <textarea value={extraFields.meetingAgenda} onChange={(e) => updateExtraField("meetingAgenda", e.target.value)} className="w-full p-2 border rounded" rows="2" placeholder="Agenda..."></textarea>
                            </div>
                            <div>
                              <label className="block text-sm">ስብሰባ የተካሄደበት ቦታ (Place)</label>
                              <input type="text" value={extraFields.meetingPlace} onChange={(e) => updateExtraField("meetingPlace", e.target.value)} className="w-full p-2 border rounded" placeholder="Place..." />
                            </div>
                            <div>
                              <label className="block text-sm">የስብሰባ ሰአት (Time)</label>
                              <input type="text" value={extraFields.meetingTime} onChange={(e) => updateExtraField("meetingTime", e.target.value)} className="w-full p-2 border rounded" placeholder="Time..." />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm">ውሳኔ (Decision)</label>
                              <textarea value={extraFields.meetingDecision} onChange={(e) => updateExtraField("meetingDecision", e.target.value)} className="w-full p-2 border rounded" rows="2" placeholder="Decision..."></textarea>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* DARIS Page 3 */}
                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h3 className="text-md font-semibold text-gray-800 mb-4">
                          የሰራተኞች መረጃ (Officers Info)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">መዝጋቢ (Data Encoder Name)</label>
                            <input type="text" value={extraFields.dataEncoderName} onChange={(e) => updateExtraField("dataEncoderName", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Encoder Name..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">የኦፊሰር ስም (Officer Name)</label>
                            <input type="text" value={extraFields.officerName} onChange={(e) => updateExtraField("officerName", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Officer Name..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">ያጣሪ ስም (Investigator Name)</label>
                            <input type="text" value={extraFields.investigatorName} onChange={(e) => updateExtraField("investigatorName", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Investigator Name..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">የማህተም እደላ (Stamp Duty Officer)</label>
                            <input type="text" value={extraFields.stampOfficerName} onChange={(e) => updateExtraField("stampOfficerName", e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Stamp Officer Name..." />
                          </div>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
                  <div className={`border-t border-gray-200 pt-6 transition-opacity duration-200 ${isSectionDisabled ? "opacity-50 pointer-events-none" : ""}`}>
                    <label className="block text-sm font-bold text-gray-800 mb-4 uppercase tracking-tighter">
                      መዝገብ ፋይሎች
                    </label>
                    {files.length > 0 ? (
                      <div className="space-y-6">
                        {files.map((file) => (
                          <div
                            key={file.id}
                            className={`p-4 rounded-lg border-2 transition-all ${selectedFileId === file.id
                              ? "border-blue-400 bg-blue-50/30"
                              : "border-gray-200 bg-white shadow-sm"
                              }`}
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
                                      (!primaryFileId &&
                                        files[0].id === file.id)
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

                            {/* Updated Grid Layout */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Title - Now takes 1 column instead of 2 */}
                              <div>
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
                                    newFiles[idx].metadata.title =
                                      e.target.value;
                                    setFiles(newFiles);
                                  }}
                                  className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="File Name"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                  የሰነዱ ዓይነት
                                  {/* <span className="text-red-500 ml-1">*</span> */}
                                </label>
                                <select
                                  required
                                  value={file.metadata.type}
                                  onChange={(e) => {
                                    const newFiles = [...files];
                                    const idx = newFiles.findIndex(
                                      (f) => f.id === file.id,
                                    );
                                    newFiles[idx].metadata.type =
                                      e.target.value;
                                    setFiles(newFiles);
                                  }}
                                  className="w-full text-xs p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none h-9 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">Select Type</option>
                                  {(VALUE_PAIRS.document_types || []).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Description - Takes full width below */}
                              <div className="col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                  መግለጫ
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
                                  className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none min-h-[60px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="ስለ ሰነዱ አጭር መግለጫ እዚህ ያስገቡ..."
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
                <p>
                  እባክዎ መጀመሪያ ፋይል ይጫኑ (Upload)፤ ከዚያም ሜታዳታውን ለማስተካከል ፋይሉን ይምረጡ።
                </p>
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
      </div >
    </div >
  );
};

export default MetadataEditor;
