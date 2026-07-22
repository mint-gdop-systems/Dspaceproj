import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// import { useAuth } from "../contexts/AuthContext";
// import { Search } from "lucide-react";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const ResourceTable = ({ resources, loading }) => {
    // const { user } = useAuth();
    // const isAuthenticated = !!user;
    const [previewLoading, setPreviewLoading] = useState({});
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfLoading, setPdfLoading] = useState(true);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPdfLoading(false);
    }

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement("a");
        link.href = previewUrl;
        // Extract filename from URL or use a default
        const filename = previewUrl.split("/").pop() || "document.pdf";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = async (resource, e) => {
        e.stopPropagation();
        let url = "";
        // Prefer UUID for the preview URL to avoid handle slashes breaking paths
        const itemUuid = resource.id || resource.external_id;
        if (resource.preview_url) {
            url = resource.preview_url;
        } else if (itemUuid && !itemUuid.includes("/")) {
            url = `/api/resources/dspace-bitstream/${itemUuid}/`;
        } else if (resource.id && resource.id.startsWith("dspace_")) {
            const cleanUuid = resource.id.replace("dspace_", "");
            url = `/api/resources/dspace-bitstream/${cleanUuid}/`;
        }

        if (url) {
            setPreviewUrl(url);
            setPageNumber(1);
            setPdfLoading(true);
            setShowPreviewModal(true);
        }
    };

    const handleRowClick = (resource) => {
        const isHandle = resource.external_id && resource.external_id.includes("/");
        const path = isHandle ? "handle" : "items";
        const baseUrl = import.meta.env.DSPACE_FRONTEND_URL || "http://localhost:4000";
        window.open(
            `${baseUrl}/${path}/${resource.external_id}`,
            "_blank",
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                <p className="mt-4 text-gray-600 text-lg">ሰነዶችን በመጫን ላይ...</p>
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
                <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ምንም ሰነዶች አልተገኙም
                </h3>
                <p className="text-gray-600 mb-4">
                    የፍለጋ መስፈርቶችዎን ማስተካከል ወይም በምድብ ማሰስ ይሞክሩ
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-2">
            <div className="mb-4">
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b-2 border-[#265A91]">
                        <tr>
                            {/* <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ርዕስ
                            </th> */}
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                የሰነድ ቁጥር
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                የውል ቀን
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ውል ሰጪ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ውል ተቀባይ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                የሰነድ አይነት
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ቅርንጫፍ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ሁኔታ
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                ተግባራት
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resources.map((resource) => (
                            <tr
                                key={resource.id}
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                onClick={() => handleRowClick(resource)}
                            >
                                {/* <td className="px-6 py-4 max-w-xs">

                                </td> */}
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">
                                    {resource.file_number || "—"}
                                    <div className="flex flex-col space-y-1">
                                        {resource.entity_type && (
                                            <span className="inline-flex w-max items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {resource.entity_type}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    {resource.document_date || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    {resource.plaintiff || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    {resource.defendant || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    {resource.service_type || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    {resource.branch || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                        {resource.case_status || "የተመዘገበ"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <button
                                            onClick={(e) => handlePreview(resource, e)}
                                            disabled={previewLoading[resource.id]}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                                        >
                                            {previewLoading[resource.id] ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                    በመጫን ላይ...
                                                </>
                                            ) : (
                                                "ቅድመ እይታ"
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Full-screen Preview Modal */}
                {/* Full-screen Preview Modal with react-pdf */}
                {showPreviewModal && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-95 overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800 text-white z-10 shadow-lg">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold truncate max-w-md">
                                    {resources.find(r => r.id === Object.keys(previewLoading).find(id => previewUrl.includes(id)) || {})?.title || "የሰነድ ቅድመ እይታ"}
                                </h3>
                                <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm">
                                    <button
                                        onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                                        disabled={pageNumber <= 1}
                                        className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <span className="font-medium whitespace-nowrap">
                                        ገጽ {pageNumber} / {numPages || "--"}
                                    </span>
                                    <button
                                        onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                                        disabled={pageNumber >= numPages}
                                        className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-gray-700 mx-2" />

                                <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm">
                                    <button
                                        onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                                        className="hover:text-blue-400 transition-colors cursor-pointer"
                                        title="Zoom Out"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <span className="font-medium w-12 text-center">
                                        {Math.round(scale * 100)}%
                                    </span>
                                    <button
                                        onClick={() => setScale(prev => Math.min(prev + 0.1, 3.0))}
                                        className="hover:text-blue-400 transition-colors cursor-pointer"
                                        title="Zoom In"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-gray-700 mx-2" />

                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                                    title="አውርድ"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    አውርድ
                                </button>
                            </div>

                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="p-2 hover:bg-red-600/30 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                aria-label="Close preview"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Document Content */}
                        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-zinc-900 scroll-smooth">
                            <div className="flex flex-col items-center py-8 min-h-full">
                                {pdfLoading && (
                                    <div className="flex flex-col items-center justify-center p-12">
                                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <p className="mt-4 text-gray-600 font-medium">መረጃው በመጫን ላይ ነው...</p>
                                    </div>
                                )}
                                <div className={`transition-opacity duration-300 ${pdfLoading ? 'opacity-0 h-0' : 'opacity-100 shadow-2xl'}`}>
                                    <Document
                                        file={previewUrl}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={null}
                                        onLoadError={(error) => console.error("PDF Load Error:", error)}
                                    >
                                        <Page
                                            pageNumber={pageNumber}
                                            scale={scale}
                                            renderAnnotationLayer={true}
                                            renderTextLayer={true}
                                        />
                                    </Document>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default ResourceTable;
