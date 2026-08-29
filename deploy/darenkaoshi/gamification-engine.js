const PROFILE_VERSION = 1
const COLLECTION_TYPES = ['growth', 'regret', 'fantasy']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function eventId(event) {
  return String(event?.id || [event?.type, event?.attemptId, event?.storyId, event?.optionIndex].filter(Boolean).join(':'))
}

function unique(values) {
  return [...new Set(values)]
}

function normaliseEvent(event) {
  if (!event?.type) return null
  return {
    id: eventId(event),
    type: String(event.type),
    attemptId: event.attemptId ? String(event.attemptId) : null,
    storyId: event.storyId ? String(event.storyId) : null,
    optionIndex: Number.isInteger(event.optionIndex) ? event.optionIndex : null,
    payload: event.payload && typeof event.payload === 'object' ? clone(event.payload) : {},
    createdAt: event.createdAt || null
  }
}

function emptyCollection() {
  return COLLECTION_TYPES.reduce((collection, type) => {
    collection[type] = []
    return collection
  }, {})
}

export function createInitialProfile(guestId, rules) {
  return {
    version: PROFILE_VERSION,
    guestId,
    rulesetVersion: rules?.version || 'unknown',
    xp: 0,
    level: 1,
    levelTitle: rules?.levels?.[0]?.title || '还没有开始',
    events: [],
    unlockedAchievementIds: [],
    collection: emptyCollection(),
    stats: {
      answeredScenes: 0,
      completedAttempts: 0,
      visitedStoryIds: [],
      lastCompletedAttemptId: null
    },
    updatedAt: null
  }
}

function safeProfile(profile, guestId, rules) {
  const initial = createInitialProfile(guestId, rules)
  if (!profile || profile.guestId !== guestId || profile.version !== PROFILE_VERSION) return initial
  return {
    ...initial,
    ...profile,
    guestId,
    rulesetVersion: rules?.version || profile.rulesetVersion,
    events: Array.isArray(profile.events) ? profile.events.map(normaliseEvent).filter(Boolean) : []
  }
}

function getEvents(profile, type) {
  return profile.events.filter((event) => event.type === type)
}

function buildCollection(events) {
  const collection = emptyCollection()
  getEvents({ events }, 'attempt_completed').forEach((event) => {
    const cards = Array.isArray(event.payload?.cards) ? event.payload.cards : []
    cards.forEach((card) => {
      if (!COLLECTION_TYPES.includes(card.type) || !card.id) return
      const cardKey = String(card.id)
      if (!collection[card.type].some((entry) => entry.cardKey === cardKey)) {
        collection[card.type].push({ cardKey, id: String(card.id), attemptId: event.attemptId || null })
      }
    })
  })
  return collection
}

function eventCounts(events) {
  return events.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] || 0) + 1
    return counts
  }, {})
}

function matchesTrigger(trigger, profile) {
  const counts = eventCounts(profile.events)
  const minimum = Number(trigger.minimum || 0)
  if (trigger.type === 'event_count') return (counts[trigger.eventType] || 0) >= minimum
  if (trigger.type === 'unique_story_count') return profile.stats.visitedStoryIds.length >= minimum
  if (trigger.type === 'completed_attempts') return profile.stats.completedAttempts >= minimum
  if (trigger.type === 'card_type_count') {
    return COLLECTION_TYPES.filter((type) => profile.collection[type]?.length > 0).length >= minimum
  }
  return false
}

function getLevel(xp, levels) {
  return [...(levels || [])]
    .sort((a, b) => Number(a.minXp) - Number(b.minXp))
    .filter((level) => Number(level.minXp) <= xp)
    .at(-1) || { level: 1, minXp: 0, title: '还没有开始' }
}

function deriveProfile(profile, rules) {
  const events = profile.events.map(normaliseEvent).filter(Boolean)
  const xp = events.reduce((total, event) => total + Number(rules?.events?.[event.type]?.xp || 0), 0)
  const level = getLevel(xp, rules?.levels)
  const answeredEvents = getEvents({ events }, 'scene_answered')
  const completedEvents = getEvents({ events }, 'attempt_completed')
  const visitedStoryIds = unique(answeredEvents.map((event) => event.storyId).filter(Boolean))
  const collection = buildCollection(events)
  const derived = {
    ...profile,
    rulesetVersion: rules?.version || profile.rulesetVersion,
    events,
    xp,
    level: Number(level.level),
    levelTitle: level.title,
    collection,
    stats: {
      answeredScenes: answeredEvents.length,
      completedAttempts: completedEvents.length,
      visitedStoryIds,
      lastCompletedAttemptId: completedEvents.at(-1)?.attemptId || null
    },
    updatedAt: new Date().toISOString()
  }
  derived.unlockedAchievementIds = (rules?.achievements || [])
    .filter((achievement) => matchesTrigger(achievement.trigger, derived))
    .map((achievement) => achievement.id)
  return derived
}

export function rebuildProfile(profile, guestId, rules) {
  return deriveProfile(safeProfile(profile, guestId, rules), rules)
}

export function applyEvent(profile, event, rules) {
  const current = rebuildProfile(profile, profile?.guestId, rules)
  const nextEvent = normaliseEvent(event)
  if (!nextEvent || current.events.some((existing) => existing.id === nextEvent.id)) {
    return { profile: current, newAchievements: [] }
  }
  const previousAchievements = new Set(current.unlockedAchievementIds)
  const next = deriveProfile({ ...current, events: [...current.events, nextEvent] }, rules)
  const achievementsById = new Map((rules?.achievements || []).map((achievement) => [achievement.id, achievement]))
  const newAchievements = next.unlockedAchievementIds
    .filter((id) => !previousAchievements.has(id))
    .map((id) => achievementsById.get(id))
    .filter(Boolean)
  return { profile: next, newAchievements }
}

export function getLevelProgress(profile, rules) {
  const levels = [...(rules?.levels || [])].sort((a, b) => Number(a.minXp) - Number(b.minXp))
  const currentIndex = Math.max(0, levels.findIndex((level) => Number(level.level) === Number(profile.level)))
  const current = levels[currentIndex] || { minXp: 0 }
  const next = levels[currentIndex + 1] || null
  const span = next ? Math.max(1, Number(next.minXp) - Number(current.minXp)) : 1
  const progress = next ? Math.min(1, Math.max(0, (profile.xp - Number(current.minXp)) / span)) : 1
  return { current, next, progress }
}

export function getAchievementById(rules, achievementId) {
  return (rules?.achievements || []).find((achievement) => achievement.id === achievementId) || null
}
