// ui/src/components/ChatLineChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'A', value: 40 },
    { name: 'B', value: 30 },
    { name: 'C', value: 20 },
    { name: 'D', value: 27 },
    { name: 'E', value: 18 },
    { name: 'F', value: 23 },
    { name: 'G', value: 34 },
];

export default function ChatLineChart() {
    return (
        <div style={{ width: '100%', height: 180, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#aaa" />
                    <YAxis stroke="#aaa" />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#60c0ff" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}