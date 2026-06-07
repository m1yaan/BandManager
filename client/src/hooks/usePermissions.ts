import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { role, isManager, isArtist } = useAuth();

  return {
    role,
    isManager,
    isArtist,
    canCreate: isManager,
    canEdit: isManager,
    canDelete: isManager,
    canViewReports: isManager,
    canViewMessages: isManager,
    canViewFinances: isManager,
    canViewRider: isManager,
    canViewCalendar: true,
    canViewProfile: true,
  };
}
