import React, {useState, useEffect, useCallback} from "react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Cell,
    BarChart
} from "recharts";
import { 
    Zap, TrendingDown, AlertTriangle, Archive, Clock, Package
} from "lucide-react";
import api from "../services/api";

const fmt = (n) => Number(n || 0).toLocaleString();

const VelocityBar = ({value, max}) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const color = 
    pct > 66 ? "bg-emerald-500" : pct > 33 ? "bg-amber-400" : "bg-red-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">{value} units/day</span>
        </div>
    );
};

const SectionCard = ({title, icon:Icon, iconColor = "text-gray-500", children, empty, emptyText}) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={`px-5 py-4 border-b border-gray-50 flex items-center gap-2`}>
            <Icon className={`w-4 h-4 ${iconColor}`}/>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        {empty ? (
            <div className="px-5 py-10 text-center text-gray-400">
                <p className="text-sm">{emptyText || "No data yet"}</p>
            </div>
        ) : (
            <div className="p-5">{children}</div>
        )}
    </div>
);

const CustomTooltip = ({active, payload, label }) => {
    if(!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
            <p className="font-semibold text-gray-700">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    KSH {Number(p.value).toLocaleString()}
                </p>
            ))}
        </div>
    );
};

const CATEGORY_PALETTE = [
    "#059669", "#0284c7", "#d97706", "#9333ea", "#e11d48", "#0891b2",
]


