const LANDING = { name: 'landing' };

export function pathForView(view) {
  switch (view?.name) {
    case 'login': return '/login';
    case 'register': return '/register';
    case 'dashboard': return '/dashboard';
    case 'profile': return '/profile';
    case 'board': return `/boards/${encodeURIComponent(view.boardId)}`;
    default: return '/';
  }
}

export function viewForPath(path = window.location.pathname) {
  const cleanPath = path.replace(/\/+$/, '') || '/';
  if (cleanPath === '/login') return { name: 'login' };
  if (cleanPath === '/register') return { name: 'register' };
  if (cleanPath === '/dashboard') return { name: 'dashboard' };
  if (cleanPath === '/profile') return { name: 'profile' };
  const boardMatch = cleanPath.match(/^\/boards\/([^/]+)$/);
  if (boardMatch) return { name: 'board', boardId: decodeURIComponent(boardMatch[1]) };
  return LANDING;
}

export function replaceViewUrl(view) {
  const path = pathForView(view);
  if (window.location.pathname !== path) window.history.replaceState({}, '', path);
}
