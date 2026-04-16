import { computed } from 'vue'

/**
 * MealFilter composable
 * 将过滤引擎包装为 Vue 响应式 API
 */
export function useMealFilter(recipesData, selectedIds, isTrainingDay, trainingStart, trainingEnd) {

  /** "HH:mm" → 当天分钟数 */
  function parseTime(str) {
    if (!str) return null
    const [h, m] = str.split(':').map(Number)
    return h * 60 + m
  }

  /** 固定用餐时间窗口 */
  const MEAL_WINDOWS = {
    breakfast: { start: 6 * 60, end: 9 * 60 },
    lunch: { start: 11 * 60, end: 13 * 60 },
    dinner: { start: 17 * 60, end: 20 * 60 }
  }

  /**
   * 判定某餐次的营养标签
   * @param {"breakfast"|"lunch"|"dinner"} slot
   * @returns {"pre_workout"|"post_workout"|"rest_day"}
   */
  function getMealTag(slot) {
    if (!isTrainingDay.value) return 'rest_day'

    const tStart = parseTime(trainingStart.value)
    const tEnd = parseTime(trainingEnd.value)
    if (tStart === null || tEnd === null) return 'rest_day'

    const win = MEAL_WINDOWS[slot]
    const mid = (win.start + win.end) / 2

    if (mid >= tStart - 180 && mid <= tStart - 60) return 'pre_workout'
    if (mid >= tEnd && mid <= tEnd + 60) return 'post_workout'
    return 'rest_day'
  }

  /** 三餐标签（响应式计算） */
  const mealTags = computed(() => ({
    breakfast: getMealTag('breakfast'),
    lunch: getMealTag('lunch'),
    dinner: getMealTag('dinner')
  }))

  /**
   * 获取某餐次的可用菜谱池
   * @param {"breakfast"|"lunch"|"dinner"} slot
   * @returns {Object[]}
   */
  function getPool(slot) {
    const data = recipesData.value
    if (!data || !data.recipes) return []

    const tag = getMealTag(slot)
    const tagRecipes = data.recipes[tag] || []
    const ids = new Set(selectedIds.value)

    return tagRecipes.filter(r =>
      r.suitableMeals.includes(slot) &&
      r.ingredientIds.every(id => ids.has(id))
    )
  }

  /** 各餐次奖池（响应式计算） */
  const pools = computed(() => ({
    breakfast: getPool('breakfast'),
    lunch: getPool('lunch'),
    dinner: getPool('dinner')
  }))

  /** 随机抽取 */
  function spin(slot) {
    const pool = getPool(slot)
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /** 黑巧加餐判定 */
  function rollSnack() {
    const data = recipesData.value
    if (!data || !data.snackTrigger) return { triggered: false, data: null }

    const { triggerProbability, conditions } = data.snackTrigger
    const tag = isTrainingDay.value ? 'post_workout' : 'rest_day'
    if (!conditions.includes(tag)) return { triggered: false, data: null }

    return {
      triggered: Math.random() < triggerProbability,
      data: data.snackTrigger
    }
  }

  return {
    mealTags,
    pools,
    getMealTag,
    getPool,
    spin,
    rollSnack
  }
}