const Insights = () => {
    const [data, setData] = useState(null);
    const [velocity, setVelocity] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback( async () => {
        setLoading(true);
        try {
            const [insRes, velRes] = await Promise.all([
                api.get("/insights/"),
                api.get("/insights/velocity/"),
            ]);

            setData(insRes.data)
            setVelocity(velRes.data);
        } catch (err){
            console.error("Insights fetch error", err);
        } finally{
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if(loading){
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-sm text-gray-500">Analysing your stock...</p>
                </div>
            </div>
        );
    }

    const maxVelocity = velocity.length 
    ? Math.max(...velocity.map((v) => v.avg_velocity))
    : 1;

    const categoryData = (data?.category_breakdown || []).map((c, i) => ({
        ...c,
        fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));

    const radarData = velocity.slice(0,6).map((v) => ({
        product: v.product.length > 10 ? v.product.slice(0, 10) + "..." : v.product,
        velocity: v.avg_velocity,
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky px-6 py-4 top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Insights</h1>
                <p className="text-xs text-gray-500 mt-0.5">Velocity, stock health, and category performance</p>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Products</p>
                            <p className="text-2xl font-bold text-gray-900">{data.total_products}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Batches</p>
                            <p className="text-2xl font-bold text-gray-900">{data.total_active_batches}</p>
                        </div>
                        <div
                        className={`rounded-xl border shadow-sm p-5 ${
                                data.low_stock_alerts.length > 0 
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-gray-100"
                        }`}
                        >
                            <p className={`text-xs uppercase tracking-wide mb-1 ${
                            data.low_stock_alerts.length > 0 ? "text-red-600" : "text-gray-500"}`}>
                                Low Stock alerts
                            </p>
                            <p className={`text-xl font-bold ${
                                data.low_stock_alerts.length > 0 ? "text-red-700" : "text-gray-900"
                            }`}>{data.low_stock_alerts.length}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard
                    title="Fast Movers"
                    icon = {Zap}
                    iconColor="text-emerald-700"
                    empty = {!data?.fast_movers?.length}
                    emptyText="No depleted batches to compute velocity yet"
                    >
                        <div className="space-y-3">
                            {data?.fast_movers?.map((item, i) => (
                                <div key={item.product_id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 ">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 
                                            text-xs font-bold flex items-center justify-center">
                                                {i+1}
                                            </span>
                                            <span className="text-sm font-medium text-gray-800">
                                                {item.product_name}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            avg {item.avg_turnover_days}d turnover
                                        </span>
                                    </div>
                                    <VelocityBar value={item.avg_velocity} max={maxVelocity}/>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                       
                    <SectionCard
                    title="Slow Movers"
                    icon={TrendingDown}
                    iconColor="text-orange-500"
                    empty={!data?.slow_movers?.length}
                    emptyText="Not enough data yet"
                    >
                        <div className="space-y-3">
                            {data?.slow_movers?.map((item, i) => (
                                <div key={item.product_id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-orange-100 
                                            text-orange-700 text-xs font-bold flex justify-center">{i + 1}</span>
                                            <span className="text-sm font-medium text-gray-800">{item.product_name}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">avg {item.avg_turnover_days}d turnover</span>
                                    </div>
                                    <VelocityBar value={item.avg_velocity} max={maxVelocity}/>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard
                    title="Stock Velocity - days untill empty"
                    icon={Clock}
                    iconColor="text-blue-500"
                    empty={velocity.length === 0}
                    emptyText="Add stock and record depletions to see velocity"
                    >

                        <div className="space-y-2">
                            {velocity.map((v) => {
                                const urgent = v.days_until_empty !== null && v.days_until_empty <= 7;
                                const warning = v.days_until_empty !== null && v.days_until_empty <= 14;

                                return (
                                    <div key={v.product_id}>
                                        <div
                                        className={`flex items-center justify-between p-2.5 rounded-lg
                                            ${
                                                urgent
                                                ? "bg-red-50 border border-red-100"
                                                : warning
                                                ? "bg-amber-50 border border-amber-100"
                                                : "bg-gray-50"
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-gray-800">{v.product}</p>
                                            <p className="text-xs text-gray-400 capitalize">{v.category}</p>
                                        </div>
                                        <div className="text-right">
                                            {v.days_until_empty !== null ? (
                                                <p
                                                className={`text-sm font-semibold ${
                                                    urgent ? "text-red-600" : warning ? "text-amber-600"
                                                    : "text-gray-700"
                                                }`}
                                                > ~{v.days_until_empty}d left</p>
                                            ) : (
                                                <p className="text-xs text-gray-400">No velocity data</p>
                                            )}
                                            <p className="text-xs text-gray-400">{fmt(v.current_stock)} units</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </SectionCard>

                    <SectionCard
                    title="Low Stock Alerts"
                    icon={AlertTriangle}
                    iconColor="text-red-500"
                    empty={!data?.low_stock_alerts?.length}
                    emptyText="All products are well stocked"
                    >
                        <div className="space-y-3">
                            {data?.low_stock_alerts?.map((alert, i) => (
                                <div key={alert.product_id}
                                className={`flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-red-400"/>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{alert.product}</p>
                                            <p className="text-xs text-gray-400">Threshold {fmt(alert.threshold)} units</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">{fmt(alert.current_stock)}</p>
                                        <p className="text-xs text-red-400">{alert.pct_remaining}% of threshold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {categoryData.length > 0 && (
                        <SectionCard title="Profit by category" icon={Package} iconColor="text-purple-500">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={categoryData} layout="vertical" margin={{ left:8 }}>
                                    <XAxis
                                    type="number"
                                    tick = {{ fontSize: 11}}
                                    tickFormatter = {(v) => `${( v / 1000 ).toFixed(0)}k`}
                                    />

                                    <YAxis
                                    dataKey="category"
                                    type="category"
                                    tick = {{ fontSize:12 }}
                                    width = {80}
                                    />
                                    <Tooltip content={<CustomTooltip/>}/>
                                    <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                                        {categoryData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill}/>
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </SectionCard>
                    )}

                    {radarData.length >= 3 && (
                        <SectionCard title="Velocity overview" icon={Zap} iconColor="text-blue-500">
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="product" tick= {{ fontSize: 11 }}/>
                                <Radar
                                dataKey="velocity"
                                stroke="#059669"
                                fill="#059669"
                                fillOpacity={0.2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                        </SectionCard>
                    )}

                    {data?.stale_stock?.length > 0 && (
                        <SectionCard
                        title="Stale_stock - Sitting 30+ days"
                        icon={Archive}
                        iconColor="text-gray-400"
                        >
                            <div className="space-y-2">
                                {data.stale_stock.map((s, i) => (
                                    <div key={s.product_id || i}
                                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{s.product}</p>
                                            <p className="text-xs text-gray-400">Added {s.added_at}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-500">{fmt(s.remaining)}</p>
                                            <p className="text-xs text-gray-400">{s.days_in_stock}</p>
                                        </div>
                                    </div>
                                )
                                   
                                )}
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>
        </div>
    )

}

export default Insights