import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { role, isManager, isArtist, isAdmin } = useAuth();

  return {
    role,
    isManager,
    isArtist,
    isAdmin,
    canCreate:    isManager || isAdmin,
    canEdit:      isManager || isAdmin,
    canDelete:    isManager || isAdmin,
    canViewReports:  isManager || isAdmin,
    canViewMessages: isManager || isAdmin,
    canViewFinances: isManager || isAdmin,
    canViewRider:    isManager || isAdmin,
    canViewCalendar: true,
    canViewProfile:  true,
    canViewAdmin:    isAdmin,
    canViewSupport:  true,
  };
}
