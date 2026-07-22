const Footer = () => {
    return (
        <footer className="bg-gradient-to-r from-[#265A91] to-[#4FA3D1] py-6 mt-auto text-white shadow-inner border-t-4 border-[#F9F871]">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div className="flex flex-col items-center md:items-start">
                        <h3 className="font-bold text-lg text-[#F9F871]">የሰነዶች ማረጋገጫና ምዝገባ አገልግሎት</h3>
                        <p className="text-sm text-white/90">Documents Authentication and Registration Service</p>
                    </div>

                    <div className="flex flex-col items-center md:items-start">
                        <h4 className="font-semibold mb-2">አድራሻ (Contact)</h4>
                        <div className="text-sm text-white/80">
                            <p>ኢሜይል: Info@dars.gov.et</p>
                            <p>ስልክ: +251 11 553 71331</p>
                            <p>አዲስ አበባ፣ ኢትዮጵያ</p>
                        </div>
                    </div>
                <div className="flex flex-col items-center md:items-end">
                    <p className="text-sm text-white/90">Powered By Ministry of Innovation and Technology</p>
                </div>
                </div>

                <div className="border-t border-white/20 mt-8 pt-4 text-center text-sm text-white/80">
                    <p>&copy; {new Date().getFullYear()} የሰነዶች ማረጋገጫና ምዝገባ አገልግሎት። ሁሉም መብቶች ተጠብቀዋል። (All Rights Reserved)</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
