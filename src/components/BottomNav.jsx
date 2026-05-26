import { CalendarCheck, Home, Receipt, UserRound, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { label: 'Home', path: '/dashboard', icon: Home },
  { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
  { label: 'Leave', path: '/leave', icon: WalletCards },
  { label: 'Reimburse', path: '/reimbursements', icon: Receipt },
  { label: 'Profile', path: '/profile', icon: UserRound }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.path} to={item.path} className="bottom-nav__item">
            <Icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
