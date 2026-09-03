import { useMemo, useState } from 'react';
import { seedBoards, seedNodes, seedConnections, seedGroups, seedComments } from '../data/seed.js';

export const initialView = { name: 'landing' };

export function useAppState() {
  const [view, setView] = useState(initialView);
  const [user, setUser] = useState(null);
  const [boards, setBoards] = useState(seedBoards);
  const [nodes, setNodes] = useState(seedNodes);
  const [connections, setConnections] = useState(seedConnections);
  const [groups] = useState(seedGroups);
  const [comments] = useState(seedComments);

  const api = useMemo(() => ({
    view, setView,
    user, setUser,
    boards, nodes, connections, groups, comments,
    openBoard: (id) => setView({ name: 'board', boardId: id }),
    goDashboard: () => setView({ name: 'dashboard' }),
    addBoard(kind, title) {
      const id = `board-${Date.now()}`;
      const board = {
        id,
        kind: kind.id,
        title: title || `Untitled ${kind.name.toLowerCase()}`,
        description: kind.blurb,
        isPublic: false,
        background: kind.id === 'moodboard' ? 'linen' : kind.id === 'thoughtmap' ? 'sage' : 'cork',
        updatedAt: Date.now(),
        nodeIds: [],
      };
      const starterId = `s-${Date.now()}`;
      const starter = kind.id === 'thoughtmap'
        ? { id: starterId, boardId: id, type: 'text', title: 'Central thought', content: 'Double-click to rename, then branch ideas off it.', x: 480, y: 140, w: 280, h: 150, tags: ['root'], color: 'butter' }
        : kind.id === 'moodboard'
          ? { id: starterId, boardId: id, type: 'text', title: 'Direction', content: 'Paste image URLs to grow the collage — the palette builds itself.', x: 300, y: 200, w: 280, h: 150, tags: ['direction'], color: 'butter' }
          : { id: starterId, boardId: id, type: 'text', title: 'First pin', content: 'Drag me around. Use the rail to add notes, images and links.', x: 300, y: 200, w: 260, h: 160, tags: ['todo'], color: 'butter' };
      setBoards((b) => [{ ...board, nodeIds: [starterId] }, ...b]);
      setNodes((n) => ({ ...n, [starterId]: starter }));
      return id;
    },
  }), [view, user, boards, nodes, connections, groups, comments]);

  return api;
}
