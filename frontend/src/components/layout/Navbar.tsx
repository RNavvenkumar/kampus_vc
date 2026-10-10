import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NotificationItem } from '../../types';
import {
  Menu,
  X,
  ArrowUpRight,
  Sparkles,
  Activity,
  LogOut,
  LayoutDashboard,
  Settings,
  Layers,
  Package,
  Briefcase,
  Plus,
  Bell,
  MessageSquare,
  FileText,
  FolderKanban,
  Search
} from 'lucide-react';
import { DirectChatModal } from '../chat/DirectChatModal';
import {
  getBackendHealth,
  getUnreadNotificationCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../../services/api';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<string | undefined>(undefined);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    getBackendHealth().then((res) => {
      if (isMounted) {
        setServerOnline(res.connected);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadNotificationCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const toggleNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      try {
        const res = await getNotifications({ limit: 6 });
        setRecentNotifications(res.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.isRead) {
        await markNotificationRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotificationsOpen(false);

      if (notif.projectId) {
        navigate(`/projects/${notif.projectId}`);
      } else if (notif.proposalId) {
        if (user?.role === 'brand') {
          navigate(`/brand/proposals/${notif.proposalId}`);
        } else {
          navigate(`/creator/proposals/${notif.proposalId}`);
        }
      } else if (notif.briefId) {
        navigate(`/briefs/${notif.briefId}`);
      } else if (notif.conversationId) {
        setChatConversationId(notif.conversationId);
        setChatModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Explore Creators', path: '/explore' },
    { label: 'Campaign Briefs', path: '/briefs' },
    { label: 'For Brands', path: '/brands' },
    { label: 'How It Works', path: '/how-it-works' }
  ];

  const isActive = (path: string) => location.pathname === path;
  const dashboardPath = user?.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center p-0.5 shadow-glow-cyan transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-xl tracking-tight text-text-primary flex items-center gap-1.5">
              KAMPUS<span className="text-accent">.VC</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted -mt-1">
              Creative Marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-accent relative py-1 ${
                isActive(link.path) ? 'text-accent font-semibold' : 'text-text-secondary'
              }`}
            >
              {link.label}
              {isActive(link.path) && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full animate-fadeIn" />
              )}
            </Link>
          ))}
        </nav>

        {/* Action Controls & User Account */}
        <div className="hidden md:flex items-center gap-4">
          {/* Health indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-border/60 text-[11px] text-text-muted"
            title={serverOnline ? 'Backend API Gateway Online' : 'Backend in Offline Preview Mode'}
          >
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span>{serverOnline ? 'API Online' : 'Preview Mode'}</span>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 relative">
              {/* Direct Messages Button */}
              <button
                onClick={() => {
                  setChatConversationId(undefined);
                  setChatModalOpen(true);
                }}
                className="p-2 rounded-full bg-surface-elevated border border-border text-gray-400 hover:text-emerald-400 hover:border-emerald-500/50 relative transition-colors focus:outline-none"
                aria-label="Direct Messages"
                title="Direct Messages & Real-Time Chat"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="p-2 rounded-full bg-surface-elevated border border-border text-gray-400 hover:text-white hover:border-gray-500 relative transition-colors focus:outline-none"
                  aria-label="Open notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#58D5FF] text-black text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl bg-[#11151D] border border-[#1F2937] shadow-2xl p-4 z-50 text-left animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#58D5FF]" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-[#58D5FF] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="py-2 max-h-80 overflow-y-auto space-y-2">
                      {recentNotifications.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-6">No notifications yet.</p>
                      ) : (
                        recentNotifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              n.isRead
                                ? 'bg-[#090B10]/40 border-transparent hover:border-[#1F2937]'
                                : 'bg-[#58D5FF]/10 border-[#58D5FF]/30 hover:border-[#58D5FF]'
                            }`}
                          >
                            <p className="font-bold text-white">{n.title}</p>
                            <p className="text-gray-300 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-gray-500 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-border hover:border-accent/50 transition-colors focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs font-bold font-mono">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-text-primary block leading-none">{user.name}</span>
                    <span className="text-[10px] uppercase font-mono text-accent">{user.role}</span>
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-elevated border border-border shadow-card-dark py-2 z-50 text-left animate-fadeIn">
                    <div className="px-4 py-2 border-b border-border/60">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Signed in as</span>
                      <span className="text-xs font-semibold text-text-primary truncate block">{user.email}</span>
                    </div>

                    <Link
                      to={dashboardPath}
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-accent" /> Dashboard
                    </Link>

                    {user.role === 'creator' && (
                      <>
                        <Link
                          to="/creator/opportunities"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-accent-cyan font-medium hover:text-white hover:bg-surface transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-accent-cyan" /> Campaign Opportunities
                        </Link>
                        <Link
                          to="/creator/proposals"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <FileText className="w-4 h-4 text-accent" /> My Proposals
                        </Link>
                        <Link
                          to="/projects"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <FolderKanban className="w-4 h-4 text-emerald-400" /> Awarded Projects
                        </Link>
                        <Link
                          to="/creator/portfolio"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <Layers className="w-4 h-4 text-accent" /> Portfolio Studio
                        </Link>
                        <Link
                          to="/creator/services"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <Package className="w-4 h-4 text-accent" /> Services & Calendar
                        </Link>
                      </>
                    )}

                    {user.role === 'brand' && (
                      <>
                        <Link
                          to="/brand/creators"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-accent-cyan font-medium hover:text-white hover:bg-surface transition-colors"
                        >
                          <Search className="w-4 h-4 text-accent-cyan" /> Discover Creators
                        </Link>
                        <Link
                          to="/brand/creative-studio"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-accent-cyan font-medium hover:text-white hover:bg-surface transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-accent-cyan animate-pulse" /> AI Creative Studio
                        </Link>
                        <Link
                          to="/brand/proposals"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <FileText className="w-4 h-4 text-accent" /> Proposal Review Center
                        </Link>
                        <Link
                          to="/projects"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <FolderKanban className="w-4 h-4 text-emerald-400" /> Awarded Projects
                        </Link>
                        <Link
                          to="/brand/briefs"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <Briefcase className="w-4 h-4 text-accent" /> Campaign Briefs Hub
                        </Link>
                        <Link
                          to="/brand/briefs/new"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <Plus className="w-4 h-4 text-accent" /> Author New Brief
                        </Link>
                      </>
                    )}

                    <Link
                      to="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Account Settings
                    </Link>

                    <div className="border-t border-border/60 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary border border-border focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 py-6 space-y-4 animate-fadeIn">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium p-2 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'bg-surface-elevated text-accent font-semibold'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-text-muted px-2">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Backend Service Status
              </span>
              <Badge variant={serverOnline ? 'success' : 'warning'} size="sm">
                {serverOnline ? 'Online' : 'Preview Mode'}
              </Badge>
            </div>

            {isAuthenticated && user ? (
              <div className="space-y-2 pt-2">
                <Link to={dashboardPath} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                    Go to {user.role === 'creator' ? 'Creator' : 'Brand'} Dashboard
                  </Button>
                </Link>
                {user.role === 'creator' && (
                  <>
                    <Link to="/creator/proposals" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<FileText className="w-4 h-4" />}>
                        My Proposals
                      </Button>
                    </Link>
                    <Link to="/projects" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<FolderKanban className="w-4 h-4" />}>
                        Awarded Projects
                      </Button>
                    </Link>
                    <Link to="/creator/portfolio" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<Layers className="w-4 h-4" />}>
                        Portfolio Studio
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === 'brand' && (
                  <>
                    <Link to="/brand/proposals" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<FileText className="w-4 h-4" />}>
                        Proposal Review Center
                      </Button>
                    </Link>
                    <Link to="/projects" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<FolderKanban className="w-4 h-4" />}>
                        Awarded Projects
                      </Button>
                    </Link>
                    <Link to="/brand/briefs" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full" leftIcon={<Briefcase className="w-4 h-4" />}>
                        Campaign Briefs Hub
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="md" className="w-full" leftIcon={<Settings className="w-4 h-4" />}>
                    Account Settings
                  </Button>
                </Link>
                <Button variant="outline" size="md" className="w-full text-danger border-danger/30" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Direct Chat Modal */}
      <DirectChatModal
        isOpen={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setChatConversationId(undefined);
        }}
        initialConversationId={chatConversationId}
      />
    </header>
  );
};
