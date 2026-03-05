import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, BarChart3, TrendingUp, Settings, LogOut} from 'lucide-react';
import { logout } from '../services/api';

const Sidebar = () => {
    
    const location = useLocation();

    const menuItems = [
        {path: '/', icon: Home, label: 'Home'},
        {path:'/stock', icon: Package, label: 'Stock'},
        {path: '/reports', icon: BarChart3, label:'Reports'},
        {path: '/insights', icon: TrendingUp, label:'Insights'},
        {path: '/settings', icon: Settings, label: 'Settings'},
    ];

    const handleLogout = () => {
        logout();
        window.location.href='/login';
    };

    return (
        <div className="w-64 bg-gray-100 min-h-screen flex flex-col">
            <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800">STOCKER</h2>
            </div>
            <nav className="flex-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-6 py-4 transition ${
                            isActive
                            ? 'bg-emerald-700 text-white'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                        >
                        <Icon className="w-5 h-5"/>
                        <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-gray-200 transition">
                <LogOut/>
                <span className="font-medium">Logout</span>
            </button>
        </div>
    )


}
    

export default Sidebar;