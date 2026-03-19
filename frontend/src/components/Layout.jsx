import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search, FileText, PieChart } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: <HomeIcon size={20} /> },
    { name: 'Analyzer', path: '/analyzer', icon: <Search size={20} /> },
    { name: 'Builder', path: '/builder', icon: <FileText size={20} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <PieChart size={20} /> },
  ];

  return (
    <div className="app-container">
      <nav className="sidebar glass-panel">
        <div className="logo-container">
          <h2>Resume<span className="text-secondary">AI</span></h2>
        </div>
        
        <ul className="nav-links">
          {navItems.map((item) => (
             <li key={item.path}>
               <Link 
                 to={item.path} 
                 className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
               >
                 {item.icon}
                 <span>{item.name}</span>
               </Link>
             </li>
          ))}
        </ul>

        <div className="sidebar-footer">
           <div className="user-profile">
             <div className="avatar">A</div>
             <div>
               <div className="user-name">Admin</div>
               <div className="user-email">admin@example.com</div>
             </div>
           </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
