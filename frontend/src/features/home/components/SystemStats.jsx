import React from 'react';
import { MapPin, BarChart3, Download, Users } from "lucide-react";
import { Card } from "../../../components/UI/Card";

const SystemStats = ({ stats, user }) => {
    return (
        <section className="mb-16">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-[#265A91] mb-4 tracking-tight">
                    የሰነዶች ማረጋገጫና ምዝገባ አገልግሎት
                </h2>
                <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                    ይህ ሲስተም የሰነዶችን ማረጋገጫና ምዝገባ ሂደት በዘመናዊ መልኩ ለማስተናገድ የተዘጋጀ ዲጂታል ማዕከል ነው።
                    ፈጣን፣ አስተማማኝ እና ተደራሽ የሆነ አገልግሎት ለመስጠት ታስቦ የተሰራ ነው።
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center bg-white hover:shadow-xl transition-all duration-300 border border-[#F9F871]/30 border-t-4 border-t-[#265A91] transform hover:-translate-y-1">
                    <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="w-8 h-8 text-[#265A91]" />
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.communities}
                    </h3>
                    <p className="text-gray-600 font-medium">የሰነድ አይነቶች</p>
                </Card>
                <Card className="text-center bg-white hover:shadow-xl transition-all duration-300 border border-[#F9F871]/30 border-t-4 border-t-[#265A91] transform hover:-translate-y-1">
                    <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-8 h-8 text-[#265A91]" />
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.totalResources?.toLocaleString() || 0}
                    </h3>
                    <p className="text-gray-600 font-medium">ጠቅላላ የተመዘገቡ ሰነዶች</p>
                </Card>
                <Card className="text-center bg-white hover:shadow-xl transition-all duration-300 border border-[#F9F871]/30 border-t-4 border-t-[#265A91] transform hover:-translate-y-1">
                    <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Download className="w-8 h-8 text-[#265A91]" />
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-2">
                        {user ? stats.mySubmissions : 0}
                    </h3>
                    <p className="text-gray-600 font-medium">የእኔ ምዝገባዎች</p>
                </Card>
                <Card className="text-center bg-white hover:shadow-xl transition-all duration-300 border border-[#F9F871]/30 border-t-4 border-t-[#265A91] transform hover:-translate-y-1">
                    <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-[#265A91]" />
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-2">
                        {user ? stats.allowedCollections : 0}
                    </h3>
                    <p className="text-gray-600 font-medium">የተፈቀዱ ሰነዶች</p>
                </Card>
            </div>
        </section>
    );
};

export default SystemStats;
