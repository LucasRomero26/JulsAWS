import { useEffect, useState } from 'react';
import { config } from '../config/appConfig';

// Si prefieres, puedes mover esto a appConfig
const S3_REPORTS_BASE_URL =
    'https://container-reports-9584.s3.us-east-2.amazonaws.com';

function ReportsView() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);

    const fetchReports = async (date) => {
        try {
            setLoading(true);
            setError(null);

            let url = `${config.API_BASE_URL}/api/reports`;
            if (date) {
                url += `?date=${date}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setReports(data.reports || []);

            // Seleccionar el último reporte por defecto
            if (data.reports && data.reports.length > 0) {
                setSelectedReport(data.reports[0]);
            } else {
                setSelectedReport(null);
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(err.message || 'Error fetching reports');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            if (!selectedDate) {
                alert('Selecciona una fecha (YYYY-MM-DD) antes de generar el reporte.');
                return;
            }

            const isValid = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate);
            if (!isValid) {
                alert('Formato de fecha inválido. Usa YYYY-MM-DD, por ejemplo 2025-11-11.');
                return;
            }

            const res = await fetch(`${config.API_BASE_URL}/api/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date: selectedDate }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Error generating manual report:', errData);
                alert('Error generando el reporte manual. Revisa los logs del servidor.');
                return;
            }

            const data = await res.json();
            console.log('Manual report response:', data);
            alert('Reporte manual generado correctamente.');

            // Después de generar, recargamos la lista de reports
            await fetchReports(selectedDate || undefined);
        } catch (err) {
            console.error('Exception generating manual report:', err);
            alert('Ocurrió un error inesperado generando el reporte.');
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleDateChange = (e) => {
        const value = e.target.value; // YYYY-MM-DD
        setSelectedDate(value);
        fetchReports(value || undefined);
    };

    const getReportUrl = (report) => {
        // Primero usamos la URL firmada que viene del backend
        if (report.signedUrl) {
            return report.signedUrl;
        }
        // Fallback por si acaso
        return `${S3_REPORTS_BASE_URL}/${report.key}`;
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="glassmorphism-strong rounded-3xl p-8 text-center max-w-md">
                    <svg
                        className="w-16 h-16 text-red-500 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <p className="text-white/70 mb-4">{error}</p>
                    <button
                        onClick={() => fetchReports(selectedDate || undefined)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header Card */}
            <div className="glassmorphism-strong rounded-3xl p-6 mb-6 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span>📄 Daily Reports</span>
                        </h2>
                        <p className="text-white/60 mt-1">
                            View and download the daily container detection reports generated
                            by the system.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <label className="text-xs text-white/50 mb-1">
                                Filter by date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <button
                            onClick={() => fetchReports(selectedDate || undefined)}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300"
                            title="Refresh reports"
                        >
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m0 0A8.001 8.001 0 0112 4a8 8 0 017.418 5.01M20 20v-5h-.581m0 0A8.001 8.001 0 0112 20a8 8 0 01-7.418-5.01"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout: lista + preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table Card */}
                <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            Available Reports
                        </h3>
                        <span className="text-xs text-white/50">
                            Total: {reports.length}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                                        File
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-white/10">
                                {reports.map((report) => (
                                    <tr
                                        key={report.key}
                                        className={`hover:bg-white/5 cursor-pointer ${selectedReport?.key === report.key
                                                ? 'bg-cyan-600/10'
                                                : ''
                                            }`}
                                        onClick={() => setSelectedReport(report)}
                                    >
                                        <td className="px-4 py-3 text-sm text-white/80">
                                            {report.parsedDate || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white/80">
                                            {report.fileName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(getReportUrl(report), '_blank');
                                                }}
                                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs text-white rounded-lg"
                                            >
                                                View
                                            </button>
                                            <a
                                                href={getReportUrl(report)}
                                                download={report.fileName}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-xs text-white rounded-lg"
                                            >
                                                Download
                                            </a>
                                        </td>
                                    </tr>
                                ))}

                                {reports.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-6 text-center text-sm text-white/60"
                                        >
                                            No reports found for the selected date.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Preview Card */}
                <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            Report Preview
                        </h3>
                        {selectedReport && (
                            <span className="text-xs text-white/50">
                                {selectedReport.parsedDate}
                            </span>
                        )}
                    </div>
                    <div className="p-4 h-[480px]">
                        {selectedReport ? (
                            <iframe
                                key={selectedReport.key}
                                src={getReportUrl(selectedReport)}
                                title={selectedReport.fileName}
                                className="w-full h-full rounded-2xl border border-white/10 bg-black/40"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-white/60">
                                Select a report to preview
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportsView;