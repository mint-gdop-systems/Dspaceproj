import React from "react";
import { Upload, Eye, ChevronDown, Check } from "lucide-react";

export const MetadataToolbar = ({
  files,
  selectedFileId,
  selectedFile,
  showFileDropdown,
  setShowFileDropdown,
  handleFileUpload,
  handleFileSelect,
  handleFinalUpload,
  uploading,
  fileNumberStatus,
  getFileIcon,
  formatFileSize,
  primaryFileId,
  setPrimaryFileId
}) => {
  return (
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
                onChange={(e) => handleFileUpload(e, () => {})}
                className="hidden"
              />
            </label>

            <div className="relative">
              <button
                type="button"
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
                            type="button"
                            onClick={() => handleFileSelect(file.id, () => {})}
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
                              checked={
                                primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)
                              }
                              onChange={() => setPrimaryFileId(file.id)}
                              className="cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 ml-1">Primary</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-600 text-sm">No files uploaded.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleFinalUpload}
              disabled={
                uploading ||
                files.length !== 2 ||
                fileNumberStatus === "checking" ||
                fileNumberStatus === "duplicate"
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
      </div>
    </div>
  );
};
