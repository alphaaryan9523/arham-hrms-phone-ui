import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AppHeader({ title, subtitle, back = false, action }) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="app-header__row">
        {back ? (
          <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : null}
        <div className="app-header__text">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <div className="app-header__action">{action}</div> : null}
      </div>
    </header>
  );
}
