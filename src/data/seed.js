export const REL_LABELS = ['Related to', 'Causes', 'Depends on', 'Example of', 'Supports', 'Contradicts', 'Leads to'];

export const NODE_TYPES = ['text', 'image', 'link', 'video', 'file', 'audio'];

const now = Date.now();

export const seedBoards = [
  {
    id: 'board-thesis',
    title: 'Thesis — Visual Arguments',
    description: 'Research threads, references and open questions for the dissertation.',
    isPublic: false,
    background: 'cork',
    updatedAt: now - 1000 * 60 * 42,
    nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
  },
  {
    id: 'board-mood',
    title: 'Moodboard — Autumn Editorial',
    description: 'Palette, texture and layout references for the autumn issue.',
    isPublic: true,
    background: 'linen',
    updatedAt: now - 1000 * 60 * 60 * 5,
    nodeIds: ['m1', 'm2', 'm3'],
  },
  {
    id: 'board-launch',
    title: 'Launch Plan — Studio Site',
    description: 'Milestones, assets and copy drafts for the portfolio relaunch.',
    isPublic: false,
    background: 'sage',
    updatedAt: now - 1000 * 60 * 60 * 26,
    nodeIds: ['l1', 'l2', 'l3', 'l4'],
  },
];

export const seedNodes = {
  n1: { id: 'n1', boardId: 'board-thesis', type: 'text', title: 'Core claim', content: 'Spatial arrangement improves recall — argue with the 1976 paired-associate study + our pilot.', x: 120, y: 140, w: 250, h: 170, tags: ['thesis', 'claim'], color: 'cream' },
  n2: { id: 'n2', boardId: 'board-thesis', type: 'link', title: 'Cognitive maps paper', content: 'https://example.edu/cognitive-maps', x: 430, y: 120, w: 250, h: 150, tags: ['reference'], color: 'sky' },
  n3: { id: 'n3', boardId: 'board-thesis', type: 'image', title: 'Pilot results', content: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=60', x: 180, y: 380, w: 280, h: 210, tags: ['data'], color: 'cream' },
  n4: { id: 'n4', boardId: 'board-thesis', type: 'text', title: 'Open question', content: 'Does grouping help more than linking? Design the A/B before Friday.', x: 540, y: 360, w: 250, h: 170, tags: ['todo'], color: 'blush' },
  n5: { id: 'n5', boardId: 'board-thesis', type: 'file', title: 'interview-notes.pdf', content: '12 pages · 2.1 MB', x: 830, y: 180, w: 230, h: 140, tags: ['fieldwork'], color: 'cream' },
  m1: { id: 'm1', boardId: 'board-mood', type: 'image', title: 'Ochre wall', content: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=600&q=60', x: 120, y: 120, w: 300, h: 230, tags: ['palette'], color: 'cream' },
  m2: { id: 'm2', boardId: 'board-mood', type: 'image', title: 'Linen texture', content: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&q=60', x: 470, y: 180, w: 280, h: 220, tags: ['texture'], color: 'cream' },
  m3: { id: 'm3', boardId: 'board-mood', type: 'text', title: 'Direction', content: 'Warm, quiet, tactile. Fraunces headlines + generous whitespace.', x: 280, y: 420, w: 280, h: 150, tags: ['direction'], color: 'butter' },
  l1: { id: 'l1', boardId: 'board-launch', type: 'text', title: 'Milestone — Beta', content: 'Freeze scope Friday. Ship beta to 5 testers with feedback board link.', x: 120, y: 130, w: 260, h: 160, tags: ['plan'], color: 'butter' },
  l2: { id: 'l2', boardId: 'board-launch', type: 'video', title: 'Hero loop draft', content: 'https://example.com/hero-loop.mp4', x: 440, y: 120, w: 300, h: 200, tags: ['asset'], color: 'cream' },
  l3: { id: 'l3', boardId: 'board-launch', type: 'link', title: 'Type scale ref', content: 'https://example.com/type-scale', x: 170, y: 370, w: 250, h: 140, tags: ['reference'], color: 'sky' },
  l4: { id: 'l4', boardId: 'board-launch', type: 'audio', title: 'Voiceover take 2', content: '00:42 · wav', x: 500, y: 390, w: 250, h: 130, tags: ['asset'], color: 'cream' },
};

export const seedConnections = [
  { id: 'c1', boardId: 'board-thesis', from: 'n1', to: 'n2', label: 'Supports' },
  { id: 'c2', boardId: 'board-thesis', from: 'n1', to: 'n4', label: 'Leads to' },
  { id: 'c3', boardId: 'board-thesis', from: 'n3', to: 'n4', label: 'Example of' },
  { id: 'c4', boardId: 'board-launch', from: 'l1', to: 'l2', label: 'Depends on' },
];

export const seedGroups = [
  { id: 'g1', boardId: 'board-thesis', name: 'Evidence', x: 100, y: 90, w: 640, h: 230 },
];

export const seedComments = [
  { id: 'cm1', boardId: 'board-thesis', nodeId: null, author: 'Pranati', content: 'Added the pilot chart — check the axis labels before review.', createdAt: now - 1000 * 60 * 60 * 3 },
];
