import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// Adjusted colors to be slightly more vibrant and match a common sentiment theme
const COLORS = ['#10b981', '#f59e0b', '#ef4444'] // Green, Amber, Red

export default function DonutChart({positive=0, neutral=0, negative=0}){
    const data = [ 
        {name:'Positive', value: positive}, 
        {name:'Neutral', value: neutral}, 
        {name:'Negative', value: negative} 
    ]
    const total = positive + neutral + negative;
    
    // Calculate percentages for the legend
    const percentage = (value) => {
        // Handle division by zero for an empty chart
        if (total === 0) return '0%';
        return Math.round((value / total) * 100) + '%'
    }
    
    return (
        // ⚠️ Updated to white background, rounded-xl, shadow-md, and lighter border
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 h-64 flex flex-col">
            <h4 className="text-lg font-semibold mb-3 text-gray-800">Sentiment Distribution</h4>
            
            <div className="flex-1 flex items-center justify-center">
                {/* Chart Section */}
                <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={data} 
                                dataKey="value" 
                                innerRadius={50} 
                                outerRadius={80} 
                                paddingAngle={2}
                            >
                                {data.map((entry, index)=>(
                                    <Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Legend Section (Updated text colors) */}
                <div className="w-1/2 p-2 space-y-2">
                    {data.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS[index]}}></span>
                                {/* ⚠️ Darker text for light background */}
                                <span className="text-gray-700">{entry.name}</span>
                            </div>
                            {/* ⚠️ Darker, more prominent percentage text */}
                            <span className="font-semibold text-gray-800">
                                {percentage(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}