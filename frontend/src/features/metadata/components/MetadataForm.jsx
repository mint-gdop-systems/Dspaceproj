import React from 'react';
import { Trash2, FileText } from 'lucide-react';
import { VALUE_PAIRS } from '../lib/constants';
import { RepeatableField } from './RepeatableField';

export const MetadataForm = ({ onNext, collections, collectionId, setCollectionId, description, setDescription, fileNumber, setFileNumber, fileNumberStatus, activeEntityType, plaintiffs, setPlaintiffs, defendants, setDefendants, extraFields, updateExtraField, isSectionDisabled }) => {
  return (
    <div className="w-full h-full overflow-y-auto p-4 bg-gray-50 flex justify-center">
      <div className="w-full max-w-[1000px] bg-white shadow-md border border-gray-200 border-t-4 border-t-[#265A91]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onNext) onNext();
          }}
          className="p-8 space-y-8"
        >
          <div className="space-y-8">
            {/* Section: የሰነድ መረጃ */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                የሰነድ መረጃ
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የሰነድ ቁጥር <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    required
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                  {fileNumberStatus === "valid" && <p className="text-[10px] text-green-600 mt-1">✓ Valid</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የአባሪ ብዛት <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={extraFields.attachments || ""}
                    onChange={(e) => updateExtraField("attachments", e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የሰነዱ መገኛ ቅርንጫፍ (Branch Location) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={extraFields.branchLocation || ""}
                    onChange={(e) => updateExtraField("branchLocation", e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors bg-white"
                  >
                    <option value="">Select Branch</option>
                    {(VALUE_PAIRS.dars_branch_locations || []).map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የተዋዋሉበት ቀን <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={extraFields.registrationDate || ""}
                    onChange={(e) => updateExtraField("registrationDate", e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ሴት <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={extraFields.femaleCount || ""}
                    onChange={(e) => updateExtraField("femaleCount", e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ወንድ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={extraFields.maleCount || ""}
                    onChange={(e) => updateExtraField("maleCount", e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የጉዳይ አይነት <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    required
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors bg-white"
                  >
                    <option value="" disabled>የመዝገብ አይነት ይምረጡ</option>
                    {collections.map((c) => <option key={c.uuid} value={c.uuid}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <fieldset className="contents" disabled={isSectionDisabled}>
              <div className={`space-y-8 transition-opacity duration-200 ${isSectionDisabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Section: ውል ሰጪ */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                      ውል ሰጪ
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="w-full">
                        <label className="block text-xs font-bold text-gray-700 mb-1">የደንበኛ አይነት <span className="text-red-500">*</span></label>
                        <select value={extraFields.giverType || ""} onChange={(e) => updateExtraField("giverType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Customer Type</option>
                          {(VALUE_PAIRS.dars_customer_types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <RepeatableField label={<>ስም (Name)<span className="text-red-500 ml-1">*</span></>} values={plaintiffs} setValues={setPlaintiffs} placeholder="" />
                      </div>
                    </div>
                  </div>

                  {/* Section: ውል ተቀባይ */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                      ውል ተቀባይ
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="w-full">
                        <label className="block text-xs font-bold text-gray-700 mb-1">የደንበኛ አይነት <span className="text-red-500">*</span></label>
                        <select value={extraFields.receiverType || ""} onChange={(e) => updateExtraField("receiverType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Customer Type</option>
                          {(VALUE_PAIRS.dars_customer_types || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <RepeatableField label={<>ስም (Name)<span className="text-red-500 ml-1">*</span></>} values={defendants} setValues={setDefendants} placeholder="" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- DYNAMIC SECTIONS START --- */}
                {activeEntityType === 'VehicleSale' || activeEntityType === 'VehicleGift' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 text-blue-800">
                      የተሽከርካሪ መረጃ (Vehicle Info)
                    </h3>
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳይ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS[activeEntityType === 'VehicleSale' ? 'case_types_sales' : 'case_types_gifts'] || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Libre / ሊብሬ <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.vehicleLibre || ""} onChange={(e) => updateExtraField("vehicleLibre", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Identifier..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Plate / የሰሌዳ ቁጥር <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.vehiclePlate || ""} onChange={(e) => updateExtraField("vehiclePlate", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Plate..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Chassis / ቻንሲ ቁጥር <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.vehicleChassis || ""} onChange={(e) => updateExtraField("vehicleChassis", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Chassis..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Motor / ሞተር ቁጥር <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.vehicleMotor || ""} onChange={(e) => updateExtraField("vehicleMotor", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Motor..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የግምት ዋጋ (Est. Value)</label>
                        <input type="number" value={extraFields.estimatedValue || ""} onChange={(e) => updateExtraField("estimatedValue", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Amount..." />
                      </div>
                      {activeEntityType === 'VehicleSale' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">የተሸጠበት ዋጋ (Sale Value) <span className="text-red-500">*</span></label>
                          <input type="number" value={extraFields.saleValue || ""} onChange={(e) => updateExtraField("saleValue", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Amount..." />
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeEntityType === 'HouseSale' || activeEntityType === 'HouseGift' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 text-green-800">
                      የንብረት መረጃ (Property Info)
                    </h3>
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳይ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS[activeEntityType === 'HouseSale' ? 'case_types_sales' : 'case_types_gifts'] || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Carta / ካርታ <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.propertyCarta || ""} onChange={(e) => updateExtraField("propertyCarta", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Identifier..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ካርታ የተሰጠበት (Carta Date) <span className="text-red-500">*</span></label>
                        <input type="date" value={extraFields.propertyCartaDate || ""} onChange={(e) => updateExtraField("propertyCartaDate", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ክልል (Region) <span className="text-red-500">*</span></label>
                        <select value={extraFields.region || ""} onChange={(e) => updateExtraField("region", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white shadow-sm">
                          <option value="">Select Region</option>
                          {(VALUE_PAIRS.regions_list || []).map((loc) => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ከተማ (City)</label>
                        <input type="text" value={extraFields.city || ""} onChange={(e) => updateExtraField("city", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="City..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ክፍለ ከተማ (Sub-city)</label>
                        <input type="text" value={extraFields.subcity || ""} onChange={(e) => updateExtraField("subcity", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Sub-city..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ወረዳ (Woreda)</label>
                        <input type="text" value={extraFields.woreda || ""} onChange={(e) => updateExtraField("woreda", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Woreda..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ቀበሌ (Kebele)</label>
                        <input type="text" value={extraFields.kebele || ""} onChange={(e) => updateExtraField("kebele", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Kebele..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">House Number / የቤት ቁጥር</label>
                        <input type="text" value={extraFields.propertyHouseNumber || ""} onChange={(e) => updateExtraField("propertyHouseNumber", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="House Num..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የቦታ ስፋት (Area sqm) <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.propertyArea || ""} onChange={(e) => updateExtraField("propertyArea", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Area..." />
                      </div>
                      {activeEntityType === 'HouseSale' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">የተሸጠበት ዋጋ (Sale Value) <span className="text-red-500">*</span></label>
                          <input type="number" value={extraFields.saleValue || ""} onChange={(e) => updateExtraField("saleValue", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Amount..." />
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeEntityType === 'LoanUnsecured' || activeEntityType === 'LoanSecured' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 text-purple-800">
                      የብድር መረጃ (Loan Info)
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳይ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS.case_types_loans || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Loan Amount / የብድር መጠን <span className="text-red-500">*</span></label>
                        <input type="number" value={extraFields.loanAmount || ""} onChange={(e) => updateExtraField("loanAmount", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Amount..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ብድር መጀመርያ ቀን (Start Date) <span className="text-red-500">*</span></label>
                        <input type="date" value={extraFields.loanStartDate || ""} onChange={(e) => updateExtraField("loanStartDate", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ብድር ማብቂያ ቀን (End Date)</label>
                        <input type="date" value={extraFields.loanEndDate || ""} onChange={(e) => updateExtraField("loanEndDate", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                      </div>
                    </div>
                  </div>
                ) : activeEntityType === 'PowerOfAttorney' || activeEntityType === 'POARevocation' || activeEntityType === 'LoanClearance' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 text-yellow-800">
                      {activeEntityType === 'PowerOfAttorney' ? 'የውክልና መረጃ (POA Info)' : 'የስረዛ መረጃ (Revocation Info)'}
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳይ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS.case_types_poa || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {(activeEntityType === 'POARevocation' || activeEntityType === 'LoanClearance') && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">የተሻረው ውክልና/ኑዛዜ ቁጥር (Revoked Doc Number) <span className="text-red-500">*</span></label>
                          <input type="text" value={extraFields.revokedNumber || ""} onChange={(e) => updateExtraField("revokedNumber", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Doc Num..." />
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeEntityType === 'CorporateArticles' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                      የድርጅት መረጃ (Corporate Info)
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Organization Name / የድርጅት ስም <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.organizationName || ""} onChange={(e) => updateExtraField("organizationName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Name..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳዩ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS.case_types_auth || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የማህበሩ አይነት (Assoc. Type) <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.organizationType || ""} onChange={(e) => updateExtraField("organizationType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Type..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">TIN / የግብር ከፋይ መለያ ቁጥር</label>
                        <input type="text" value={extraFields.tin || ""} onChange={(e) => updateExtraField("tin", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="TIN..." />
                      </div>

                      {/* Spatial fields for Corporate Articles */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ክልል (Region) <span className="text-red-500">*</span></label>
                        <select value={extraFields.region || ""} onChange={(e) => updateExtraField("region", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white shadow-sm">
                          <option value="">Select Region</option>
                          {(VALUE_PAIRS.regions_list || []).map((loc) => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ከተማ (City)</label>
                        <input type="text" value={extraFields.city || ""} onChange={(e) => updateExtraField("city", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="City..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ክፍለ ከተማ (Sub-city)</label>
                        <input type="text" value={extraFields.subcity || ""} onChange={(e) => updateExtraField("subcity", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Sub-city..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ወረዳ (Woreda)</label>
                        <input type="text" value={extraFields.woreda || ""} onChange={(e) => updateExtraField("woreda", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Woreda..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ቀበሌ (Kebele)</label>
                        <input type="text" value={extraFields.kebele || ""} onChange={(e) => updateExtraField("kebele", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Kebele..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">House Number / የቤት ቁጥር</label>
                        <input type="text" value={extraFields.propertyHouseNumber || ""} onChange={(e) => updateExtraField("propertyHouseNumber", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="House Num..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ስልክ ቁጥር (Phone No)</label>
                        <input type="text" value={extraFields.phone || ""} onChange={(e) => updateExtraField("phone", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Phone..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ጠቅላላ መዋጮ (Total Contribution)</label>
                        <input type="text" value={extraFields.totalContribution || ""} onChange={(e) => updateExtraField("totalContribution", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Contribution..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ጠቅላላ የአክሲዮን ብዛት (Total Shares)</label>
                        <input type="text" value={extraFields.totalShares || ""} onChange={(e) => updateExtraField("totalShares", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Shares..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ካፒታል (Capital) <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.capital || ""} onChange={(e) => updateExtraField("capital", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Capital..." />
                      </div>
                    </div>
                  </div>
                ) : activeEntityType === 'CorporateMinutes' ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                      የስብሰባ ቃለ-ጉባኤ (Corporate Minutes)
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የማህበሩ ስም (Assoc. Name) <span className="text-red-500">*</span></label>
                        <input type="text" value={extraFields.organizationName || ""} onChange={(e) => updateExtraField("organizationName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Name..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የጉዳዩ አይነት (Case Type) <span className="text-red-500">*</span></label>
                        <select value={extraFields.caseType || ""} onChange={(e) => updateExtraField("caseType", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                          <option value="">Select Case Type</option>
                          {(VALUE_PAIRS.case_types_auth || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-bold text-gray-700 mb-1">የስብሰባ አጀንዳ (Agenda) <span className="text-red-500">*</span></label>
                        <textarea value={extraFields.meetingAgenda || ""} onChange={(e) => updateExtraField("meetingAgenda", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" rows="2" placeholder="Agenda..."></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ስብሰባ የተካሄደበት ቦታ (Place)</label>
                        <input type="text" value={extraFields.meetingPlace || ""} onChange={(e) => updateExtraField("meetingPlace", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Place..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">የስብሰባ ሰአት (Time)</label>
                        <input type="text" value={extraFields.meetingTime || ""} onChange={(e) => updateExtraField("meetingTime", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" placeholder="Time..." />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-bold text-gray-700 mb-1">ውሳኔ (Decision) <span className="text-red-500">*</span></label>
                        <textarea value={extraFields.meetingDecision || ""} onChange={(e) => updateExtraField("meetingDecision", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" rows="2" placeholder="Decision..."></textarea>
                      </div>
                    </div>
                  </div>
                ) : null}
                {/* --- DYNAMIC SECTIONS END --- */}

                {/* Section: መረጃዎች */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1">
                    መረጃዎች
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">የኦፊሰር ስም <span className="text-red-500">*</span></label>
                      <input type="text" value={extraFields.officerName || ""} onChange={(e) => updateExtraField("officerName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">የዳታ ኢንኮደር ስም <span className="text-red-500">*</span></label>
                      <input type="text" value={extraFields.dataEncoderName || ""} onChange={(e) => updateExtraField("dataEncoderName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">የምስክር ስም <span className="text-red-500">*</span></label>
                      <input type="text" value={extraFields.investigatorName || ""} onChange={(e) => updateExtraField("investigatorName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">የማህተም እደላ ስም <span className="text-red-500">*</span></label>
                      <input type="text" value={extraFields.stampOfficerName || ""} onChange={(e) => updateExtraField("stampOfficerName", e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">ማስታወሻ</label>
                      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Next Button (Bottom Left) */}
            <div className="pt-8 flex justify-start">
              <button
                type="submit"
                className="px-8 py-2 bg-[#265A91] hover:bg-[#1a4066] text-white font-bold rounded shadow-md transition-colors"
              >
                ቀጣይ
              </button>
            </div>
            {/* </div> */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetadataForm;
