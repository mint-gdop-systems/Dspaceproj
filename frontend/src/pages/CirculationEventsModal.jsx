import React, { useState, useEffect } from "react";
import dspaceService from "../services/dspaceService";
import { useAuth } from "../contexts/AuthContext";
import { 
    X, 
    Plus, 
    Calendar, 
    User, 
    MapPin, 
    FileText, 
    Loader2, 
    AlertCircle, 
    CheckCircle,
    ClipboardList
} from "lucide-react";

const InputField = ({ label, value, onChange, type = "text", required = false, placeholder = "" }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight flex items-center">
            {label} {required && <span className="text-red-500 ml-1">★</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="p-2.5 border border-gray-200 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white text-gray-900"
            placeholder={placeholder}
            required={required}
        />
    </div>
);

const SelectField = ({ label, value, onChange, options, required = false }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight flex items-center">
            {label} {required && <span className="text-red-500 ml-1">★</span>}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="p-2.5 border border-gray-200 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white text-gray-900 cursor-pointer"
            required={required}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const CirculationEventsModal = ({ isOpen, onClose, caseFile }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Form fields
    const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
    const [status, setStatus] = useState("out");
    const [handover, setHandover] = useState(user?.username || "");
    const [receiver, setReceiver] = useState("");
    const [department, setDepartment] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [description, setDescription] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    const loadEvents = async () => {
        if (!caseFile?.id) return;
        setLoading(true);
        setError("");
        try {
            const data = await dspaceService.getRelatedCirculationEvents(caseFile.id);
            setEvents(data || []);
        } catch (err) {
            console.error("Failed to load circulation events", err);
            setError("የስርጭት ሁነቶችን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && caseFile?.id) {
            loadEvents();
            // Reset form
            setEventDate(new Date().toISOString().split("T")[0]);
            setStatus("out");
            setHandover(user?.username || "");
            setReceiver("");
            setDepartment("");
            setReturnDate("");
            setDescription("");
            setShowAddForm(false);
            setError("");
            setSuccessMessage("");
        }
    }, [isOpen, caseFile, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!caseFile?.id) return;
        setSubmitting(true);
        setError("");
        setSuccessMessage("");

        const newEvent = {
            eventDate,
            status,
            handover,
            receiver,
            department,
            returnDate: returnDate || null,
            description
        };

        try {
            const res = await dspaceService.createCirculationEvent(caseFile.id, newEvent);
            if (res.success) {
                setSuccessMessage("የስርጭት ሁነቱ በተሳካ ሁኔታ ተመዝግቧል!");
                setShowAddForm(false);
                // Reset form inputs
                setReceiver("");
                setDepartment("");
                setReturnDate("");
                setDescription("");
                // Reload event list
                await loadEvents();
            } else {
                setError(res.error || "የስርጭት ሁነቱን ለመመዝገብ አልተቻለም።");
            }
        } catch (err) {
            console.error(err);
            setError("የስርጭት ሁነቱን ለመመዝገብ አልተቻለም።");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0C1E32]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
                
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900">የስርጭት ሁነቶች (Circulation Events)</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                የፋይል ቁጥር: <span className="font-semibold text-gray-800">{caseFile?.file_number || "—"}</span> | 
                                ከሳሽ: <span className="font-semibold text-gray-800">{caseFile?.plaintiff || "—"}</span> | 
                                ተከሳሽ: <span className="font-semibold text-gray-800">{caseFile?.defendant || "—"}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full transition-colors cursor-pointer hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8 flex flex-col gap-6">
                    {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-sm animate-slide-in">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-sm animate-slide-in">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Timeline List of Events */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                የሁነቶች ዝርዝር ({events.length})
                            </h3>
                            {!showAddForm && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> አዲስ ሁነት መመዝገብ
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                <span className="text-sm text-gray-500 font-medium">የስርጭት ሁነቶች በመጫን ላይ ናቸው...</span>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="p-4 bg-gray-50 rounded-full inline-block mb-3">
                                    <ClipboardList className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">ምንም የስርጭት ሁነት አልተመዘገበም</h4>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                    ለዚህ መዝገብ እስካሁን የተመዘገበ የስርጭት ወይም የንክኪ ታሪክ የለም።
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-tight bg-gray-50/50">
                                            <th className="px-4 py-3 rounded-l-lg">ቀን (Date Out)</th>
                                            <th className="px-4 py-3">የሰነድ ሁኔታ (Status)</th>
                                            <th className="px-4 py-3">ያስረከበው (Handed Over)</th>
                                            <th className="px-4 py-3">የተቀበለው (Received By)</th>
                                            <th className="px-4 py-3">የሄደበት ክፍል (Destination)</th>
                                            <th className="px-4 py-3">የተመለሰበት ቀን (Returned)</th>
                                            <th className="px-4 py-3 rounded-r-lg">ተጨማሪ ማብራሪያ (Remarks)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                        {events.map((evt) => (
                                            <tr key={evt.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3.5 whitespace-nowrap font-medium flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {evt.eventDate}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        evt.status === "out" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                                                        evt.status === "returned" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                                                        "bg-gray-50 text-gray-800 border border-gray-100"
                                                    }`}>
                                                        {evt.status === "out" ? "Out" : evt.status === "returned" ? "Returned" : evt.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {evt.handover || "—"}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        {evt.receiver}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2 max-w-[150px] truncate">
                                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                                        <span>{evt.department || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {evt.returnDate || "—"}
                                                </td>
                                                <td className="px-4 py-3.5 text-gray-500 max-w-xs truncate">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                                        <span>{evt.description || "—"}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Add Event Form */}
                    {showAddForm && (
                        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-slide-in">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 flex items-center justify-between border-b border-gray-100 pb-3">
                                <span>አዲስ የስርጭት ሁነት መመዝገቢያ</span>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddForm(false)} 
                                    className="text-gray-400 hover:text-gray-600 transition-colors text-xs font-semibold cursor-pointer"
                                >
                                    ሰርዝ
                                </button>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                                <SelectField
                                    label="የሰነድ ሁኔታ (Status)"
                                    value={status}
                                    onChange={setStatus}
                                    required
                                    options={[
                                        { value: "out", label: "Out (የወጣ)" },
                                        { value: "returned", label: "Returned (የተመለሰ)" }
                                    ]}
                                />
                                <InputField
                                    label="የወጣበት ቀን (Date Out)"
                                    value={eventDate}
                                    onChange={setEventDate}
                                    type="date"
                                    required
                                />
                                <InputField
                                    label="ያስረከበው (Handed Over By)"
                                    value={handover}
                                    onChange={setHandover}
                                    placeholder="ያስረከበው ባለሙያ ስም..."
                                />
                                <InputField
                                    label="የተቀበለው (Received By)"
                                    value={receiver}
                                    onChange={setReceiver}
                                    required
                                    placeholder="የዳኛ፣ አቃቤ ህግ ወይም ጸሃፊ ስም..."
                                />
                                <InputField
                                    label="የሄደበት ክፍል (Destination Department/Bench)"
                                    value={department}
                                    onChange={setDepartment}
                                    placeholder="የሄደበት ክፍል ወይም ችሎት..."
                                />
                                <InputField
                                    label="የተመለሰበት ቀን (Return Date)"
                                    value={returnDate}
                                    onChange={setReturnDate}
                                    type="date"
                                    placeholder="ፋይሉ ከተመለሰ ብቻ ያስገቡ..."
                                />
                                <div className="md:col-span-2 flex flex-col">
                                    <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight">
                                        ተጨማሪ ማብራሪያ (Remarks)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="p-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none min-h-[80px] bg-white text-gray-900"
                                        placeholder="ማንኛውም ተጨማሪ መግለጫ ወይም ማስታወሻ..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-5 py-2.5 border border-gray-200 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    ሰርዝ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> በመመዝገብ ላይ...
                                        </>
                                    ) : (
                                        "ይመዝገብ"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CirculationEventsModal;
