import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { GROUPS, visibleItems } from "../../app/nav";
import { PageHead } from "../../components/ui";

/** Dashboard principal de un grupo: muestra sus sub-dashboards como tarjetas. */
export default function SectionHub() {
  const { id } = useParams();
  const { can } = useAuth();
  const group = GROUPS.find((g) => g.id === id);
  const items = group ? visibleItems(group, can) : [];
  if (!group || items.length === 0) return <Navigate to="/" replace />;

  return (
    <>
      <PageHead title={group.label} subtitle={group.desc} />
      <div className="hub-grid">
        {items.map((n) => (
          <Link key={n.to} to={n.to} className="hub-card">
            <span className="hub-ico" aria-hidden>
              {n.ico}
            </span>
            <div>
              <h3>{n.label}</h3>
              <p className="muted">{n.desc}</p>
            </div>
            <span className="hub-go" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
