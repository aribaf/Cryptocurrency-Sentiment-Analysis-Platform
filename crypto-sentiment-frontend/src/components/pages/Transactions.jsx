// src/pages/Transactions.jsx
import React from 'react'

const dummyTransactions = [
    { type: 'Bitcoin', amount: '245.89 BTC', value: '$14,324,567', from: '0x1a2b...', to: '0x5e6f...', time: '10 minutes ago', direction: 'up' },
    { type: 'Ethereum', amount: '1,245.56 ETH', value: '$3,245,678', from: '0x9l8i...', to: '0x5m4n...', time: '25 minutes ago', direction: 'down' },
    { type: 'USDT', amount: '5,000,000 USDT', value: '$5,000,000', from: '0x9vr2...', to: '0x5w6v...', time: '45 minutes ago', direction: 'up' },
    { type: 'Bitcoin', amount: '100.00 BTC', value: '$5,827,000', from: '0x3g4r...', to: '0x8t7y...', time: '1 hour ago', direction: 'up' },
]

const TransactionTable = () => (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Large Transactions</h4>
        <p className="text-sm text-gray-500 mb-4">Monitoring significant blockchain movements</p>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {['Type', 'Amount', 'Value', 'From', 'To', 'Time', 'Actions'].map(header => (
                            <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dummyTransactions.map((tx, index) => (
                        <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <span className={`mr-2 ${tx.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                    {tx.direction === 'up' ? '↑' : '↓'}
                                </span>
                                {tx.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.amount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer">{tx.from.slice(0, 6) + '...'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer">{tx.to.slice(0, 6) + '...'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.time}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer">
                                <span className="text-blue-500">🔗</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)

export default function Transactions(){
    // Placeholder for Recent Sentiment List (reused from Dashboard)
    const RecentSentiments = () => (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h4 className="text-lg font-semibold mb-3">Recent Sentiments</h4>
                {/* Simplified list placeholder for this view */}
                <ul className="space-y-4">
                    <li className="text-sm border-b pb-2">Bitcoin: Strong support... <span className="text-green-500">(+78.5)</span></li>
                    <li className="text-sm border-b pb-2">Ethereum: ETH gas fees... <span className="text-red-500">(-42.3)</span></li>
                    <li className="text-sm border-b pb-2">Bitcoin: Major investor... <span className="text-green-500">(+65.7)</span></li>
                </ul>
            </div>
        </div>
    )

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
                <button className="text-sm px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                    Export Data
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area (Chart and Table) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Placeholder Chart Area */}
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 h-52 flex items-center justify-center text-gray-400">
                        Transaction Trend Chart Placeholder
                    </div>
                    {/* Transaction Table */}
                    <TransactionTable />
                </div>
                
                {/* Recent Sentiments Sidebar */}
                <div className="lg:col-span-1">
                    <RecentSentiments />
                </div>
            </div>
        </div>
    )
}