import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { applyEvent, createInitialProfile, getAchievementById, getLevelProgress, rebuildProfile } from './gamification-engine.js'

let scenarios = []
let branchRules = []
let identityCards = []
let gamificationRules = null
let parentResultDatabase = null
let gamificationProfile = null
let gameDataReady = false

const gameDataFiles = {
  stories: 'data/stories.json',
  branches: 'data/choice-branches.json',
  cards: 'data/identity-cards.json',
  gamification: 'data/gamification.json',
  parentResults: 'data/parent-result-database.json'
}

// The source SVGs preserve the original drawing detail, but their generated
// path order is not a human's stroke order. These phases describe the visual
// action for each scene; the queue then chains nearby strokes inside a phase.
const strokePlans = {
  'class-monitor': [
    { name: 'left-students', rect: [0.03, 0.12, 0.34, 0.66], start: [0.08, 0.18] },
    { name: 'teacher', rect: [0.39, 0.04, 0.23, 0.76], start: [0.51, 0.08] },
    { name: 'right-student', rect: [0.68, 0.12, 0.28, 0.65], start: [0.77, 0.18] },
    { name: 'desks-and-details', rect: [0.02, 0.72, 0.96, 0.28], start: [0.08, 0.84] }
  ],
  'subject-choice': [
    { name: 'father', rect: [0.02, 0.03, 0.34, 0.74], start: [0.1, 0.12] },
    { name: 'child-and-books', rect: [0.35, 0.14, 0.34, 0.68], start: [0.49, 0.2] },
    { name: 'mother', rect: [0.66, 0.04, 0.34, 0.77], start: [0.8, 0.12] },
    { name: 'table-and-lower-details', rect: [0.02, 0.72, 0.98, 0.28], start: [0.08, 0.86] }
  ],
  'winter-coat': [
    { name: 'mother', rect: [0.03, 0.05, 0.31, 0.78], start: [0.12, 0.14] },
    { name: 'child', rect: [0.34, 0.05, 0.34, 0.83], start: [0.47, 0.12] },
    { name: 'clothes-rack', rect: [0.65, 0.05, 0.34, 0.78], start: [0.72, 0.1] },
    { name: 'floor-and-basket', rect: [0.02, 0.78, 0.98, 0.22], start: [0.08, 0.9] }
  ],
  braces: [
    { name: 'room', rect: [0.0, 0.0, 0.2, 0.84], start: [0.02, 0.06] },
    { name: 'child', rect: [0.08, 0.16, 0.4, 0.77], start: [0.18, 0.22] },
    { name: 'mirror-and-braces', rect: [0.35, 0.28, 0.25, 0.62], start: [0.41, 0.33] },
    { name: 'mother', rect: [0.58, 0.02, 0.42, 0.76], start: [0.72, 0.08] },
    { name: 'table-and-phone', rect: [0.27, 0.72, 0.73, 0.28], start: [0.42, 0.82] }
  ],
  'bus-home': [
    { name: 'window-and-bike', rect: [0.02, 0.02, 0.34, 0.73], start: [0.05, 0.08] },
    { name: 'child', rect: [0.28, 0.34, 0.34, 0.62], start: [0.38, 0.42] },
    { name: 'computer-and-game', rect: [0.55, 0.16, 0.43, 0.58], start: [0.65, 0.2] },
    { name: 'desk-and-floor', rect: [0.22, 0.67, 0.78, 0.33], start: [0.35, 0.82] }
  ],
  'mother-leaves': [
    { name: 'room-and-door', rect: [0.02, 0.04, 0.32, 0.82], start: [0.05, 0.1] },
    { name: 'mother-and-child', rect: [0.24, 0.16, 0.48, 0.72], start: [0.37, 0.22] },
    { name: 'suitcase-and-chair', rect: [0.64, 0.13, 0.34, 0.7], start: [0.7, 0.2] },
    { name: 'floor-and-story-details', rect: [0.02, 0.78, 0.96, 0.22], start: [0.08, 0.9] }
  ],
  'ice-cream-slap': [
    { name: 'ferry-and-queue', rect: [0.02, 0.03, 0.96, 0.3], start: [0.06, 0.1] },
    { name: 'mother-and-child', rect: [0.26, 0.24, 0.4, 0.68], start: [0.32, 0.32] },
    { name: 'father-and-raised-hand', rect: [0.59, 0.2, 0.38, 0.62], start: [0.7, 0.25] },
    { name: 'ice-cream-and-ground', rect: [0.02, 0.78, 0.98, 0.22], start: [0.1, 0.9] }
  ],
  'basketball-slap': [
    { name: 'court-and-hoop', rect: [0.02, 0.03, 0.96, 0.3], start: [0.06, 0.1] },
    { name: 'student-and-ball', rect: [0.18, 0.2, 0.42, 0.72], start: [0.28, 0.3] },
    { name: 'father', rect: [0.55, 0.16, 0.36, 0.72], start: [0.64, 0.22] },
    { name: 'dorm-and-ground-details', rect: [0.02, 0.74, 0.96, 0.26], start: [0.08, 0.88] }
  ],
  'house-loan-cold-war': [
    { name: 'room-and-clock', rect: [0.02, 0.04, 0.62, 0.34], start: [0.04, 0.08] },
    { name: 'mother-and-table', rect: [0.03, 0.22, 0.43, 0.7], start: [0.08, 0.3] },
    { name: 'child-and-house-paper', rect: [0.62, 0.04, 0.37, 0.9], start: [0.72, 0.12] },
    { name: 'chairs-and-room-details', rect: [0.28, 0.48, 0.7, 0.5], start: [0.38, 0.7] }
  ],
  'music-dream-ridicule': [
    { name: 'room-and-clock', rect: [0.02, 0.04, 0.58, 0.42], start: [0.04, 0.08] },
    { name: 'teen-and-music-notebook', rect: [0.12, 0.22, 0.38, 0.74], start: [0.18, 0.28] },
    { name: 'father-and-dismissal', rect: [0.61, 0.14, 0.37, 0.78], start: [0.7, 0.2] },
    { name: 'table-and-home-details', rect: [0.02, 0.56, 0.96, 0.42], start: [0.08, 0.72] }
  ]
}

const strokeProfiles = {
  default: { minLength: 0, maxPoints: 64, pointsPerCurve: 1.5 },
  // This scene intentionally keeps the complete source drawing: the wallet,
  // plaid coat, rack, hanging clothes, and budget details carry the story.
  'winter-coat': { minLength: 0, maxPoints: 180, pointsPerCurve: 2 }
}

// The centerline pass cannot reliably preserve tiny filled facial marks. These
// scene-specific native strokes restore them in the source drawing's coordinate
// system, so they still travel through the same pencil queue.
const sceneMicroStrokes = {
  'winter-coat': [
    { phaseIndex: 0, points: [[377, 237], [379, 240], [378, 243]] },
    // The right eye is a short horizontal mark above the cheek contour.
    { phaseIndex: 0, points: [[407, 232], [411, 231], [414, 232], [416, 231]] }
  ],
  'bus-home': [
    { phaseIndex: 0, points: [[241, 236], [242, 240], [241, 244]] },
    { phaseIndex: 0, points: [[276, 238], [277, 242], [276, 246]] },
    { phaseIndex: 0, points: [[337, 246], [338, 250], [337, 254]] },
    { phaseIndex: 0, points: [[373, 248], [374, 252], [373, 256]] }
  ]
}



let gameDataError = ''
const LOCAL_SAVE_VERSION = 1
const LOCAL_GUEST_KEY = 'darenkaoshi:guest-id:v1'
const LOCAL_ATTEMPT_KEY = 'darenkaoshi:guest-attempt:v1'
const LOCAL_GAMIFICATION_KEY = 'darenkaoshi:guest-gamification:v1'
const GAME_DATA_TIMEOUT_MS = 12000

function createLocalId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.()
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function getLocalStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch (error) {
    return null
  }
}

function getOrCreateGuestId() {
  const storage = getLocalStorage()
  if (!storage) return createLocalId('guest')
  try {
    const existing = storage.getItem(LOCAL_GUEST_KEY)
    if (existing) return existing
    const guestId = createLocalId('guest')
    storage.setItem(LOCAL_GUEST_KEY, guestId)
    return guestId
  } catch (error) {
    return createLocalId('guest')
  }
}

const guestId = getOrCreateGuestId()
const state = { screen: 'home', scenarioIndex: 0, answers: {}, selectedAnswer: null, transitioning: false, attemptId: createLocalId('attempt') }
let resultDeckEntries = []
let activeResultCardDeck = null
let answerTransitionTimer = null
let answerTransitionToken = 0
let sceneRenderGeneration = 0
const sceneRequestControllers = new Set()
const sceneCleanups = new Set()

function cancelAnswerTransition() {
  answerTransitionToken += 1
  if (answerTransitionTimer !== null) {
    window.clearTimeout(answerTransitionTimer)
    answerTransitionTimer = null
  }
  state.transitioning = false
}

function cancelSceneWork() {
  sceneRenderGeneration += 1
  sceneRequestControllers.forEach((controller) => controller.abort())
  sceneRequestControllers.clear()
  sceneCleanups.forEach((cleanup) => cleanup())
  sceneCleanups.clear()
}

function storedAnswers() {
  return Object.fromEntries(Object.entries(state.answers).map(([index, optionIndex]) => {
    const story = scenarios[Number(index)]
    return story ? [story.id, Number(optionIndex)] : null
  }).filter(Boolean))
}

