import { useMemo, useState } from 'react';
import { seedBoards, seedNodes, seedConnections, seedGroups, seedComments } from '../data/seed.js';

export const initialView = { name: 'landing' };

export function useAppState() {
  const [view, setView] = useState(initialView);
  const [user, setUser] = useState(null);
  const [boards] = useState(seedBoards);
  const [nodes] = useState(seedNodes);
  const [connections] = useState(seedConnections);
  const [groups] = useState(seedGroups);
  const [comments] = useState(seedComments);

  const api = useMemo(() => ({
    view, setView,
    user, setUser,
    boards, nodes, connections, groups, comments,
    openBoard: (id) => setView({ name: 'board', boardId: id }),
    goDashboard: () => setView({ name: 'dashboard' }),
  }), [view, user, boards, nodes, connections, groups, comments]);

  return api;
}
