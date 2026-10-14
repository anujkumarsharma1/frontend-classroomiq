import { Modal } from './ui'
import { attentionTone } from '../utils/attention'

export default function ReportModal({ session, onClose }) {
  return (
    <Modal title={`Report for ${session.sessionCode}`} onClose={onClose}>
      <p className="muted" style={{ marginBottom: 20 }}>{[session.teacherName, session.className, session.subject].filter(Boolean).join(', ')}</p>
      <div className="grid g-4" style={{ gap: 12, marginBottom: 24 }}>
        {[['Students', session.summary?.totalStudents ?? 0], ['Avg attention', `${session.summary?.avgAttention ?? 0}%`], ['Length', `${session.summary?.durationMinutes ?? 0}m`], ['Alerts', session.summary?.totalAlerts ?? 0]].map(([l, v]) => (
          <div key={l} className="card tight flat"><div className="stat-value" style={{ fontSize: 'var(--t-xl)' }}>{v}</div><div className="stat-label xs">{l}</div></div>
        ))}
      </div>
      {session.students?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Avg attention</th><th>Warnings</th></tr></thead>
            <tbody>
              {session.students.map((s) => (
                <tr key={s.userId}>
                  <td><div style={{ fontWeight: 500 }}>{s.fullName}</div><div className="xs muted">{s.userId}</div></td>
                  <td><span className={`pill ${attentionTone(s.avgAttention || 0)} num`}>{s.avgAttention || 0}%</span></td>
                  <td className="num">{s.warningCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small muted">No students joined this session.</p>}
    </Modal>
  )
}
