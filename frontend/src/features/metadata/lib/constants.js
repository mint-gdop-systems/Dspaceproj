export const VALUE_PAIRS = {
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

export const formatEthioDateString = (dateStr) => {
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