function saveGuestAttempt(overrides = {}) {
  const storage = getLocalStorage()
  if (!storage || !scenarios.length) return
  const currentScenarioIndex = Number.isInteger(overrides.currentScenarioIndex)
    ? overrides.currentScenarioIndex
    : state.scenarioIndex
  const boundedIndex = Math.max(0, Math.min(currentScenarioIndex, scenarios.length - 1))
  const payload = {
    version: LOCAL_SAVE_VERSION,
    guestId,
    attemptId: state.attemptId,
    status: overrides.status || (state.screen === 'result' ? 'completed' : 'in_progress'),
    currentScenarioIndex: boundedIndex,
    currentStoryId: scenarios[boundedIndex]?.id || null,
    answers: storedAnswers(),
    updatedAt: new Date().toISOString()
  }
  try {
    storage.setItem(LOCAL_ATTEMPT_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('本地答卷保存失败', error)
  }
}

function restoreGuestAttempt() {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    const payload = JSON.parse(storage.getItem(LOCAL_ATTEMPT_KEY) || 'null')
    if (!payload || payload.version !== LOCAL_SAVE_VERSION || payload.guestId !== guestId) return
    const restoredAnswers = {}
    Object.entries(payload.answers || {}).forEach(([storyId, optionIndex]) => {
      const index = scenarios.findIndex((story) => story.id === storyId)
      if (index >= 0 && Number.isInteger(optionIndex) && scenarios[index].options?.[optionIndex]) restoredAnswers[index] = optionIndex
    })
    if (!Object.keys(restoredAnswers).length) return

    state.attemptId = payload.attemptId || createLocalId('attempt')
    state.answers = restoredAnswers
    const isComplete = payload.status === 'completed' && scenarios.every((_, index) => Number.isInteger(restoredAnswers[index]))
    if (isComplete) {
      state.screen = 'result'
      state.scenarioIndex = scenarios.length - 1
    } else {
      state.screen = 'question'
      const nextIndex = scenarios.findIndex((_, index) => !Number.isInteger(restoredAnswers[index]))
      const savedIndex = scenarios.findIndex((story) => story.id === payload.currentStoryId)
      state.scenarioIndex = nextIndex >= 0 ? nextIndex : Math.max(0, Math.min(savedIndex, scenarios.length - 1))
      state.selectedAnswer = state.answers[state.scenarioIndex] ?? null
    }
  } catch (error) {
    console.warn('本地答卷读取失败', error)
  }
}

function saveGamificationProfile() {
  const storage = getLocalStorage()
  if (!storage || !gamificationProfile) return
  try {
    storage.setItem(LOCAL_GAMIFICATION_KEY, JSON.stringify(gamificationProfile))
  } catch (error) {
    console.warn('本地游戏化档案保存失败', error)
  }
}

function loadGamificationProfile() {
  const storage = getLocalStorage()
  let storedProfile = null
  if (storage) {
    try {
      storedProfile = JSON.parse(storage.getItem(LOCAL_GAMIFICATION_KEY) || 'null')
    } catch (error) {
      console.warn('本地游戏化档案读取失败', error)
    }
  }
  gamificationProfile = rebuildProfile(storedProfile || createInitialProfile(guestId, gamificationRules), guestId, gamificationRules)
  saveGamificationProfile()
}

function recordGamificationEvent(event) {
  if (!gamificationRules) return []
  const result = applyEvent(
    gamificationProfile || createInitialProfile(guestId, gamificationRules),
    event,
    gamificationRules
  )
  gamificationProfile = result.profile
  saveGamificationProfile()
  return result.newAchievements
}

function buildGamificationCards(simulation) {
  return simulation.cardResults.flatMap((result) => {
    const cards = []
    if (result.card?.id && result.branch?.resultType) {
      cards.push({ id: result.card.id, type: result.branch.resultType })
    }
    if (result.fantasyCard?.id) cards.push({ id: result.fantasyCard.id, type: 'fantasy' })
    return cards
  })
}

function recordCompletedAttempt() {
  if (state.screen !== 'result' && !scenarios.every((_, index) => Number.isInteger(state.answers[index]))) return
  const simulation = resolveSimulation()
  recordGamificationEvent({
    id: `attempt:${state.attemptId}:completed`,
    type: 'attempt_completed',
    attemptId: state.attemptId,
    payload: { cards: buildGamificationCards(simulation) },
    createdAt: new Date().toISOString()
  })
}

function validateGamificationData(rules) {
  const errors = []
  if (!rules || typeof rules !== 'object') return ['游戏化规则缺失']
  if (typeof rules.version !== 'string' || !rules.version.trim()) errors.push('游戏化规则版本缺失')
  if (!rules.events || typeof rules.events !== 'object') errors.push('游戏化事件规则缺失')
  if (!Array.isArray(rules.levels) || !rules.levels.length) errors.push('游戏化等级规则缺失')
  if (!Array.isArray(rules.achievements)) errors.push('游戏化成就规则缺失')
  const achievementIds = new Set()
  ;(rules.achievements || []).forEach((achievement) => {
    if (!achievement?.id || achievementIds.has(achievement.id)) errors.push(`成就 ID 重复或缺失：${achievement?.id || 'unknown'}`)
    achievementIds.add(achievement.id)
    if (!achievement.title || !achievement.description || !achievement.trigger?.type) errors.push(`成就规则不完整：${achievement?.id || 'unknown'}`)
  })
  return errors
}

function validateParentResultData(database, stories, branches, cards) {
  const errors = []
  if (!database || typeof database !== 'object') return ['父母结果数据库缺失']
  const parentTypes = Array.isArray(database.parentTypes) ? database.parentTypes : []
  const dimensions = Array.isArray(database.dimensions) ? database.dimensions : []
  const mappings = Array.isArray(database.branchMappings) ? database.branchMappings : []
  if (parentTypes.length !== 16) errors.push(`父母类型数量应为 16，实际为 ${parentTypes.length}`)
  if (dimensions.length !== 4) errors.push(`父母结果维度数量应为 4，实际为 ${dimensions.length}`)
  if (!mappings.length) errors.push('父母结果分支映射缺失')

  const parentTypeIds = new Set()
  parentTypes.forEach((type) => {
    if (!type?.id || parentTypeIds.has(type.id)) errors.push(`父母类型 ID 重复或缺失：${type?.id || 'unknown'}`)
    parentTypeIds.add(type.id)
    if (!type.title || !type.image || !type.risk) errors.push(`父母类型文案不完整：${type?.id || 'unknown'}`)
  })

  const dimensionIds = new Set()
  dimensions.forEach((dimension) => {
    if (!dimension?.id || dimensionIds.has(dimension.id)) errors.push(`结果维度 ID 重复或缺失：${dimension?.id || 'unknown'}`)
    dimensionIds.add(dimension.id)
    if (!dimension.label || !dimension.positive || !dimension.negative) errors.push(`结果维度文案不完整：${dimension?.id || 'unknown'}`)
  })

  const branchMap = new Map(branches.map((branch) => [branch.id, branch]))
  const cardIds = new Set(cards.map((card) => card.id))
  const mappingIds = new Set()
  const mappedBranchIds = new Set()
  const usedParentTypeIds = new Set()
  mappings.forEach((mapping) => {
    if (!mapping?.branchId || mappingIds.has(mapping.branchId)) errors.push(`父母结果分支 ID 重复或缺失：${mapping?.branchId || 'unknown'}`)
    mappingIds.add(mapping.branchId)
    mappedBranchIds.add(mapping.branchId)
    const branch = branchMap.get(mapping.branchId)
    if (!branch) {
      errors.push(`父母结果分支引用了不存在的答题分支：${mapping.branchId}`)
      return
    }
    if (mapping.storyId !== branch.storyId || mapping.optionIndex !== branch.optionIndex) errors.push(`父母结果分支未与答题分支对齐：${mapping.branchId}`)
    if (mapping.resultType !== branch.resultType) errors.push(`父母结果类型未与答题分支对齐：${mapping.branchId}`)
    if (mapping.identityCardId !== branch.outcomeCardId || !cardIds.has(mapping.identityCardId)) errors.push(`父母结果身份卡未与答题分支对齐：${mapping.branchId}`)
    if ((mapping.fantasyBranchId || null) !== (branch.fantasyBranchId || null)) errors.push(`父母结果幻想分支未与答题分支对齐：${mapping.branchId}`)
    if (!parentTypeIds.has(mapping.parentTypeId)) errors.push(`父母结果引用了不存在的父母类型：${mapping.branchId}`)
    usedParentTypeIds.add(mapping.parentTypeId)
    if (!Number.isFinite(mapping.typeWeight) || mapping.typeWeight < 0) errors.push(`父母类型权重无效：${mapping.branchId}`)
    if (!Number.isFinite(mapping.shadowWeight) || mapping.shadowWeight < 0) errors.push(`影子类型权重无效：${mapping.branchId}`)
    if (!mapping.signals || typeof mapping.signals !== 'object') errors.push(`父母结果信号缺失：${mapping.branchId}`)
    else dimensions.forEach((dimension) => {
      if (!Number.isFinite(mapping.signals[dimension.id])) errors.push(`父母结果信号无效：${mapping.branchId}/${dimension.id}`)
    })
    if (!mapping.analysis?.timeBill) errors.push(`父母结果时间账单缺失：${mapping.branchId}`)
  })
  branches.forEach((branch) => {
    if (!mappedBranchIds.has(branch.id)) errors.push(`答题分支缺少父母结果映射：${branch.id}`)
  })
  parentTypeIds.forEach((id) => {
    if (!usedParentTypeIds.has(id)) errors.push(`父母类型没有被任何答题分支使用：${id}`)
  })
  return errors
}

