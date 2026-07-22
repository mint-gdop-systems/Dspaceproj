import { useState } from "react";
import { pdfjs } from "react-pdf";

export const useMetadataFiles = () => {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  
  // PDF viewer states
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  // Modal states
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [filesToMerge, setFilesToMerge] = useState([]);
  const [mergeFileName, setMergeFileName] = useState("");

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitPages, setSplitPages] = useState("");
  const [splitNames, setSplitNames] = useState([]);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameNewName, setRenameNewName] = useState("");

  const [primaryFileId, setPrimaryFileId] = useState(null);

  const handleFileSelect = (fileId, setTitle) => {
    setSelectedFileId(fileId);
    const file = files.find((f) => f.id === fileId);
    if (file && setTitle) {
      setTitle(file.name);
    }
    setShowFileDropdown(false);
    setPageNumber(1);
    setNumPages(null);
    setPdfError(null);
  };

  const handleFileUpload = async (event, setTitle) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const processedFiles = await Promise.all(
      uploadedFiles.map(async (file) => {
        const titleWithoutExtension = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified),
          fileObject: file,
          fileUrl: URL.createObjectURL(file),
          label: "",
          metadata: {
            title: titleWithoutExtension,
            type: "",
            description: "",
            pageCount: null,
          },
        };
      })
    );
    const updatedFiles = [...files, ...processedFiles];
    setFiles(updatedFiles);
    if (processedFiles.length > 0 && !selectedFileId) {
      handleFileSelect(processedFiles[0].id, setTitle);
    }
    event.target.value = "";
  };

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
            metadata: {
              ...f.metadata,
              title: newName ? (newName.substring(0, newName.lastIndexOf(".")) || newName) : f.metadata.title
            }
          };
        }
        return f;
      })
    );
  };

  return {
    files, setFiles,
    selectedFileId, setSelectedFileId,
    numPages, setNumPages,
    pageNumber, setPageNumber,
    scale, setScale,
    pdfError, setPdfError,
    uploading, setUploading,
    showFileDropdown, setShowFileDropdown,
    isMergeModalOpen, setIsMergeModalOpen,
    filesToMerge, setFilesToMerge,
    mergeFileName, setMergeFileName,
    isSplitModalOpen, setIsSplitModalOpen,
    splitPages, setSplitPages,
    splitNames, setSplitNames,
    isRenameModalOpen, setIsRenameModalOpen,
    renameNewName, setRenameNewName,
    primaryFileId, setPrimaryFileId,
    handleFileSelect,
    handleFileUpload,
    updateFileInList
  };
};
