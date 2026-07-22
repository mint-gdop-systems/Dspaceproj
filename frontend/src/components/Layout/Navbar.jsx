import { Link, useNavigate } from "react-router-dom";
import { Search, User, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="bg-gradient-to-r from-[#265A91] to-[#4FA3D1] text-white shadow-lg border-b-4 border-[#F9F871]">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="flex items-center space-x-4 group">
                            <img 
                                src="/dars_logo.png" 
                                alt="DARIS Logo" 
                                className="h-16 w-auto object-contain bg-white rounded-full p-1 shadow-md group-hover:scale-105 transition-transform" 
                            />
                            <div className="flex flex-col">
                                <span className="text-xl md:text-2xl font-bold text-[#F9F871] drop-shadow-md tracking-wide">
                                    የሰነዶች ማረጋገጫና ምዝገባ አገልግሎት
                                </span>
                                <span className="text-sm md:text-base font-medium text-white/90 drop-shadow-sm">
                                    Documents Authentication and Registration Service
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex space-x-4">
                            {user && (
                                <Link to="/editor" className="font-semibold px-3 py-2 rounded-md hover:bg-white/10 transition-colors">
                                    ሰነድ ይጫኑ
                                </Link>
                            )}
                            {user?.role === "admin" && (
                                <Link to="/admin-choice" className="font-semibold px-3 py-2 rounded-md hover:bg-white/10 transition-colors">
                                    አስተዳዳሪ
                                </Link>
                            )}
                        </div>

                        <div className="h-8 w-px bg-white/30 mx-2"></div>

                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link to="/profile" className="flex items-center space-x-2 font-medium hover:text-[#F9F871] transition-colors">
                                    <User className="w-5 h-5" />
                                    <span>{user.first_name || user.username}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 cursor-pointer font-medium hover:text-red-200 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>ውጣ</span>
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/signin"
                                className="bg-[#F9F871] text-[#265A91] font-bold px-6 py-2 rounded-lg hover:bg-white transition-colors shadow-md"
                            >
                                ግባ
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
