/**
 * 菜谱数据模块
 * 从 JSON 导入基础数据，合并 localStorage 中的自定义数据
 */
import baseData from '../../data/recipes.json'

/** 深拷贝基础数据，避免运行时污染原始模块 */
export function getRecipesData() {
  return JSON.parse(JSON.stringify(baseData))
}

/** 获取所有食材（平铺为一维数组） */
export function getAllIngredients(data) {
  const { carbs, protein, micronutrients, snack } = data.ingredients
  return [...carbs, ...protein, ...micronutrients, ...snack]
}

/** 按分类获取食材 */
export function getIngredientsByCategory(data) {
  return {
    碳水: data.ingredients.carbs,
    蛋白质: data.ingredients.protein,
    微量元素: data.ingredients.micronutrients,
    加餐: data.ingredients.snack
  }
}

/** 通过 id 查找食材 */
export function getIngredientById(data, id) {
  const all = getAllIngredients(data)
  return all.find(item => item.id === id)
}

/** 餐次中文名映射 */
export const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
}

/** 标签中文名映射 */
export const TAG_LABELS = {
  pre_workout: '练前餐',
  post_workout: '练后餐',
  rest_day: '日常餐'
}

/** 标签颜色映射 */
export const TAG_COLORS = {
  pre_workout: '#f59e0b',
  post_workout: '#2dd4a0',
  rest_day: '#60a5fa'
}
