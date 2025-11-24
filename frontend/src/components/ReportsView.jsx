import { useEffect, useState } from 'react';
import { config } from '../config/appConfig';

// Fallback por si algún reporte no trae signedUrl
const S3_REPORTS_BASE_URL =
  'https://container-reports-9584.s3.us-east-2.amazonaws.com';

function ReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      const list = data.reports || [];
      setReports(list);

      if (list.length > 0) {
        setSelectedReport(list[0]);
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

  // 🔹 NUEVO: función para generar reporte manual
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

      setIsGenerating(true);

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

      // Después de generar, recargamos la lista (filtrando por esa fecha)
      await fetchReports(selectedDate || undefined);
    } catch (err) {
      console.error('Exception generating manual report:', err);
      alert('Ocurrió un error inesperado generando el reporte.');
    } finally {
      setIsGenerating(false);
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
    if (report.signedUrl) return report.signedUrl;
    return `${S3_REPORTS_BASE_URL}/${report.key}`;
  };

  const handleDownload = (report) => {
    try {
      const url = getReportUrl(report);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = report.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Removed alert to avoid false positives
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-cyan-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLine cap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <p className="text-white/60 text-sm animate-pulse">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="glassmorphism-strong rounded-3xl p-8 text-center max-w-md border-l-4 border-red-500">
          <div className="relative inline-block mb-4">
            <svg
              className="w-16 h-16 text-red-500 mx-auto"
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
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-white/70 mb-6 text-sm">{error}</p>
          <button
            onClick={() => fetchReports(selectedDate || undefined)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-0.5"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Header Card with Gradient Accent */}
      <div className="relative glassmorphism-strong rounded-3xl p-6 mb-6 shadow-lg overflow-hidden group">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>

        {/* Floating background decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl backdrop-blur-sm border border-cyan-500/30">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  Daily Reports
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  {reports.length} Available
                </span>
              </h2>
              <p className="text-white/60 mt-1 text-sm">
                View, generate and download the daily container detection reports
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
            <div className="flex flex-col group/date">
              <label className="text-xs text-white/50 mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Filter / generate by date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 hover:bg-white/10"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReports(selectedDate || undefined)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm text-white hover:shadow-lg hover:shadow-white/10 transform hover:-translate-y-0.5 active:translate-y-0"
                title="Refresh reports"
              >
                <svg
                  className="w-4 h-4 transition-transform duration-300 hover:rotate-180"
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
                Refresh
              </button>

              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="relative px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {isGenerating ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m0 0A8.001 8.001 0 0112 4a8 8 0 017.418 5.01M20 20v-5h-.581m0 0A8.001 8.001 0 0112 20a8 8 0 01-7.418-5.01" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                )}
                <span className="relative z-10">{isGenerating ? 'Generating...' : 'Generate report'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout: lista + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Card */}
        <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300">
          <div className="px-6 py-4 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Available Reports
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '580px' }}>
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Date
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      File
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/5">
                {reports.map((report, index) => (
                  <tr
                    key={report.key}
                    className={`transition-all duration-200 cursor-pointer border-l-2 ${selectedReport?.key === report.key
                        ? 'bg-gradient-to-r from-cyan-600/20 to-transparent border-l-cyan-500'
                        : 'hover:bg-white/5 border-l-transparent hover:border-l-white/30'
                      }`}
                    onClick={() => setSelectedReport(report)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedReport?.key === report.key ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`}></div>
                        <span className="text-white/90 font-medium">{report.parsedDate || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-white/80 truncate max-w-[200px]" title={report.fileName}>
                          {report.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getReportUrl(report), '_blank');
                          }}
                          className="group/btn px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 hover:shadow-lg hover:shadow-white/10 transform hover:-translate-y-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(report);
                          }}
                          className="group/btn px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-xs text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-white/5 rounded-2xl">
                          <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white/60 font-medium">No reports found</p>
                          <p className="text-white/40 text-sm mt-1">Try selecting a different date or generate a new report</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview Card */}
        <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300">
          <div className="px-6 py-4 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Report Preview
              </h3>
            </div>
            {selectedReport && (
              <span className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {selectedReport.parsedDate}
              </span>
            )}
          </div>
          <div className="p-4 h-[580px] relative">
            {selectedReport ? (
              <div className="relative h-full group/preview">
                <iframe
                  key={selectedReport.key}
                  src={getReportUrl(selectedReport)}
                  title={selectedReport.fileName}
                  className="w-full h-full rounded-2xl border border-white/10 bg-black/40 shadow-inner transition-all duration-300"
                />
                {/* Floating download button on hover */}
                <button
                  onClick={() => handleDownload(selectedReport)}
                  className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 opacity-0 group-hover/preview:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/preview:translate-y-0 flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="p-6 bg-white/5 rounded-3xl">
                  <svg className="w-20 h-20 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white/60 font-medium">No report selected</p>
                  <p className="text-white/40 text-sm mt-1">Click on a report from the list to preview it here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsView;