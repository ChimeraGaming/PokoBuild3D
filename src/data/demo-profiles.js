export var demoProfiles = [
  {
    id: 'profile-elm',
    email: 'elm@pokobuilds.demo',
    username: 'elmstead',
    displayName: 'Elmstead',
    bio: 'Garden-first builder who likes layered arches, soft stone paths, and tidy resource plans.',
    avatarUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="36" fill="#dce6d7"/><circle cx="60" cy="46" r="22" fill="#456950"/><path d="M28 98c8-18 22-28 32-28s24 10 32 28" fill="#8d714d"/></svg>'
      ),
    socials: [
      { label: 'Garden Notes', url: 'https://elmstead-gardens.example' },
      { label: 'Photo Log', url: 'https://elmstead-photos.example' }
    ],
    specialTags: ['Owner'],
    featuredBadgeKey: 'owner',
    createdAt: '2026-01-10T16:00:00.000Z'
  },
  {
    id: 'profile-sage',
    email: 'sage@pokobuilds.demo',
    username: 'sagefern',
    displayName: 'Sage Fern',
    bio: 'Cottage builder collecting clean layer notes and fast market stand ideas.',
    avatarUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="36" fill="#f6eee1"/><circle cx="60" cy="42" r="20" fill="#c87b5c"/><path d="M24 98c7-20 22-30 36-30s29 10 36 30" fill="#6f8b4d"/></svg>'
    ),
    socials: [{ label: 'Sage Journal', url: 'https://sagefern.example' }],
    specialTags: ['Site Admin'],
    featuredBadgeKey: 'site-admin',
    createdAt: '2026-02-03T16:00:00.000Z'
  },
  {
    id: 'profile-wren',
    email: 'wren@pokobuilds.demo',
    username: 'wrenmarket',
    displayName: 'Wren Market',
    bio: 'Small footprint builds with clear counts, layer passes, and good screenshots.',
    avatarUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="36" fill="#ede6d2"/><circle cx="60" cy="42" r="20" fill="#66717d"/><path d="M24 98c8-18 24-30 36-30s28 12 36 30" fill="#d7b07f"/></svg>'
    ),
    socials: [{ label: 'Market Clips', url: 'https://wrenmarket.example' }],
    specialTags: ['Community Expert'],
    featuredBadgeKey: 'community-expert',
    createdAt: '2026-02-20T16:00:00.000Z'
  }
]
