import React from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight as RightIcon, ZoomIn, ZoomOut, Merge, Scissors, Pencil, RotateCw, X, Eye, FileIcon, FileText } from 'lucide-react';

export const MetadataFileViewer = ({ selectedFile, numPages, pageNumber, scale, pdfError, changePage, zoomIn, zoomOut, files, setIsMergeModalOpen,isSplitModalOpen, setIsSplitModalOpen, handleRotate, setRenameNewName, setIsRenameModalOpen, isRenameModalOpen, onDocumentLoadSuccess, onDocumentLoadError, isMergeModalOpen, filesToMerge, toggleFileForMerge, mergeFileName, setMergeFileName, handleMergeClick, handleMergeSubmit, handleSplit, splitPages, setSplitPages, splitNames, handleSplitNameChange, handleSplitSubmit, handleRename, renameNewName, handleRenameSubmit }) => {
  return (
        <div className="w-full h-full overflow-hidden bg-gray-100 rounded-lg shadow-sm border border-gray-200">
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
  );
};
