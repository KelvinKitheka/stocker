import { Package, AlertTriangle, Plus } from "lucide-react";
import React, { useState, useEffect} from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import api from "../services/api";
import AddStockModal from "../components/AddStockModal";
import DepletionModal from "../components/DepletionModal";

const Dashboard = () => {
    const [ dashData, setDashData ] = useState(null);
    const [ showAddStock, setShowAddStock ] = useState(false);
    const [ showDepletion, setShowDepletion ] = useState(false);
    const [ selectedBatch, setSelectedBatch ] = useState(null);
    const [ loading, setLoading ] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, [])

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/');
            setDashData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-emerald-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <AlertTriangle className="w-6 h-6"/> 
                        {dashData?.low_stock_alerts?.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {dashData.low_stock_alerts.length}
                            </span>
                    )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                        {(dashData?.user?.first_name[0] || dashData?.user?.username[0] || 'U').charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6" >
                <h1 className="text-3xl font-bold text-gray-800  mb-6">
                Karibu, {dashData?.user?.first_name || dashData?.user?.username || 'User'}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-6 shadow">
                        <h3 className="text-sm text-gray-600 mb-2">Daily Profit</h3>
                        <p className="text-3xl font-bold text-gray-800">
                            KSH {dashData?.daily_profit?.toLocaleString() || 0}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow">
                        <h3 className="text-sm text-gray-600 mb-2">Stock Depleted</h3>
                        <p className="text-3xl font-bold text-gray-800">
                            {dashData?.stock_depleted || 0} <span className="text-lg">Items</span>

                        </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-6 shadow border border-red-200">
                        <h3 className="text-sm text-red-700 mb-2">Low Stock Alert</h3>
                        <p className="text-3xl font-bond text-red-700">
                            {dashData?.low_stock_alerts?.length || 0} <span className="text-lg">Products</span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                        onClick = {() => {setShowAddStock(true)}}
                        className="bg-emerald-700 text-white py-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-emerald-800 transition"
                    >
                        <Plus className="w-5 h-5"/>
                        Add New Stock
                    </button>
                    
                    <button 
                    onClick={() => {setShowDepletion(true)}}
                    className="bg-orange-500 text-white py-6 rounded-lg font-semibold hover:bg-orange-600 transition">
                        Mark Stock Depleted
                    </button>
                    
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-orange-500"/>
                                <h2 className="text-lg font-bold">Low Stock Alert</h2>
                            </div>
                            <div className="space-y-3"> 
                                {dashData?.low_stock_alerts?.map((alert, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4"/>
                                            <span className="font-medium">{alert.product}</span>
                                        </div>
                                        <span className="text-red-600 font-semibold">{alert.remaining} Packs left</span>
                                    </div>
                                ))}
                                {(!dashData?.low_stock_alerts || dashData.low_stock_alerts.length === 0) && (
                                    <p className="text-gray-500 text-center py-4">No alerts</p>
                                )}
                            </div>
                        </div>


                        <div className="bg-white rounded-lg p-6 shadow">
                            <h2 className="text-lg font-bold mb-4">Quick Stats</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Fast movers</span>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {dashData?.fast_movers?.[0]?.product || 'N/A'}
                                        </div>
                                        <div className="text-sm font-gray-600">
                                            {dashData?.fast_movers?.[0]?.velocity.toFixed(1) || 0} units/days 
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Slow Movers</span>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {dashData?.slow_movers?.[0]?.product || 'N/A'}
                                        </div>
                                        <div className="text-sm text-red-600">
                                            {dashData?.slow_movers?.[0]?.velocity?.toFixed(1) || 0} units/days
                                        </div>
                                    </div>
                                </div>


                                <div className="bg-gray-100 rounded p-3 mt-4">
                                    <div className="text-sm text-gray-600">Income This Week</div>
                                    <div className="text-2xl font-bold">
                                        KSH { dashData?.income_this_week?.toLocaleString() || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow">
                            <h2 className="text-lg font-bold mb-4">Weekly Summary</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                {new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric'})} - {' '}
                                {new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US',{month: 'long', day: 'numeric'})}
                            </p>
                            <ResponsiveContainer>
                                <BarChart>
                                    <XAxis dataKey="day"/>
                                    <YAxis/>
                                    <Tooltip/>
                                    <Bar dataKey={"profit"} fill="#10b981"/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>


                    <div className="space-y-6">
                        <div className="bg-white rounded-lg p-6 shadow">
                            <h2 className="text-lg font-bold mb-4">Data Insights</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-600">Total Profit</span>
                                        <span className="font-bold text-xl">
                                            KSH {dashData?.total_profit_week?.toLocaleString() || 0}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Fast sellers</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {dashData?.fast_movers?.length > 0 ? (
                                            dashData.fast_movers.map((item, idx) => (
                                                <div key={idx} className="w-10 h-10 bg-emerald-100 rounded flex items-center justify-center text-xs font-bold text-emerald-700">{item.product?.charAt(0).toUpperCase()}</div>
                                            ))
                                        
                                        ) : (
                                            <p className="text-sm text-gray-500">No items yet</p>
                                        )}
            
                                    </div>
                                </div>

                                <div>
                                    <h3  className="text-sm font-semibold mb-2">Slow Sellers</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {dashData?.slow_movers?.length > 0 ? (
                                            dashData.slow_movers.map((item, idx) => (
                                                <div key={idx} className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center text-xs font-bold text-orange-700" title={item.product}>
                                                {item.product?.charAt(0).toUpperCase()}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500">No items yet</p>
                                        )}
                                    </div>
                                </div>


                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-600">Stock Turnover</span>
                                        <span className="font-semibold">
                                            Avg. {dashData?.avg_stock_turnover?.toFixed(1) || 0} days
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Profit Trend</h3>
                                    <ResponsiveContainer width="100%" height={100}>
                                        <BarChart data={dashData?.weekly_summary?.slice(-7) || []}>
                                            <Bar dataKey="profit" fill="#10b981"></Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <button className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition">View Full Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            { showAddStock && (
                <AddStockModal
                onClose={() => setShowAddStock(false)}
                onSuccess={() => {
                    setShowAddStock(false);
                    fetchDashboard();
                }}
                />
            )}

        {showDepletion && (
            <DepletionModal
            batch={selectedBatch}
            onClose={() => setShowDepletion(false)}
            onSuccess={() => {
                setShowDepletion(false);
                fetchDashboard();
            }}
            />
        )}
            
        </div>
    )
}

export default Dashboard