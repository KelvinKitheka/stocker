import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { TrendingUp, DollarSign, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import api from "../services/api";
import PageLoader from "../components/PageLoader";

const fmt = (n) => Number(n || 0).toLocaleString();

const fmtKSH = (n) => `KSH ${fmt(n)}`;

const KPI = ({label, value, sub, accent = false}) => (
    <div className={`rounded-xl p-5 border shadow-sm ${accent ? "bg-emerald-700 text-white border-emerald-600" : "bg-white border-gray-100"}`}>
        <p className={`text-xs uppercase tracking-wide mb-1 ${accent ? "text-emerald-200 ": "text-gray-500"}`}>{label}</p>
        <p className={`text-2xl font-bold ${accent ? "text-white" : "text-gray-900"}`}>{value}</p>
        { sub && <p className={`text-xs mt-1 ${accent ? "text-emerald-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
);

const Th = ({children, align = "right"}) => {
    const base = "px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide";
    const alignment = align === "left" ? "text-left" : "text-right";
    return <th className={`${alignment} ${base}`}>{children}</th>
}

const CustomToolTip = ({active, payload, label}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-700 font-semibold mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: KSH {Number(p.value).toLocaleString()}
                </p>
            ))}
        </div>
    )
}

const Reports = () => {
    const [summary, setSummary] = useState(null);
    const [byProduct, setByProduct] = useState([]);
    const [monthly, setMonthly] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyMeta, setHistoryMeta ] = useState({total: 0, total_pages: 1, page: 1});
    const [products, setProducts] = useState([]);
    const [filterProduct, setFilterProduct] = useState("");
    const [historyPage, setHistoryPage ] = useState(1);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);


const fetchAll = useCallback( async () => {
    setLoading(true);
    try {
        const [sumRes, byProdRes, monthlyRes, prodRes] = await Promise.all([
            api.get("/reports/"),
            api.get("/reports/by_product/"),
            api.get("/reports/monthly/"),
            api.get("/products/")
        ]);

    setSummary(sumRes.data);
    setByProduct(byProdRes.data);
    setMonthly(monthlyRes.data);
    setProducts(prodRes.data.results || prodRes.data)
    } catch (err){
        console.error("Reports fetch error", err)
    } finally {
        setLoading(false);
    }
}, [])

const fetchHistory = useCallback( async () => {
    try {
        const params ={page: historyPage, page_size: 20};
        if (filterProduct) params.product = filterProduct;
         const res = await api.get('/reports/history/', {params});

         setHistory(res.data.results);
         setHistoryMeta({
            total: res.data.total,
            total_pages: res.data.total_pages,
            page: res.data.page
         })
    } catch (err){
        console.error('History fetch error', err);
    }
}, [historyPage, filterProduct])

useEffect(() => {
    fetchAll();
}, [fetchAll])

useEffect(() => {
    if (activeTab === "history") fetchHistory();
}, [activeTab, fetchHistory, filterProduct])

if (loading) {
    return (
        <PageLoader message="Loading reports..."/>
    )
}

return (
    <div className="min-h-screen bg-gray-50 md:ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4 pl-14 md:pl-6 sticky top-0 z-10">
            <h1 className="font-bold text-xl text-gray-900">Reports</h1>
            <p className="text-xs text-gray-500 mt-0.5">Financial performance across all your stock</p>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            { summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPI
                    label = "Total Revenue"
                    value = {fmtKSH(summary.total_revenue)}
                    sub = "From all depleted Stock"
                    accent
                    />

                    <KPI
                    label = "Total Cost"
                    value = {fmtKSH(summary.total_cost)}
                    sub = "Amount spent buying stock"
                    />

                    <KPI
                    label="Total Profit"
                    value={fmtKSH(summary.total_profit)}
                    sub={`${summary.overall_margin}% overall margin`}
                    />

                    <KPI
                    label="Stock Available"
                    value={fmtKSH(summary.active_stock_value)}
                    sub={`${summary.active_batches} active batches`}
                    />
                </div>
            )}

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                {['overview', 'history'].map((t) => (
                    <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition capitalize ${
                        activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            { activeTab === "overview" && (
                <>
                {monthly.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Monthly Performance</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={monthly} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                                <XAxis dataKey="month" tick={{ fontSize: 11}}/>
                                <YAxis tick={{ fontSize: 11}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                                <Tooltip content={<CustomToolTip />}/>
                                <Legend wrapperStyle={{ fontSize: 12 }}/>
                                <Bar dataKey="revenue" name="Revenue" fill="#d1fae5" radius={[3, 3, 0, 0]}/>
                                <Bar dataKey="cost" name="Cost" fill="#fde68a" radius={[3, 3, 0, 0]}/>
                                <Bar dataKey="profit" name="Profit" fill="#059669" radius={[3, 3, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {byProduct.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h2 className="text-base font-semibold text-gray-900">
                                Profit by Product
                            </h2>
                        </div>
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <Th align="left">Product</Th>
                                        <Th>Revenue</Th>
                                        <Th>Cost</Th>
                                        <Th>Profit</Th>
                                        <Th>Margin</Th>
                                        <Th>Units sold</Th>
                                        <Th>Batches</Th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-50">
                                    {byProduct.map((row) => (
                                        <tr key={row.product_id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {row.product}
                                                </div>
                                                <span className="text-xs text-gray-400 capitalize">
                                                    {row.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">{fmtKSH(row.revenue)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{fmtKSH(row.cost)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtKSH(row.profit)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-xs font-medium px-2 py-0.5 
                                                    rounded-full ${
                                                        row.margin >= 20 ? "bg-emerald-100 text-emerald-700"
                                                        : row.margin >= 10 ? "bg-amber-100 text-amber-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {Number(row.margin).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">{fmt(row.units_sold)}</td>
                                            <td className="px-4 py-3 text-right text-gray-400">{row.batches_sold}</td>
                                                
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {byProduct.length === 0 && monthly.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
                        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                        <p className="text-sm">No completed sales yet</p>
                        <p className="text-xs mt-1">Reports will appear once stock is depleted</p>
                    </div>
                )}
                </>
            )}

            {activeTab === "history" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <h2 className="text-base font-semibold text-gray-900 flex-1">Depleted Batch History</h2>
                        <div className="relative">
                            <select
                            value = {filterProduct}
                            onChange={(e) => {setFilterProduct(e.target.value); setHistoryPage(1); }}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg outline-none bg-white text-gray-700"
                            >
                                <option value="">All Products</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none"/>
                        </div>
                        <span className="text-xs text-gray-400">{historyMeta.total} records</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="p-16 text-center text-gray-400">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                            <p>No depleted batches yet</p>
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <Th>Product</Th>
                                        <Th>Qty Sold</Th>
                                        <Th>Revenue</Th>
                                        <Th>Cost</Th>
                                        <Th>Profit</Th>
                                        <Th>Margin</Th>
                                        <Th>Days</Th>
                                        <Th>Depleted</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{row.product}</div>
                                                <span className="text-xs text-gray-400 capitalize">{row.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">{fmt(row.sold)}</td>
                                            <td className="px-4 py-3 text-right text-gray-700">{fmtKSH(row.revenue)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{fmtKSH(row.cost)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtKSH(row.profit)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-xs font-medium px-2 py-0.5
                                                    rounded-full ${
                                                        row.margin >= 20
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : row.margin >= 10
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {row.margin.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500">{row.days_in_stock}d</td>
                                            <td className="px-4 py-3 text-right text-xs text-gray-400">
                                                {new Date(row.depleted_at).toLocaleDateString("en-GB", {
                                                    day: "numeric", month: "short", year: "numeric",
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {historyMeta.total_pages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                                <span>
                                    Page {historyMeta.page} of {historyMeta.total_pages}
                                </span>
                                <div>
                                    <button
                                    disabled = {historyPage === 1}
                                    onClick={() => setHistoryPage((p) => p-1)}
                                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                                    >
                                        <ChevronLeft/>
                                    </button>
                                    <button
                                    disabled = {historyPage >= historyMeta.total_pages}
                                    onClick={() => setHistoryPage((p) => p+1)}
                                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                                    >
                                        <ChevronRight/>
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            )}
        </div>
    </div>
)
}

export default Reports;