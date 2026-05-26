import { Link } from 'react-router-dom';

export default function QuickActionCard({ to, icon: Icon, label, caption }) {
  return (
    <Link className="quick-action-card" to={to}>
      <span className="quick-action-card__icon">{Icon ? <Icon size={20} strokeWidth={1.75} /> : null}</span>
      <span>
        <strong>{label}</strong>
        {caption ? <small>{caption}</small> : null}
      </span>
    </Link>
  );
}