function validateGameData(stories, branches, cards, gamification, parentResults) {
  const errors = []
  const storyIds = new Set()
  const branchIds = new Set()
  const branchMap = new Map()
  const cardIds = new Set()
  const lastingTraceModes = new Set(['actual', 'source-contrast', 'not-recorded'])
  const resultTypes = new Set(['growth', 'regret'])
  const storyMap = new Map()
  const cardMap = new Map()

  stories.forEach((story) => {
    if (!story?.id || storyIds.has(story.id)) errors.push(`故事 ID 重复或缺失：${story?.id || 'unknown'}`)
    storyIds.add(story.id)
    storyMap.set(story.id, story)
    if (!Array.isArray(story.options) || story.options.length === 0) errors.push(`故事没有选项：${story.id}`)
  })
  cards.forEach((card) => {
    if (!card?.id || cardIds.has(card.id)) errors.push(`身份卡 ID 重复或缺失：${card?.id || 'unknown'}`)
    cardIds.add(card.id)
    cardMap.set(card.id, card)
    if (typeof card.lastingTraceLabel !== 'string' || !card.lastingTraceLabel.trim()) errors.push(`身份卡后续主题缺失：${card.id}`)
    if (!lastingTraceModes.has(card.lastingTraceMode)) errors.push(`身份卡后续主题来源无效：${card.id}`)
    if (typeof card.lastingTrace !== 'string' || !card.lastingTrace.trim()) errors.push(`身份卡后续内容缺失：${card.id}`)
  })
  branches.forEach((branch) => {
    const story = storyMap.get(branch.storyId)
    if (!branch?.id || branchIds.has(branch.id)) errors.push(`分支 ID 重复或缺失：${branch?.id || 'unknown'}`)
    branchIds.add(branch.id)
    branchMap.set(branch.id, branch)
    if (!story) errors.push(`分支引用了不存在的故事：${branch.id}`)
    if (!Number.isInteger(branch.optionIndex) || !story?.options?.[branch.optionIndex]) errors.push(`分支选项不存在：${branch.id}`)
    if (!cardMap.has(branch.outcomeCardId)) errors.push(`分支引用了不存在的身份卡：${branch.id}`)
    if (!resultTypes.has(branch.resultType)) errors.push(`分支结果类型无效：${branch.id}`)
    if (branch.fantasyBranchId !== null && typeof branch.fantasyBranchId !== 'string') errors.push(`幻想分支引用无效：${branch.id}`)
  })

  branches.forEach((branch) => {
    if (branch.fantasyBranchId === null) return
    const fantasyBranch = branchMap.get(branch.fantasyBranchId)
    if (!fantasyBranch) {
      errors.push(`分支引用了不存在的幻想分支：${branch.id}`)
      return
    }
    if (fantasyBranch.storyId !== branch.storyId) errors.push(`幻想分支必须属于同一个故事：${branch.id}`)
    if (fantasyBranch.resultType !== 'growth') errors.push(`幻想分支必须指向成长分支：${branch.id}`)
  })

  stories.forEach((story) => {
    story.options.forEach((_, optionIndex) => {
      const matches = branches.filter((branch) => branch.storyId === story.id && branch.optionIndex === optionIndex)
      if (matches.length !== 1) errors.push(`故事 ${story.id} 的第 ${optionIndex + 1} 个选项没有唯一分支`)
    })
  })
  errors.push(...validateGamificationData(gamification))
  errors.push(...validateParentResultData(parentResults, stories, branches, cards))
  return errors
}

