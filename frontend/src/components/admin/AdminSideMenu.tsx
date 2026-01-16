/**
 * AdminSideMenu Component
 * Vertical side navigation for admin panel
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.7, 1.8, 2.1-2.7
 */

import React, { useState } from 'react';
import {
    BarChart3,
    Activity,
    CreditCard,
    Users,
    Package,
    TrendingUp,
    FileText,
    Settings,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Wallet,
    CheckCircle
} from 'lucide-react';

// Types
export interface SubMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

export interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    subItems?: SubMenuItem[];
}

export interface AdminSideMenuProps {
    activeItem: string;
    onItemSelect: (itemId: string) => void;
    pendingTopupCount?: number;
    pendingWithdrawalCount?: number;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

// Menu configuration
export const MENU_ITEMS: MenuItem[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={20} /> },
    { id: 'health', label: 'Health', icon: <Activity size={20} /> },
    {
        id: 'payments',
        label: 'Payments',
        icon: <CreditCard size={20} />,
        subItems: [
            { id: 'payments-topups', label: 'Top-Up Verification', icon: <CheckCircle size={16} /> },
            { id: 'payments-wallets', label: 'Wallet Management', icon: <Wallet size={16} /> },
            { id: 'payments-withdrawals', label: 'Withdrawal Requests', icon: <Wallet size={16} /> }
        ]
    },
    { id: 'users', label: 'Users', icon: <Users size={20} /> },
    { id: 'orders', label: 'Orders', icon: <Package size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={20} /> },
    { id: 'logs', label: 'Logs', icon: <FileText size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
];

export const AdminSideMenu: React.FC<AdminSideMenuProps> = ({
    activeItem,
    onItemSelect,
    pendingTopupCount = 0,
    pendingWithdrawalCount = 0,
    collapsed = false,
    onToggleCollapse
}) => {
    // Track expanded sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
        // Auto-expand section if a sub-item is active
        const initial = new Set<string>();
        MENU_ITEMS.forEach(item => {
            if (item.subItems?.some(sub => sub.id === activeItem)) {
                initial.add(item.id);
            }
        });
        return initial;
    });

    // Toggle section expansion
    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    // Handle item click
    const handleItemClick = (itemId: string, hasSubItems: boolean = false) => {
        if (hasSubItems) {
            toggleSection(itemId);
        } else {
            onItemSelect(itemId);
        }
    };

    // Check if item or its sub-items are active
    const isItemActive = (item: MenuItem): boolean => {
        if (item.id === activeItem) return true;
        return item.subItems?.some(sub => sub.id === activeItem) || false;
    };

    return (
        <div 
            className={`admin-side-menu ${collapsed ? 'collapsed' : ''}`}
            data-testid="admin-side-menu"
        >
            {/* Collapse Toggle */}
            {onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className="collapse-toggle"
                    data-testid="collapse-toggle"
                    title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
                >
                    {collapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            )}

            {/* Menu Items */}
            <nav className="menu-nav" data-testid="menu-nav">
                {MENU_ITEMS.map(item => {
                    const isActive = isItemActive(item);
                    const isExpanded = expandedSections.has(item.id);
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                        <div key={item.id} className="menu-item-container">
                            {/* Main Menu Item */}
                            <button
                                onClick={() => handleItemClick(item.id, hasSubItems)}
                                className={`menu-item ${isActive ? 'active' : ''}`}
                                data-testid={`menu-item-${item.id}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="menu-icon">
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span className="menu-label">{item.label}</span>
                                        {hasSubItems && (
                                            <span className="expand-icon">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Sub Items */}
                            {hasSubItems && !collapsed && isExpanded && (
                                <div className="sub-menu" data-testid={`sub-menu-${item.id}`}>
                                    {item.subItems!.map(subItem => (
                                        <button
                                            key={subItem.id}
                                            onClick={() => onItemSelect(subItem.id)}
                                            className={`sub-menu-item ${subItem.id === activeItem ? 'active' : ''}`}
                                            data-testid={`sub-menu-item-${subItem.id}`}
                                        >
                                            {subItem.icon && (
                                                <span className="sub-menu-icon">
                                                    {subItem.icon}
                                                </span>
                                            )}
                                            <span className="sub-menu-label">{subItem.label}</span>
                                            {/* Badge for Top-Up Verification */}
                                            {subItem.id === 'payments-topups' && pendingTopupCount > 0 && (
                                                <span 
                                                    className="menu-badge"
                                                    data-testid="topup-count-badge"
                                                >
                                                    {pendingTopupCount}
                                                </span>
                                            )}
                                            {subItem.id === 'payments-withdrawals' && pendingWithdrawalCount > 0 && (
                                                <span
                                                    className="menu-badge"
                                                    data-testid="withdrawal-count-badge"
                                                >
                                                    {pendingWithdrawalCount}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <style>{`
                .admin-side-menu {
                    position: fixed;
                    left: 0;
                    top: 64px; /* Below navbar */
                    width: 240px;
                    height: calc(100vh - 64px);
                    background: var(--matrix-black);
                    border-right: 2px solid var(--matrix-border);
                    display: flex;
                    flex-direction: column;
                    z-index: 100;
                    transition: width 0.3s ease;
                }

                .admin-side-menu.collapsed {
                    width: 64px;
                }

                .collapse-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 48px;
                    background: transparent;
                    border: none;
                    color: var(--matrix-bright-green);
                    cursor: pointer;
                    border-bottom: 1px solid var(--matrix-border);
                    transition: background-color 0.2s ease;
                }

                .collapse-toggle:hover {
                    background: var(--matrix-dark-green);
                }

                .menu-nav {
                    flex: 1;
                    padding: 1rem 0;
                    overflow-y: auto;
                }

                .menu-item-container {
                    margin-bottom: 0.25rem;
                }

                .menu-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: transparent;
                    border: none;
                    color: var(--matrix-secondary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    gap: 0.75rem;
                }

                .menu-item:hover {
                    background: var(--matrix-dark-green);
                    color: var(--matrix-bright-green);
                }

                .menu-item.active {
                    background: var(--matrix-green);
                    color: var(--matrix-black);
                }

                .menu-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 20px;
                }

                .menu-label {
                    flex: 1;
                    font-weight: 500;
                }

                .expand-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sub-menu {
                    background: var(--matrix-elevated);
                    border-left: 2px solid var(--matrix-green);
                    margin-left: 1rem;
                }

                .sub-menu-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 0.5rem 1rem;
                    background: transparent;
                    border: none;
                    color: var(--matrix-secondary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                }

                .sub-menu-item:hover {
                    background: var(--matrix-dark-green);
                    color: var(--matrix-bright-green);
                }

                .sub-menu-item.active {
                    background: var(--matrix-green);
                    color: var(--matrix-black);
                }

                .sub-menu-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 16px;
                }

                .sub-menu-label {
                    flex: 1;
                }

                .menu-badge {
                    background: var(--matrix-green);
                    color: var(--matrix-black);
                    font-size: 0.75rem;
                    font-weight: bold;
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.75rem;
                    min-width: 1.25rem;
                    text-align: center;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .admin-side-menu:not(.collapsed) {
                        width: 64px;
                    }
                    
                    .menu-label,
                    .expand-icon,
                    .sub-menu {
                        display: none;
                    }
                }

                @media (max-width: 768px) {
                    .admin-side-menu {
                        transform: translateX(-100%);
                    }
                    
                    .admin-side-menu.open {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminSideMenu;
