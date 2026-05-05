import React, { useState } from 'react';
import api from '../api/axiosInstance';

// Matches the JSON structure from our DebugController
interface DIReport {
    requestId: string;
    transient: { id: string; description: string };
    scoped: { id: string; description: string };
    singleton: { id: string; description: string };
}

const DIDiagnostics: React.FC = () => {
    const [report, setReport] = useState<DIReport | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            // Hits the GET /api/debug/di endpoint
            const res = await api.get<DIReport>('/debug/di');
            setReport(res.data);
        } catch (err) {
            console.error("Diagnostic API Error. Ensure DebugController is active.", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Backend DI Lifetime Monitor</h3>
                <button
                    onClick={fetchDiagnostics}
                    disabled={loading}
                    style={buttonStyle}
                >
                    {loading ? 'Fetching...' : 'Refresh Instance IDs'}
                </button>
            </div>

            {report && (
                <div style={gridStyle}>
                    <div style={cardStyle}>
                        <span style={badgeStyle(false)}>Transient</span>
                        <p style={descStyle}>{report.transient.description}</p>
                        <code style={codeStyle}>{report.transient.id}</code>
                    </div>

                    <div style={cardStyle}>
                        <span style={badgeStyle(true)}>Scoped</span>
                        <p style={descStyle}>{report.scoped.description}</p>
                        <code style={codeStyle}>{report.scoped.id}</code>
                    </div>

                    <div style={cardStyle}>
                        <span style={{ ...badgeStyle(false), backgroundColor: '#6f42c1' }}>Singleton</span>
                        <p style={descStyle}>{report.singleton.description}</p>
                        <code style={codeStyle}>{report.singleton.id}</code>
                    </div>
                </div>
            )}

            {report && (
                <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                    Current Request Trace ID: {report.requestId}
                </p>
            )}
        </div>
    );
};

// --- Styles ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#fff', borderTop: '2px solid #007bff', marginTop: 'auto' };
const gridStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginTop: '20px' };
const cardStyle: React.CSSProperties = { flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fcfcfc' };
const badgeStyle = (isScoped: boolean): React.CSSProperties => ({
    padding: '4px 8px', borderRadius: '4px', backgroundColor: isScoped ? '#28a745' : '#007bff', color: 'white', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'
});
const descStyle: React.CSSProperties = { fontSize: '12px', color: '#666', margin: '8px 0' };
const codeStyle: React.CSSProperties = { display: 'block', fontSize: '10px', backgroundColor: '#e9ecef', padding: '5px', borderRadius: '4px', wordBreak: 'break-all' };
const buttonStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };

export default DIDiagnostics;