async function fetchGameDataFile(path) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), GAME_DATA_TIMEOUT_MS)
  try {
    const response = await fetch(path, { signal: controller.signal })
    if (!response.ok) throw new Error('游戏数据表加载失败')
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('游戏数据载入超时，请刷新后重试')
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function loadGameData() {
  try {
    const [stories, branches, cards, gamification, parentResults] = await Promise.all(
      Object.values(gameDataFiles).map(fetchGameDataFile)
    )
    const errors = validateGameData(stories, branches, cards, gamification, parentResults)
    if (errors.length) throw new Error(errors.join('；'))
    scenarios = stories
    branchRules = branches
    identityCards = cards
    gamificationRules = gamification
    parentResultDatabase = parentResults
    restoreGuestAttempt()
    loadGamificationProfile()
    if (state.screen === 'result') recordCompletedAttempt()
    gameDataReady = true
    render()
  } catch (error) {
    gameDataError = error.message
    render()
  }
}

function getBranchForAnswer(storyId, optionIndex) {
  return branchRules.find((branch) => branch.storyId === storyId && branch.optionIndex === optionIndex)
}

function getIdentityCardForAnswer(storyId, optionIndex) {
  const branch = getBranchForAnswer(storyId, optionIndex)
  return identityCards.find((card) => card.id === branch?.outcomeCardId)
}

function resolveParentType(typeScores, parentSignalTotals) {
  const dimensions = parentResultDatabase?.dimensions || []
  const parentTypes = parentResultDatabase?.parentTypes || []
  const parentOrder = new Map(parentTypes.map((parent, index) => [parent.id, index]))
  const candidates = Object.keys(typeScores).filter((id) => typeScores[id] > 0)
  if (!candidates.length) return null
  candidates.sort((left, right) => {
    const scoreDelta = typeScores[right] - typeScores[left]
    if (scoreDelta) return scoreDelta
    const leftSignals = parentSignalTotals[left] || {}
    const rightSignals = parentSignalTotals[right] || {}
    const leftSignalScore = dimensions.reduce((sum, dimension) => sum + (leftSignals[dimension.id] || 0), 0)
    const rightSignalScore = dimensions.reduce((sum, dimension) => sum + (rightSignals[dimension.id] || 0), 0)
    if (rightSignalScore !== leftSignalScore) return rightSignalScore - leftSignalScore
    for (const dimension of dimensions) {
      const signalDelta = (rightSignals[dimension.id] || 0) - (leftSignals[dimension.id] || 0)
      if (signalDelta) return signalDelta
    }
    return (parentOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (parentOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
  })
  return parentTypes.find((parent) => parent.id === candidates[0]) || null
}

function resolveSimulation() {
  const mappingByBranchId = new Map((parentResultDatabase?.branchMappings || []).map((mapping) => [mapping.branchId, mapping]))
  const cardResults = scenarios.map((story, index) => {
    const selectedAnswer = state.answers[index]
    const branch = getBranchForAnswer(story.id, selectedAnswer)
    const resultMapping = branch ? mappingByBranchId.get(branch.id) : null
    const card = identityCards.find((identityCard) => identityCard.id === branch?.outcomeCardId)
    const fantasyBranch = branch?.fantasyBranchId ? branchRules.find((candidate) => candidate.id === branch.fantasyBranchId) : null
    const fantasyCard = identityCards.find((identityCard) => identityCard.id === fantasyBranch?.outcomeCardId)
    return { story, index, selectedAnswer, branch, resultMapping, card, fantasyBranch, fantasyCard }
  }).filter((result) => result.branch && result.card)
  const selectedBranches = cardResults.map((result) => result.branch)
  const selectedMappings = cardResults.map((result) => result.resultMapping).filter(Boolean)
  const dimensionState = { trust: 0, agency: 0 }
  const opportunityState = {}
  const timeImpactState = {}
  const dimensionTotals = Object.fromEntries((parentResultDatabase?.dimensions || []).map((dimension) => [dimension.id, 0]))
  const parentScores = {}
  const shadowScores = {}
  const parentSignalTotals = {}
  const selectedBranchIds = []

  selectedBranches.forEach((branch) => {
    selectedBranchIds.push(branch.id)
    Object.entries(branch.stateChange || {}).forEach(([dimension, value]) => {
      if (typeof value === 'number') dimensionState[dimension] = (dimensionState[dimension] || 0) + value
      else if (dimension === 'opportunity') opportunityState[value] = (opportunityState[value] || 0) + 1
      else timeImpactState[dimension] = (timeImpactState[dimension] || 0) + 1
    })
  })

  selectedMappings.forEach((mapping) => {
    parentScores[mapping.parentTypeId] = (parentScores[mapping.parentTypeId] || 0) + mapping.typeWeight
    const parentSignals = parentSignalTotals[mapping.parentTypeId] || (parentSignalTotals[mapping.parentTypeId] = {})
    Object.entries(mapping.signals || {}).forEach(([dimension, value]) => {
      dimensionTotals[dimension] = (dimensionTotals[dimension] || 0) + value
      parentSignals[dimension] = (parentSignals[dimension] || 0) + value
    })
    if (mapping.resultType === 'regret' && mapping.shadowWeight > 0) {
      shadowScores[mapping.parentTypeId] = (shadowScores[mapping.parentTypeId] || 0) + mapping.shadowWeight
    }
  })

  const timeBills = [...new Set(selectedMappings.map((mapping) => mapping.analysis?.timeBill).filter(Boolean))]
  const primaryParentType = resolveParentType(parentScores, parentSignalTotals)
  const shadowParentType = resolveParentType(shadowScores, parentSignalTotals)

  return {
    selectedBranches,
    selectedBranchIds,
    selectedMappings,
    cardResults,
    dimensionState,
    dimensionTotals,
    opportunityState,
    timeImpactState,
    parentScores,
    shadowScores,
    primaryParentType,
    shadowParentType,
    timeBills,
    outcomeCards: cardResults.map((result) => result.card),
    cardCounts: {
      growth: cardResults.filter((result) => result.branch.resultType === 'growth').length,
      regret: cardResults.filter((result) => result.branch.resultType === 'regret').length,
      fantasy: cardResults.filter((result) => result.fantasyCard).length
    }
  }
}

function logo() {
  return `<div class="brand-mark" aria-label="大人考试"><span>‹‹</span><b>大人考试</b><span>››</span></div>`
}

function header(showBack = false) {
  return `<header class="topbar">
    ${showBack ? '<button class="text-button" data-action="home">← 返回</button>' : '<span class="edition">APPLICATION / 01</span>'}
    ${logo()}
    <span class="topbar-note">父母卷</span>
  </header>`
}

function render() {
  const app = document.querySelector('#app')
  cancelSceneWork()
  if (activeResultCardDeck && state.screen !== 'result') {
    activeResultCardDeck.destroy()
    activeResultCardDeck = null
  }
  if (!gameDataReady) {
    app.innerHTML = gameDataError
      ? `<section class="splash-screen page-enter"><p class="data-error">${gameDataError}</p></section>`
      : '<section class="splash-screen page-enter"><p class="data-loading">正在载入答卷……</p></section>'
    return
  }
  if (state.screen === 'home') app.innerHTML = homeScreen()
  if (state.screen === 'scenarios') app.innerHTML = scenariosScreen()
  if (state.screen === 'question') app.innerHTML = questionScreen()
  if (state.screen === 'result') app.innerHTML = resultScreen()
  bindActions()
  prepareSceneDrawings()
  if (state.screen === 'result') {
    prepareResultCardDeck()
    prepareIdentityCardImages()
  }
}

function homeScreen() {
  return `<section class="splash-screen page-enter">
    <img class="splash-logo" src="assets/darenkaoshi-logo.png" alt="《大人考试》" />
    <button class="splash-answer" data-action="start-test">答卷</button>
    <a class="splash-doctor-link" href="doctor/">更多入口：出卷人 · 天使联系 · AIGC <span aria-hidden="true">↗</span></a>
  </section>`
}

function sceneNavigator() {
  return `<nav class="scene-nav" aria-label="场景切换">
    <span class="scene-nav-label">场景</span>
    <div class="scene-test-list">
      ${scenarios.map((item, index) => `<button class="scene-nav-button ${index === state.scenarioIndex ? 'is-current' : ''}" data-action="open-scenario" data-index="${index}" aria-label="场景 0${index + 1}：${item.title}" aria-current="${index === state.scenarioIndex ? 'step' : 'false'}"><b>${item.title}</b></button>`).join('')}
    </div>
  </nav>`
}

function scenariosScreen() {
  return `${header(true)}
    <section class="list-page page-enter">
      <div class="section-heading">
        <p class="eyebrow">SCENARIO LIBRARY</p>
        <h2>先看见他们<br /><em>经历过什么。</em></h2>
        <p>以下内容来自真实填写。你不需要给出正确答案，只需要选择你会怎么做。</p>
      </div>
      <div class="scenario-grid">${scenarios.map((item, index) => `
        <button class="scenario-card ${index === 1 ? 'featured' : ''}" data-action="open-scenario" data-index="${index}">
          <span class="card-number">0${index + 1}</span>
          <span class="card-meta">${item.meta}</span>
          <strong>${item.title}</strong>
          <span class="card-hook">${item.hook}</span>
          <span class="card-arrow">↗</span>
        </button>`).join('')}</div>
    </section>`
}

function questionScreen() {
  const item = scenarios[state.scenarioIndex]
  return `<section class="test-screen page-enter">
    <img class="test-logo" src="assets/darenkaoshi-logo.png" alt="《大人考试》" />
    ${sceneNavigator()}
    <div class="test-content">
      <div class="scene-scroll" data-scene-index="${state.scenarioIndex}" data-scene-id="${item.id}">
        <div class="scene-paper-underlay" aria-hidden="true">
          <svg viewBox="0 0 660 360" preserveAspectRatio="none">
            <path d="M18 58 C86 52 144 64 210 57 S336 61 405 55 S548 63 642 54" />
            <path d="M26 302 C102 294 164 309 232 300 S366 306 432 298 S566 309 632 300" />
            <path d="M82 104 l18 12 l-14 19 l22 16 M548 92 l-19 18 l17 16 l-21 20" />
            <path d="M42 224 q24 -17 48 0 t48 0 M514 230 q28 -18 54 0 t48 0" />
          </svg>
        </div>
        <div class="scene-vector-stage"></div>
      </div>
      <div class="scene-text" data-scene-index="${state.scenarioIndex}" aria-live="polite"></div>
      <p class="scene-credit">——${item.author}</p>
      <p class="test-question">${item.question}</p>
      <div class="test-options">${item.options.map((option, index) => `<button class="test-option ${state.selectedAnswer === index ? 'selected' : ''}" data-action="answer" data-index="${index}"><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div>
    </div>
  </section>`
}

function prepareSceneDrawings() {
  const renderGeneration = sceneRenderGeneration
  const sharedPencil = createPencilCursor()
  document.querySelectorAll('.scene-vector-stage').forEach((stage) => {
    const wrapper = stage.closest('.scene-scroll')
    const sceneText = wrapper?.nextElementSibling
    const item = wrapper
      ? scenarios[Number(wrapper.dataset.sceneIndex)]
      : scenarios.find((candidate) => candidate.id === stage.dataset.sceneId)
    const sceneId = stage.dataset.sceneId || item?.id
    const title = stage.dataset.title || item?.title || '后来身份'
    let activeDrawing = null
    let stopDrawing = () => {}
    const requestController = new AbortController()
    sceneRequestControllers.add(requestController)
    const cleanup = () => {
      requestController.abort()
      stopDrawing()
      stopDrawing = () => {}
      activeDrawing?.destroy()
      activeDrawing = null
    }
    sceneCleanups.add(cleanup)
    const startStoryText = () => {
      if (!wrapper || !sceneText || sceneText.classList.contains('story-started')) return
      sceneText.classList.add('story-started')
      typeSceneText(sceneText, item.scene, () => renderGeneration === sceneRenderGeneration && sceneText.isConnected)
    }
    const finishDrawing = () => {
      if (!wrapper || wrapper.classList.contains('is-drawn')) return
      wrapper.classList.add('is-drawn')
      startStoryText()
    }
    const showDrawingError = () => {
      cleanup()
      stage.classList.add('is-drawing')
      stage.replaceChildren()
      const message = document.createElement('span')
      message.className = 'drawing-unavailable'
      message.textContent = '这张场景暂时无法展开'
      stage.append(message)
      finishDrawing()
    }

    if (!wrapper || !sceneId) {
      if (!sceneId) {
        showDrawingError()
        return
      }
    }

    stage.classList.add('is-drawing')
    fetch(`assets/recreated/${sceneId}.svg`, { signal: requestController.signal })
      .then((response) => response.ok ? response.text() : Promise.reject(new Error(`Missing drawing asset: ${sceneId}`)))
      .then((svgString) => {
        sceneRequestControllers.delete(requestController)
        if (renderGeneration !== sceneRenderGeneration || !stage.isConnected) {
          cleanup()
          return
        }
        activeDrawing = createThreeDrawing(svgString, title, sceneId)
        if (!activeDrawing) {
          showDrawingError()
          return
        }
        stage.replaceChildren(activeDrawing.canvas, activeDrawing.overlay)
        activeDrawing.resize()
        if (!activeDrawing.drawables.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          startStoryText()
          finishDrawing()
          return
        }
        activeDrawing.overlay.append(sharedPencil)
        stopDrawing = playThreeDrawing(activeDrawing, sharedPencil, finishDrawing, startStoryText)
      })
      .catch((error) => {
        sceneRequestControllers.delete(requestController)
        if (error.name === 'AbortError' || renderGeneration !== sceneRenderGeneration || !stage.isConnected) {
          cleanup()
          return
        }
        showDrawingError()
      })
  })
}

function parseSvgViewBox(svgString) {
  const match = svgString.match(/viewBox=["']\s*([^"']+)["']/i)
  const values = match?.[1].trim().split(/[\s,]+/).map(Number)
  return values?.length === 4 && values.every(Number.isFinite)
    ? { x: values[0], y: values[1], width: values[2], height: values[3] }
    : { x: 0, y: 0, width: 600, height: 360 }
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function orderStrokeCandidates(candidates, sceneId, viewBox, profile) {
  const plan = strokePlans[sceneId]
  if (!plan?.length) return candidates

  const groups = plan.map(() => [])
  candidates.forEach((candidate) => {
    const normalized = {
      x: (candidate.center.x - viewBox.x) / viewBox.width,
      y: (candidate.center.y - viewBox.y) / viewBox.height
    }
    let phaseIndex = Number.isInteger(candidate.phaseIndex)
      ? candidate.phaseIndex
      : plan.findIndex(({ rect }) => (
        normalized.x >= rect[0] && normalized.x <= rect[0] + rect[2] &&
        normalized.y >= rect[1] && normalized.y <= rect[1] + rect[3]
      ))
    if (phaseIndex < 0) {
      phaseIndex = plan.reduce((closest, phase, index) => {
        const phaseCenter = { x: phase.rect[0] + phase.rect[2] / 2, y: phase.rect[1] + phase.rect[3] / 2 }
        const closestCenter = plan[closest]
        const closestPoint = { x: closestCenter.rect[0] + closestCenter.rect[2] / 2, y: closestCenter.rect[1] + closestCenter.rect[3] / 2 }
        return distanceBetween(normalized, phaseCenter) < distanceBetween(normalized, closestPoint) ? index : closest
      }, 0)
    }
    groups[phaseIndex].push(candidate)
  })

  const ordered = []
  let previousPoint = null
  groups.forEach((group, phaseIndex) => {
    const phase = plan[phaseIndex]
    if (profile?.maxPerPhase?.[phaseIndex]) {
      group.sort((a, b) => b.length - a.length)
      group.splice(profile.maxPerPhase[phaseIndex])
    }
    const phaseStart = { x: viewBox.x + phase.start[0] * viewBox.width, y: viewBox.y + phase.start[1] * viewBox.height }
    while (group.length) {
      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY
      group.forEach((candidate, index) => {
        const origin = previousPoint || phaseStart
        const startDistance = distanceBetween(origin, candidate.points[0])
        const endDistance = distanceBetween(origin, candidate.points[candidate.points.length - 1])
        const distance = Math.min(startDistance, endDistance)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
          candidate.reverse = endDistance < startDistance
        }
      })
      const [candidate] = group.splice(bestIndex, 1)
      if (candidate.reverse) candidate.points.reverse()
      delete candidate.reverse
      ordered.push(candidate)
      previousPoint = candidate.points[candidate.points.length - 1]
    }
  })
  return ordered
}

function createThreeDrawing(svgString, title, sceneId) {
  const sourceViewBox = parseSvgViewBox(svgString)
  // The source winter drawing has a few legitimate left-edge strokes that
  // extend past x=0. Keep those original strokes visible instead of clipping
  // them at the SVG viewport boundary.
  const viewBox = sceneId === 'winter-coat'
    ? { ...sourceViewBox, x: sourceViewBox.x - 72, width: sourceViewBox.width + 72 }
    : sourceViewBox
  let parsed
  try {
    parsed = new SVGLoader().parse(svgString)
  } catch (error) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.className = 'scene-canvas'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', `${title}手绘场景线稿`)
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.classList.add('drawing-overlay')
  overlay.setAttribute('viewBox', '0 0 100 100')
  overlay.setAttribute('preserveAspectRatio', 'none')
  overlay.setAttribute('aria-hidden', 'true')

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  } catch (error) {
    return null
  }
  renderer.setClearColor(0xffffff, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10)
  const group = new THREE.Group()
  scene.add(group)
  const drawables = []
  const materials = []
  const candidates = []
  let displayScale = 1
  const profile = strokeProfiles[sceneId] || strokeProfiles.default

  parsed.paths.forEach((shapePath, pathIndex) => {
    const style = shapePath.userData?.style || {}
    const sourceWidth = Number.parseFloat(style.strokeWidth) || 1.5
    const material = new LineMaterial({
      color: 0x11110f,
      linewidth: Math.max(1.05, Math.min(2.1, sourceWidth)),
      transparent: true,
      opacity: 1,
      worldUnits: false
    })
    materials.push(material)

    shapePath.subPaths.forEach((subPath, subPathIndex) => {
      const curveCount = subPath.curves?.length || 1
      const measuredPoints = subPath.getSpacedPoints(Math.min(24, Math.max(8, curveCount * 1.5)))
      let measuredLength = 0
      for (let index = 1; index < measuredPoints.length; index += 1) {
        measuredLength += measuredPoints[index - 1].distanceTo(measuredPoints[index])
      }
      if (measuredLength < profile.minLength) return
      const sampleCount = Math.min(profile.maxPoints, Math.max(8, Math.ceil(curveCount * profile.pointsPerCurve)))
      const points = subPath.getSpacedPoints(sampleCount)
      if (points.length < 2) return
      const vectors = points.map((point) => new THREE.Vector3(point.x, point.y, 0))
      candidates.push({
        points: vectors,
        length: measuredLength,
        center: vectors.reduce((sum, point) => ({ x: sum.x + point.x / vectors.length, y: sum.y + point.y / vectors.length }), { x: 0, y: 0 }),
        material,
        sourceIndex: pathIndex,
        subPathIndex
      })
    })
  })

  const microMaterial = sceneMicroStrokes[sceneId]?.length
    ? new LineMaterial({
      color: 0x11110f,
      linewidth: sceneId === 'winter-coat' ? 3.4 : 2.1,
      transparent: true,
      opacity: 1,
      worldUnits: false
    })
    : null
  if (microMaterial) {
    materials.push(microMaterial)
    sceneMicroStrokes[sceneId].forEach((stroke, subPathIndex) => {
      const points = stroke.points.map(([x, y]) => new THREE.Vector3(x, y, 0))
      let length = 0
      for (let index = 1; index < points.length; index += 1) {
        length += points[index - 1].distanceTo(points[index])
      }
      candidates.push({
        points,
        length,
        center: points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 }),
        material: microMaterial,
        sourceIndex: Number.MAX_SAFE_INTEGER,
        subPathIndex,
        phaseIndex: stroke.phaseIndex
      })
    })
  }

  orderStrokeCandidates(candidates, sceneId, viewBox, profile).forEach((candidate, sequenceIndex) => {
    const { points, material, sourceIndex, subPathIndex } = candidate
    const geometry = new LineGeometry().setFromPoints(points)
    const line = new Line2(geometry, material)
    line.frustumCulled = false
    line.renderOrder = sequenceIndex
    group.add(line)

    const lengths = []
    let totalLength = 0
    for (let index = 1; index < points.length; index += 1) {
      totalLength += points[index - 1].distanceTo(points[index])
      lengths.push(totalLength)
    }
    if (totalLength < 1) {
      geometry.dispose()
      group.remove(line)
      return
    }
    geometry.instanceCount = 0
    drawables.push({
      line,
      geometry,
      points,
      lengths,
      length: totalLength,
      start: drawables.reduce((sum, drawable) => sum + drawable.length, 0),
      sourceIndex,
      subPathIndex
    })
  })

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || stageWidth(canvas)))
    const height = Math.max(1, Math.round(rect.height || stageHeight(canvas)))
    renderer.setSize(width, height, false)
    camera.left = 0
    camera.right = width
    camera.top = 0
    camera.bottom = height
    camera.updateProjectionMatrix()
    const scale = Math.min(width / viewBox.width, height / viewBox.height)
    displayScale = scale
    group.scale.set(scale, scale, 1)
    group.position.set((width - viewBox.width * scale) / 2 - viewBox.x * scale, (height - viewBox.height * scale) / 2 - viewBox.y * scale, 0)
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`)
    materials.forEach((material) => material.resolution.set(width, height))
    renderer.render(scene, camera)
  }

  resize()
  return {
    canvas,
    overlay,
    scene,
    camera,
    group,
    renderer,
    drawables,
    viewBox,
    resize,
    getDisplayScale() {
      return displayScale
    },
    mapPoint(point) {
      const width = canvas.clientWidth || 1
      const height = canvas.clientHeight || 1
      const scale = Math.min(width / viewBox.width, height / viewBox.height)
      return {
        x: (width - viewBox.width * scale) / 2 + (point.x - viewBox.x) * scale,
        y: (height - viewBox.height * scale) / 2 + (point.y - viewBox.y) * scale
      }
    },
    destroy() {
      drawables.forEach(({ geometry }) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
    }
  }
}

function stageWidth(element) {
  return element.parentElement?.clientWidth || 660
}

function stageHeight(element) {
  return element.parentElement?.clientHeight || 360
}

function getDrawablePoint(drawable, progress) {
  const target = drawable.length * Math.min(1, Math.max(0, progress))
  let segment = drawable.lengths.findIndex((length) => length >= target)
  if (segment < 0) segment = drawable.lengths.length - 1
  const previousLength = segment > 0 ? drawable.lengths[segment - 1] : 0
  const segmentLength = Math.max(0.001, drawable.lengths[segment] - previousLength)
  const ratio = Math.min(1, Math.max(0, (target - previousLength) / segmentLength))
  return drawable.points[segment].clone().lerp(drawable.points[segment + 1], ratio)
}

function updateDrawable(drawable, progress) {
  const safeProgress = Math.min(1, Math.max(0, progress))
  const segmentCount = drawable.points.length - 1
  if (safeProgress >= 1) {
    if (drawable.geometry.instanceCount !== segmentCount) drawable.geometry.setFromPoints(drawable.points)
    drawable.geometry.instanceCount = segmentCount
    return
  }
  const visibleSegments = Math.max(0, Math.floor(segmentCount * safeProgress))
  const point = getDrawablePoint(drawable, safeProgress)
  const partialPoints = drawable.points.slice(0, Math.max(1, visibleSegments + 1))
  partialPoints[partialPoints.length - 1] = point
  if (partialPoints.length < 2) {
    drawable.geometry.instanceCount = 0
    return
  }
  drawable.geometry.setFromPoints(partialPoints)
  drawable.geometry.instanceCount = partialPoints.length - 1
}

function playThreeDrawing(drawing, pencil, onComplete, onStart) {
  const { drawables } = drawing
  const totalLength = drawables.reduce((sum, drawable) => sum + drawable.length, 0)
  const screenLength = totalLength * drawing.getDisplayScale()
  const duration = Math.min(2900, Math.max(1900, screenLength / 0.82))
  let completed = false
  let frameId = null
  let previousDrawable = null
  const finish = () => {
    if (completed) return
    completed = true
    pencil.style.opacity = '0'
    drawables.forEach((drawable) => updateDrawable(drawable, 1))
    drawing.renderer.render(drawing.scene, drawing.camera)
    onComplete()
  }

  if (!totalLength) {
    finish()
    return () => {}
  }
  onStart()
  const startedAt = performance.now()
  const frame = (now) => {
    if (completed) return
    const progress = Math.min(1, (now - startedAt) / duration)
    const distance = totalLength * progress
    let cursor = 0
    let activeDrawable = null
    let activeStart = 0
    drawables.forEach((drawable) => {
      const localProgress = Math.min(1, Math.max(0, (distance - cursor) / drawable.length))
      updateDrawable(drawable, localProgress)
      if (localProgress > 0 && localProgress < 1) {
        activeDrawable = drawable
        activeStart = cursor
      }
      cursor += drawable.length
    })

    if (activeDrawable) {
      const localProgress = Math.min(1, Math.max(0, (distance - activeStart) / activeDrawable.length))
      const mapped = drawing.mapPoint(getDrawablePoint(activeDrawable, localProgress))
      pencil.setAttribute('transform', `translate(${mapped.x} ${mapped.y}) rotate(-32) scale(2.5)`)
      pencil.style.opacity = '1'
      previousDrawable = activeDrawable
    } else if (previousDrawable) {
      const mapped = drawing.mapPoint(getDrawablePoint(previousDrawable, 1))
      pencil.setAttribute('transform', `translate(${mapped.x} ${mapped.y}) rotate(-32) scale(2.5)`)
    }

    drawing.renderer.render(drawing.scene, drawing.camera)
    if (progress < 1) {
      frameId = window.requestAnimationFrame(frame)
      return
    }
    finish()
  }
  frameId = window.requestAnimationFrame(frame)
  return () => {
    completed = true
    if (frameId !== null) window.cancelAnimationFrame(frameId)
    pencil.style.opacity = '0'
  }
}

function createPencilCursor() {
  const pencil = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  pencil.classList.add('drawing-pencil')
  pencil.setAttribute('aria-hidden', 'true')
  pencil.innerHTML = `<g class="drawing-pencil-body">
    <polygon points="17,0 8,-4 8,4" fill="#11110f" />
    <polygon points="17,0 12,-1.8 12,1.8" fill="#f7f5ef" />
    <rect x="-15" y="-4" width="24" height="8" rx="2" fill="#f7f5ef" stroke="#11110f" stroke-width="1.4" />
    <path d="M-9-4v8 M-3-4v8 M3-4v8 M-15-4l-4 4 4 4" fill="none" stroke="#11110f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <circle class="drawing-pencil-contact" cx="17" cy="0" r="1.5" />`
  return pencil
}

function buildCenterlineSvg(svgString, title) {
  const parsed = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  if (parsed.querySelector('parsererror')) return null
  const sourceSvg = parsed.documentElement
  const sourcePaths = [...sourceSvg.querySelectorAll('path')]
  if (!sourcePaths.length) return null

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('scene-drawing')
  svg.setAttribute('viewBox', sourceSvg.getAttribute('viewBox') || '0 0 600 360')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${title}原图中心线手绘稿`)
  svg.dataset.source = 'original-png-centerline'
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  sourcePaths.forEach((sourcePath, index) => {
    splitCompoundPathData(sourcePath.getAttribute('d') || '').forEach((strokeData, subIndex) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', strokeData)
      path.style.setProperty('--stroke-width', (1.48 + ((index + subIndex * 3) % 5) * 0.1).toFixed(2))
      svg.append(path)
    })
  })
  return svg
}

function typeSceneText(element, text, isActive = () => element.isConnected) {
  if (!element) return
  element.textContent = ''
  const cursor = document.createElement('span')
  cursor.className = 'typed-cursor'
  cursor.setAttribute('aria-hidden', 'true')
  element.append(cursor)
  const characters = Array.from(text)
  let index = 0
  const delay = characters.length > 300 ? 8 : 12

  const typeNext = () => {
    if (!isActive()) return
    if (index >= characters.length) {
      cursor.classList.add('is-done')
      element.classList.add('story-typed')
      return
    }
    element.insertBefore(document.createTextNode(characters[index]), cursor)
    index += 1
    window.setTimeout(typeNext, delay)
  }

  typeNext()
}

function renderIdentityCard(result, mode) {
  const identity = mode === 'fantasy' ? result.fantasyCard : result.card
  if (!identity) return ''
  const story = result.story
  const branch = mode === 'fantasy' ? result.fantasyBranch : result.branch
  const choice = branch ? story.options[branch.optionIndex] : '—'
  const tagLabel = mode === 'fantasy' ? '如果当时这样做，可能成为' : '后来成为'
  const sourceLabel = mode === 'fantasy' ? `如果当时选择：${choice}` : `本次选择：${choice}`
  return `<article class="identity-card identity-card-${mode}">
    <div class="identity-card-image">
      <img class="identity-original-fallback" src="assets/recreated/${story.id}.svg" alt="${story.title}中的手绘场景线稿" />
    </div>
    <div class="identity-card-body">
      <div class="identity-card-topline"><span>人物 0${result.index + 1}</span><span>${story.title}</span></div>
      <div class="identity-tag"><span>${tagLabel}</span><strong>${identity.title}</strong></div>
      <div class="identity-facts">
        <div><span>继续做了什么</span><b>${identity.continued || '—'}</b></div>
        <div><span>获得了什么</span><b>${identity.achievement || '—'}</b></div>
        <div><span>时间留下的痕迹</span><b>${identity.timeTrace || '—'}</b></div>
        <div><span>${identity.lastingTraceLabel || '—'}</span><b>${identity.lastingTrace || '—'}</b></div>
      </div>
      <p class="identity-branch-note">${sourceLabel}</p>
    </div>
  </article>`
}

function renderParentResultSummary(simulation) {
  const primary = simulation.primaryParentType
  if (!primary) return ''
  const shadow = simulation.shadowParentType
  const dimensions = parentResultDatabase?.dimensions || []
  const timeBills = simulation.timeBills.length
    ? simulation.timeBills.map((bill) => `<li>${bill}</li>`).join('')
    : '<li>没有明确的时间损失。</li>'
  return `<section class="parent-result-summary" aria-label="父母类型结算">
    <div class="parent-result-primary">
      <p class="result-kicker">10 个选择汇总 · 主型父母</p>
      <h3>你是：${primary.title}</h3>
      <p>${primary.image}</p>
    </div>
    ${shadow ? `<div class="parent-result-shadow"><span>影子型 · 可能留下的代价</span><strong>${shadow.title}</strong><p>${shadow.risk}</p></div>` : ''}
    <div class="parent-result-dimensions">
      ${dimensions.map((dimension) => `<div><span>${dimension.label}</span><strong>${simulation.dimensionTotals[dimension.id] || 0}</strong><small>${(simulation.dimensionTotals[dimension.id] || 0) >= 0 ? dimension.positive : dimension.negative}</small></div>`).join('')}
    </div>
    <div class="parent-result-time"><span>时间账单</span><ul>${timeBills}</ul></div>
  </section>`
}

function resultScreen() {
  const simulation = resolveSimulation()
  const gamificationSummary = renderGamificationSummary()
  resultDeckEntries = buildResultDeckEntries(simulation)
  return `<section class="result-page page-enter">
      <img class="test-logo result-logo" src="assets/darenkaoshi-logo.png" alt="《大人考试》" />
      <div class="result-heading result-heading-with-cards">
        <p class="result-kicker">最终结果 · 三类卡结算</p>
        <h2>这一次选择，<br />留下了怎样的后来？</h2>
        <p>每个故事会落成一张现实身份卡；如果有明确的支持分支，还会看到一张对应的幻想卡。</p>
        ${renderParentResultSummary(simulation)}
        ${renderResultCardDeck()}
      </div>
      <section class="result-scoreboard" aria-label="结果卡数量">
        <div class="result-score-item result-score-growth"><strong>${simulation.cardCounts.growth}</strong><span>获得的成长卡</span></div>
        <div class="result-score-item result-score-regret"><strong>${simulation.cardCounts.regret}</strong><span>留下的遗憾卡</span></div>
        <div class="result-score-item result-score-fantasy"><strong>${simulation.cardCounts.fantasy}</strong><span>错过的幻想卡</span></div>
      </section>
      ${gamificationSummary}
      <p class="identity-disclaimer">身份卡内容来自问卷事实与数据表中的分支推演。幻想卡不是已经发生的事实，也不是对未来的确定预言。</p>
      <div class="result-actions"><button class="ink-button" data-action="scenarios">再做一次 <span>↗</span></button><button class="text-button" data-action="home">回到首页</button></div>
    </section>`
}

function buildResultDeckEntries(simulation) {
  return simulation.cardResults.flatMap((result) => {
    const entries = []
    if (result.card && result.branch) entries.push({ result, mode: result.branch.resultType, key: `${result.index}:${result.branch.resultType}` })
    if (result.fantasyCard && result.fantasyBranch) entries.push({ result, mode: 'fantasy', key: `${result.index}:fantasy` })
    return entries
  })
}

function renderResultCardDeck() {
  const labels = { growth: '成长', regret: '留下', fantasy: '幻想' }
  if (!resultDeckEntries.length) {
    return `<section class="result-card-deck result-card-deck-empty"><p class="result-kicker">CARD REVEAL</p><h3>这一次没有生成身份卡。</h3></section>`
  }
  return `<section class="result-card-deck result-card-reveal" aria-labelledby="result-card-deck-title">
    <div class="result-card-deck-heading">
      <div><p class="result-kicker">CARD REVEAL · ${resultDeckEntries.length} CARDS</p><h3 id="result-card-deck-title">后来，<em>从纸面上浮出来。</em></h3></div>
      <span>点一张，打开它</span>
    </div>
    <div class="card-deck-stage" data-card-deck>
      <canvas class="card-deck-canvas" aria-label="可点击的 3D 身份卡牌堆"></canvas>
      <div class="card-deck-floor" aria-hidden="true"></div>
      <div class="card-deck-hint" aria-hidden="true">从底部弹出的后来 · 点击卡牌</div>
    </div>
    <div class="result-card-rail" role="list" aria-label="结果卡牌索引">
      ${resultDeckEntries.map((entry, index) => {
        const identity = entry.mode === 'fantasy' ? entry.result.fantasyCard : entry.result.card
        return `<button class="result-card-tab result-card-tab-${entry.mode}" type="button" role="listitem" data-card-index="${index}" aria-label="打开第 ${index + 1} 张${labels[entry.mode]}：${identity.title}"><span>${String(index + 1).padStart(2, '0')}</span><b>${identity.title}</b></button>`
      }).join('')}
    </div>
    <div class="selected-card-detail" data-card-detail aria-live="polite" hidden></div>
  </section>`
}

function renderGamificationSummary() {
  if (!gamificationProfile || !gamificationRules) return ''
  const progress = getLevelProgress(gamificationProfile, gamificationRules)
  const unlocked = gamificationProfile.unlockedAchievementIds
    .map((id) => getAchievementById(gamificationRules, id))
    .filter(Boolean)
  const collection = gamificationProfile.collection || {}
  const collectionCount = ['growth', 'regret', 'fantasy'].reduce((sum, type) => sum + (collection[type]?.length || 0), 0)
  const nextLevelCopy = progress.next
    ? `距离「${progress.next.title}」还差 ${Math.max(0, Number(progress.next.minXp) - gamificationProfile.xp)} 点`
    : '你已经看完了当前版本的全部等级'
  return `<section class="gamification-summary" aria-labelledby="gamification-title">
    <div class="gamification-heading">
      <div>
        <p class="result-kicker">LOCAL GUEST ARCHIVE</p>
        <h3 id="gamification-title">你的答卷档案</h3>
      </div>
      <span class="gamification-level">第 ${gamificationProfile.level} 级 · ${gamificationProfile.levelTitle}</span>
    </div>
    <p class="gamification-copy">这里记录的是你走过哪些场景、留下哪些选择，不是对你是不是好父母的评分。</p>
    <div class="gamification-progress-meta"><span>${gamificationProfile.xp} XP</span><span>${nextLevelCopy}</span></div>
    <div class="gamification-progress" role="progressbar" aria-valuenow="${Math.round(progress.progress * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.round(progress.progress * 100)}%"></span></div>
    <div class="gamification-stats">
      <div><strong>${gamificationProfile.stats.completedAttempts}</strong><span>完成答卷</span></div>
      <div><strong>${gamificationProfile.stats.answeredScenes}</strong><span>累计作答</span></div>
      <div><strong>${collectionCount}</strong><span>收进档案的卡</span></div>
    </div>
    <div class="gamification-achievements">
      <div class="gamification-achievement-heading"><span>已解锁的成就</span><b>${unlocked.length}/${gamificationRules.achievements.length}</b></div>
      ${unlocked.length ? `<div class="achievement-list">${unlocked.map((achievement) => `<article class="achievement-item"><span class="achievement-mark">✓</span><div><strong>${achievement.title}</strong><p>${achievement.description}</p></div></article>`).join('')}</div>` : '<p class="gamification-empty">完成第一个场景后，这里会留下第一笔记录。</p>'}
    </div>
  </section>`
}

function drawCardTexture(entry, index) {
  const canvas = document.createElement('canvas')
  canvas.width = 500
  canvas.height = 700
  const context = canvas.getContext('2d')
  const labels = { growth: '成长卡', regret: '留下的卡', fantasy: '幻想卡' }
  const identity = entry.mode === 'fantasy' ? entry.result.fantasyCard : entry.result.card
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#11110f'
  context.lineWidth = 8
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  context.lineWidth = 3
  context.strokeRect(31, 31, canvas.width - 62, canvas.height - 62)
  context.fillStyle = '#11110f'
  context.font = '700 24px Arial, sans-serif'
  context.fillText(String(index + 1).padStart(2, '0'), 56, 86)
  context.font = '700 21px Arial, sans-serif'
  context.fillText(labels[entry.mode], 328, 86)
  context.beginPath()
  context.moveTo(56, 116)
  context.lineTo(444, 116)
  context.stroke()

  context.font = '700 47px "STKaiti", "KaiTi", serif'
  const titleLines = wrapCanvasText(context, identity?.title || '身份卡', 56, 190, 370, 62)
  context.font = '400 22px "STKaiti", "KaiTi", serif'
  context.fillText('后来成为', 56, 142)
  context.strokeStyle = '#11110f'
  context.lineWidth = 2
  context.beginPath()
  context.ellipse(250, 335, 174, 91, -0.12, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.ellipse(252, 340, 181, 87, 0.08, 0, Math.PI * 2)
  context.stroke()
  context.font = '400 20px Arial, sans-serif'
  context.fillText('《大人考试｜父母卷》', 56, 610)
  context.font = '400 18px Arial, sans-serif'
  context.fillText(entry.mode === 'fantasy' ? '如果当时这样做' : '这一次选择', 56, 648)
  return { canvas, titleLines }
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const characters = Array.from(text || '')
  const lines = []
  let line = ''
  characters.forEach((character) => {
    const candidate = line + character
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = character
    } else {
      line = candidate
    }
  })
  if (line) lines.push(line)
  lines.slice(0, 3).forEach((lineText, lineIndex) => context.fillText(lineText, x, y + lineIndex * lineHeight))
  return lines
}

function showResultCard(index) {
  const entry = resultDeckEntries[index]
  if (!entry) return
  const detail = document.querySelector('[data-card-detail]')
  if (!detail) return
  detail.hidden = false
  detail.classList.add('is-open')
  detail.innerHTML = `<div class="card-detail-scrim" data-card-close="true" aria-hidden="true"></div><div class="card-detail-dialog" role="dialog" aria-modal="true" aria-label="${entry.mode === 'fantasy' ? '幻想身份卡' : '现实身份卡'}详情"><button class="card-detail-close" type="button" data-card-close="true" aria-label="关闭卡牌详情">收起 ×</button>${renderIdentityCard(entry.result, entry.mode)}</div>`
  prepareIdentityCardImages(detail)
  activeResultCardDeck?.focusCard(index)
  detail.querySelectorAll('[data-card-close]').forEach((element) => element.addEventListener('click', closeResultCard))
  detail.querySelector('.card-detail-close')?.focus()
}

function closeResultCard() {
  const detail = document.querySelector('[data-card-detail]')
  if (!detail) return
  detail.classList.remove('is-open')
  detail.hidden = true
  detail.replaceChildren()
}

function prepareResultCardDeck() {
  const root = document.querySelector('[data-card-deck]')
  if (!root || root.dataset.ready === 'true' || !resultDeckEntries.length) return
  root.dataset.ready = 'true'
  document.querySelectorAll('[data-card-index]').forEach((button) => {
    button.addEventListener('click', () => showResultCard(Number(button.dataset.cardIndex)))
  })
  activeResultCardDeck = createResultCardDeck(root, resultDeckEntries)
  window.requestAnimationFrame(() => root.classList.add('is-ready'))
}

function createResultCardDeck(root, entries) {
  const canvas = root.querySelector('.card-deck-canvas')
  if (!canvas) return null
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  } catch (error) {
    root.classList.add('is-fallback')
    return { focusCard() {}, destroy() {} }
  }
  renderer.setClearColor(0xffffff, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-500, 500, 280, -280, -100, 100)
  camera.position.z = 50
  const group = new THREE.Group()
  scene.add(group)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const meshes = []
  const shadowMeshes = []
  const textures = []
  const materials = []
  let selectedIndex = -1
  let hoveredIndex = -1
  let frameId = 0
  let disposed = false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  entries.forEach((entry, index) => {
    const textureCanvas = drawCardTexture(entry, index).canvas
    const texture = new THREE.CanvasTexture(textureCanvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const frontMaterial = new THREE.MeshBasicMaterial({ map: texture })
    const paperMaterial = new THREE.MeshBasicMaterial({ color: 0xf7f4eb })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(218, 306, 12), [paperMaterial, paperMaterial, paperMaterial, paperMaterial, frontMaterial, paperMaterial])
    mesh.userData.cardIndex = index
    mesh.position.z = index * 1.4
    group.add(mesh)
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x11110f, transparent: true, opacity: 0.16, depthWrite: false })
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(228, 318), shadowMaterial)
    shadow.position.z = index * 1.4 - 8
    group.add(shadow)
    meshes.push(mesh)
    shadowMeshes.push(shadow)
    textures.push(texture)
    materials.push(frontMaterial, paperMaterial, shadowMaterial)
  })

  const resize = () => {
    const rect = root.getBoundingClientRect()
    renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false)
    renderer.render(scene, camera)
  }

  const renderStaticFrame = () => renderer.render(scene, camera)

  const layout = () => {
    const center = (meshes.length - 1) / 2
    const spread = Math.min(82, 760 / Math.max(1, meshes.length - 1))
    meshes.forEach((mesh, index) => {
      const offset = index - center
      mesh.userData.target = {
        x: offset * spread,
        y: -Math.abs(offset) * 14 + (index === hoveredIndex ? 18 : 0),
        z: index * 1.4 + (index === selectedIndex ? 34 : 0),
        rotation: offset * -0.055 + (index === hoveredIndex ? 0.025 : 0),
        rotationX: index === hoveredIndex ? -0.1 : Math.abs(offset) * 0.008,
        rotationY: offset * 0.028,
        scale: index === selectedIndex ? 1.06 : 1
      }
      const shadow = shadowMeshes[index]
      shadow.userData.target = {
        x: mesh.userData.target.x + 10,
        y: mesh.userData.target.y - 13,
        z: mesh.userData.target.z - 8,
        rotation: mesh.userData.target.rotation,
        rotationX: mesh.userData.target.rotationX,
        rotationY: mesh.userData.target.rotationY,
        scale: mesh.userData.target.scale
      }
      if (!mesh.userData.hasEntered) {
        mesh.position.set(mesh.userData.target.x * 1.25, 420, mesh.userData.target.z - 28)
        mesh.rotation.set(0.28, mesh.userData.target.rotationY * 1.5, mesh.userData.target.rotation)
        mesh.scale.setScalar(0.68)
        shadow.position.set(mesh.position.x + 14, mesh.position.y - 12, mesh.position.z - 8)
        shadow.rotation.copy(mesh.rotation)
        shadow.scale.setScalar(0.68)
        mesh.userData.hasEntered = true
      }
    })
  }

  const animate = () => {
    if (disposed) return
    if (document.visibilityState !== 'visible') {
      frameId = 0
      return
    }
    meshes.forEach((mesh) => {
      const target = mesh.userData.target
      if (!target) return
      mesh.position.x += (target.x - mesh.position.x) * 0.14
      mesh.position.y += (target.y - mesh.position.y) * 0.14
      mesh.position.z += (target.z - mesh.position.z) * 0.14
      mesh.rotation.x += (target.rotationX - mesh.rotation.x) * 0.14
      mesh.rotation.y += (target.rotationY - mesh.rotation.y) * 0.14
      mesh.rotation.z += (target.rotation - mesh.rotation.z) * 0.14
      mesh.scale.x += (target.scale - mesh.scale.x) * 0.14
      mesh.scale.y += (target.scale - mesh.scale.y) * 0.14
      mesh.scale.z += (target.scale - mesh.scale.z) * 0.14
      const shadow = shadowMeshes[mesh.userData.cardIndex]
      const shadowTarget = shadow?.userData.target
      if (shadow && shadowTarget) {
        shadow.position.x += (shadowTarget.x - shadow.position.x) * 0.14
        shadow.position.y += (shadowTarget.y - shadow.position.y) * 0.14
        shadow.position.z += (shadowTarget.z - shadow.position.z) * 0.14
        shadow.rotation.x += (shadowTarget.rotationX - shadow.rotation.x) * 0.14
        shadow.rotation.y += (shadowTarget.rotationY - shadow.rotation.y) * 0.14
        shadow.rotation.z += (shadowTarget.rotation - shadow.rotation.z) * 0.14
        shadow.scale.x += (shadowTarget.scale - shadow.scale.x) * 0.14
        shadow.scale.y += (shadowTarget.scale - shadow.scale.y) * 0.14
      }
    })
    renderStaticFrame()
    frameId = window.requestAnimationFrame(animate)
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !reducedMotion && frameId === 0) animate()
  }

  const hitTest = (event) => {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(meshes)[0]?.object?.userData?.cardIndex ?? -1
  }

  const handlePointerMove = (event) => {
    const nextIndex = hitTest(event)
    if (nextIndex === hoveredIndex) return
    hoveredIndex = nextIndex
    canvas.style.cursor = hoveredIndex >= 0 ? 'pointer' : 'default'
    layout()
    if (reducedMotion) renderStaticFrame()
  }
  const handlePointerLeave = () => {
    hoveredIndex = -1
    canvas.style.cursor = 'default'
    layout()
    if (reducedMotion) renderStaticFrame()
  }
  const handlePointerDown = (event) => {
    const nextIndex = hitTest(event)
    if (nextIndex >= 0) showResultCard(nextIndex)
  }

  const focusCard = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= meshes.length) return
    selectedIndex = index
    layout()
    if (reducedMotion) renderStaticFrame()
  }

  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerleave', handlePointerLeave)
  canvas.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  layout()
  resize()
  if (reducedMotion) renderStaticFrame()
  else animate()
  return {
    focusCard,
    destroy() {
      disposed = true
      window.cancelAnimationFrame(frameId)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      meshes.forEach((mesh) => {
        mesh.geometry.dispose()
        group.remove(mesh)
      })
      shadowMeshes.forEach((shadow) => {
        shadow.geometry.dispose()
        group.remove(shadow)
      })
      materials.forEach((material) => material.dispose())
      textures.forEach((texture) => texture.dispose())
      renderer.dispose()
    }
  }
}

function prepareIdentityCardImages() {
  document.querySelectorAll('.identity-original-fallback').forEach((image) => {
    if (image.dataset.normalized === 'pending' || image.dataset.normalized === 'done') return
    image.dataset.normalized = 'pending'
    const source = image.getAttribute('src')
    fetch(source)
      .then((response) => response.ok ? response.text() : Promise.reject(new Error(`Missing identity asset: ${source}`)))
      .then((svgString) => {
        const parsed = new DOMParser().parseFromString(svgString, 'image/svg+xml')
        if (parsed.querySelector('parsererror')) throw new Error(`Invalid identity SVG: ${source}`)
        const sourceSvg = parsed.documentElement
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.classList.add('identity-scene-svg')
        svg.setAttribute('viewBox', sourceSvg.getAttribute('viewBox') || '0 0 600 360')
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        svg.setAttribute('role', 'img')
        svg.setAttribute('aria-label', image.alt)
        sourceSvg.querySelectorAll('path').forEach((sourcePath) => {
          const path = sourcePath.cloneNode(true)
          path.removeAttribute('style')
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', '#000000')
          path.setAttribute('stroke-width', '2')
          path.setAttribute('stroke-opacity', '1')
          path.setAttribute('opacity', '1')
          path.setAttribute('vector-effect', 'non-scaling-stroke')
          path.setAttribute('stroke-linecap', 'round')
          path.setAttribute('stroke-linejoin', 'round')
          svg.append(path)
        })
        image.replaceWith(svg)
        svg.dataset.normalized = 'done'
      })
      .catch(() => {
        image.dataset.normalized = 'error'
      })
  })
}

function bindSceneNavigatorDragGuards() {
  document.querySelectorAll('.scene-test-list').forEach((list) => {
    let pointerStartX = null
    let dragged = false
    let suppressClick = false
    let clearSuppressionTimer = null

    const finishPointer = () => {
      if (dragged) {
        suppressClick = true
        window.clearTimeout(clearSuppressionTimer)
        clearSuppressionTimer = window.setTimeout(() => {
          suppressClick = false
        }, 450)
      }
      pointerStartX = null
      dragged = false
    }

    list.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerStartX = event.clientX
      dragged = false
    }, { passive: true })

    list.addEventListener('pointermove', (event) => {
      if (pointerStartX === null) return
      if (Math.abs(event.clientX - pointerStartX) > 8) dragged = true
    }, { passive: true })

    list.addEventListener('pointerup', finishPointer, { passive: true })
    list.addEventListener('pointercancel', finishPointer, { passive: true })
    list.addEventListener('pointerleave', finishPointer, { passive: true })
    list.addEventListener('lostpointercapture', finishPointer, { passive: true })
    list.addEventListener('click', (event) => {
      if (!suppressClick) return
      suppressClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }, true)
  })
}

function bindActions() {
  bindSceneNavigatorDragGuards()
  document.querySelectorAll('[data-action]').forEach((element) => element.addEventListener('click', () => {
    const action = element.dataset.action
    if (action === 'home') {
      cancelAnswerTransition()
      state.screen = 'home'
      state.scenarioIndex = 0
      state.selectedAnswer = null
    }
    if (action === 'scenarios' || action === 'start-test') {
      cancelAnswerTransition()
      state.screen = 'question'
      state.scenarioIndex = 0
      state.answers = {}
      state.selectedAnswer = null
      state.attemptId = createLocalId('attempt')
      saveGuestAttempt({ status: 'in_progress', currentScenarioIndex: 0 })
      recordGamificationEvent({
        id: `attempt:${state.attemptId}:started`,
        type: 'attempt_started',
        attemptId: state.attemptId,
        createdAt: new Date().toISOString()
      })
    }
    if (action === 'open-scenario') {
      cancelAnswerTransition()
      state.screen = 'question'
      state.scenarioIndex = Number(element.dataset.index)
      state.selectedAnswer = state.answers[state.scenarioIndex] ?? null
      saveGuestAttempt()
    }
    if (action === 'answer') {
      if (state.transitioning) return
      const answeredScenarioIndex = state.scenarioIndex
      const transitionToken = ++answerTransitionToken
      state.transitioning = true
      state.selectedAnswer = Number(element.dataset.index)
      state.answers[state.scenarioIndex] = state.selectedAnswer
      const answeredStory = scenarios[state.scenarioIndex]
      recordGamificationEvent({
        id: `attempt:${state.attemptId}:story:${answeredStory.id}:answered`,
        type: 'scene_answered',
        attemptId: state.attemptId,
        storyId: answeredStory.id,
        optionIndex: state.selectedAnswer,
        createdAt: new Date().toISOString()
      })
      const nextIndex = Math.min(state.scenarioIndex + 1, scenarios.length - 1)
      saveGuestAttempt({
        status: state.scenarioIndex === scenarios.length - 1 ? 'completed' : 'in_progress',
        currentScenarioIndex: nextIndex
      })
      element.classList.add('selected')
      answerTransitionTimer = window.setTimeout(() => {
        answerTransitionTimer = null
        if (transitionToken !== answerTransitionToken || state.scenarioIndex !== answeredScenarioIndex) return
        state.screen = answeredScenarioIndex === scenarios.length - 1 ? 'result' : 'question'
        state.scenarioIndex = Math.min(answeredScenarioIndex + 1, scenarios.length - 1)
        state.selectedAnswer = state.answers[state.scenarioIndex] ?? null
        if (state.screen === 'result') recordCompletedAttempt()
        state.transitioning = false
        render()
      }, 220)
      return
    }
    render()
  }))
}

loadGameData()
