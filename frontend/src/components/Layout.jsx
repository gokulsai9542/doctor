import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children, title }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Topbar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
