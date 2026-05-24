import { useState, useEffect } from "react";
import {
  Table,
  Spinner,
  Alert,
  Card,
  Badge,
  Pagination,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaHistory, FaUser, FaClock, FaShieldAlt, FaGlobe } from "react-icons/fa";
import API from "../../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    fetchAuditLogs(1);
  }, []);

  const fetchAuditLogs = async (page) => {
    try {
      setLoading(true);
      const response = await API.get(`/admin/audit-logs?page=${page}&limit=20`);
      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
      setError(null);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError(err.response?.data?.message || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const style = { borderRadius: '8px', padding: '5px 10px', fontWeight: '500' };
    if (action?.includes("approve")) return <Badge bg="success" style={style}>{action}</Badge>;
    if (action?.includes("reject")) return <Badge bg="danger" style={style}>{action}</Badge>;
    if (action?.includes("block")) return <Badge bg="warning" style={style}>{action}</Badge>;
    if (action?.includes("delete")) return <Badge bg="danger" style={style}>{action}</Badge>;
    return <Badge bg="info" style={style}>{action}</Badge>;
  };

  const formatDetails = (details) => {
    if (!details || typeof details !== "object") return "—";
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading audit logs...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <style>{`
        .audit-logs-section .audit-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .audit-logs-section .audit-header {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 20px 24px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .audit-logs-section .audit-header h4 {
          margin: 0;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .audit-logs-section .audit-header .total-badge {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .audit-table thead th {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 14px 12px;
        }
        .audit-table tbody td {
          padding: 14px 12px;
          vertical-align: middle;
          border-color: #f1f5f9;
          font-size: 0.9rem;
        }
        .audit-table tbody tr {
          transition: all 0.2s ease;
        }
        .audit-table tbody tr:hover {
          background: #f8fafc;
        }
        .audit-table .ip-code {
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #475569;
          font-family: monospace;
        }
        .audit-table .target-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .audit-table .target-type {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .audit-table .target-id {
          font-weight: 600;
          color: #1e293b;
        }
        .audit-pagination .page-link {
          border-radius: 8px;
          margin: 0 3px;
          border: none;
          color: #475569;
          font-weight: 500;
        }
        .audit-pagination .page-item.active .page-link {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .audit-pagination .page-link:hover {
          background: #f1f5f9;
          color: #6366f1;
        }

        /* Dark Mode */
        body.dark-mode .audit-logs-section .audit-card {
          background: #16213e;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        body.dark-mode .audit-logs-section .audit-header {
          background: #1e293b;
          border-color: #374151;
        }
        body.dark-mode .audit-logs-section .audit-header h4 {
          color: #f1f5f9;
        }
        body.dark-mode .audit-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #374151;
        }
        body.dark-mode .audit-table tbody td {
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .audit-table tbody tr:hover {
          background: #334155;
        }
        body.dark-mode .audit-table .ip-code {
          background: #334155;
          color: #cbd5e1;
        }
        body.dark-mode .audit-table .target-type {
          color: #64748b;
        }
        body.dark-mode .audit-table .target-id {
          color: #e2e8f0;
        }
        body.dark-mode .audit-pagination .page-link {
          background: #1e293b;
          color: #cbd5e1;
        }
        body.dark-mode .audit-pagination .page-link:hover {
          background: #334155;
          color: #818cf8;
        }
      `}</style>

      <motion.div
        className="audit-logs-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="audit-card">
          <div className="audit-header">
            <h4>
              <FaShieldAlt className="text-primary" />
              Audit Logs
            </h4>
            <span className="total-badge">
              {pagination.totalItems} total actions
            </span>
          </div>
          <Card.Body className="p-4">
            <div className="table-responsive">
              <Table hover className="audit-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP Address</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <FaHistory size={30} className="mb-2 d-block mx-auto" style={{ opacity: 0.3 }} />
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td><strong>#{log.id}</strong></td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {(log.admin?.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="fw-semibold">{log.admin?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td>{getActionBadge(log.action)}</td>
                        <td>
                          <div className="target-info">
                            <span className="target-type">{log.targetType}</span>
                            <span className="target-id">#{log.targetId}</span>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">{formatDetails(log.details)}</small>
                        </td>
                        <td>
                          <span className="ip-code">
                            <FaGlobe className="me-1" style={{ fontSize: '10px' }} />
                            {log.ipAddress || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1 text-muted">
                            <FaClock style={{ fontSize: '12px' }} />
                            <small>{new Date(log.createdAt).toLocaleString()}</small>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination className="audit-pagination">
                  <Pagination.First
                    disabled={pagination.currentPage === 1}
                    onClick={() => fetchAuditLogs(1)}
                  />
                  <Pagination.Prev
                    disabled={pagination.currentPage === 1}
                    onClick={() => fetchAuditLogs(pagination.currentPage - 1)}
                  />
                  {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                    const startPage = Math.max(1, pagination.currentPage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > pagination.totalPages) return null;
                    return (
                      <Pagination.Item
                        key={pageNum}
                        active={pageNum === pagination.currentPage}
                        onClick={() => fetchAuditLogs(pageNum)}
                      >
                        {pageNum}
                      </Pagination.Item>
                    );
                  })}
                  <Pagination.Next
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => fetchAuditLogs(pagination.currentPage + 1)}
                  />
                  <Pagination.Last
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => fetchAuditLogs(pagination.totalPages)}
                  />
                </Pagination>
              </div>
            )}
          </Card.Body>
        </Card>
      </motion.div>
    </>
  );
}
