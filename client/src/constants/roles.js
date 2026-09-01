export const ROLES = {
  PUBLIC: 'PUBLIC',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN'
};

export const ROLE_HOME = {
  [ROLES.PUBLIC]: '/public/dashboard',
  [ROLES.STAFF]: '/staff/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard'
};

export const ROLE_LABEL = {
  [ROLES.PUBLIC]: 'Citizen',
  [ROLES.STAFF]: 'Responder',
  [ROLES.ADMIN]: 'Command Center'
};
