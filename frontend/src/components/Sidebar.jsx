import React, { useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, BarChart3, TrendingUp, LogOut, Menu, X} from 'lucide-react';
import { logout } from '../services/api';

const Sidebar = () => {
    
    const [open, setOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        {path: '/', icon: Home, label: 'Home'},
        {path:'/stock', icon: Package, label: 'Stock'},
        {path: '/reports', icon: BarChart3, label:'Reports'},
        {path: '/insights', icon: TrendingUp, label:'Insights'},
    
    ];

    const handleLogout = () => {
        logout();
        window.location.href='/login';
    };

    return (
        <>
        <button 
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow border border-gray-200"
        >
            <Menu className="w-5 h-5 text-gray-700"/>
        </button>

        { open && (
            <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-20"
            onClick={() => setOpen(false)}
            />
        )}
        <div className={`w-64 bg-gray-100 min-h-screen flex flex-col fixed left-0 top-0 z-30
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        `}>
            <div className="p-6 flex items-center justify-left gap-2">
                 <img
                    src="/stocker.png"
                    alt="Stocker"
                    className="w-8 h-8 object-contain"
                />
                <h2 className="text-xl font-bold text-gray-800">STOCKER</h2>
            </div>

            <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:text-gray-700"
            >
                <X className="w-5 h-5"/>
            </button>
            <nav className="flex-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
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
        </>
    )


}
    

export default Sidebar;