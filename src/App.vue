<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
        <img src="/favicon.jpg" alt="品牌Logo" style="width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
        <h1 class="app-header__title" style="margin: 0;">菜篮盲盒</h1>
      </div>
      <p class="app-header__subtitle" style="font-size: 0.9em; opacity: 0.85; margin-top: 4px;">练前‘加Buff’，练后‘爆神装’，转盘一响，好饭开箱。</p>
    </header>

    <!-- 训练计划设置 -->
    <TrainingConfig
      v-model:is-training-day="isTrainingDay"
      v-model:training-start="trainingStart"
      v-model:training-end="trainingEnd"
      :meal-tags="mealTags"
    />

    <!-- 食材管理 -->
    <IngredientPanel
      :recipes-data="recipesData"
      v-model:selected="selectedIngredients"
      v-model:custom-ingredients="customIngredients"
      v-model:deleted-ingredients="deletedIngredients"
    />

    <!-- 老虎机 -->
    <SlotMachine
      :pools="pools"
      :meal-tags="mealTags"
      :locked-meals="lockedMeals"
      :recipes-data="recipesData"
      @update:locked-meals="v => lockedMeals = v"
      @show-detail="showRecipeDetail"
      @all-done="handleAllDone"
    />

    <!-- 菜谱详情弹窗 -->
    <RecipeDetail
      :recipe="detailRecipe"
      :recipes-data="recipesData"
      @close="detailRecipe = null"
    />

    <!-- 黑巧加餐 Toast -->
    <SnackAlert
      :snack-data="snackData"
      :show="showSnack"
      @dismiss="showSnack = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getRecipesData, getAllIngredients } from './data/recipes.js'
import { useMealFilter } from './composables/useMealFilter.js'
import { useStorage } from './composables/useStorage.js'
import TrainingConfig from './components/TrainingConfig.vue'
import IngredientPanel from './components/IngredientPanel.vue'
import SlotMachine from './components/SlotMachine.vue'
import RecipeDetail from './components/RecipeDetail.vue'
import SnackAlert from './components/SnackAlert.vue'

// ── 数据源 ──
const recipesData = ref(getRecipesData())

// ── 持久化状态 ──
const isTrainingDay = useStorage('isTrainingDay', true)
const trainingStart = useStorage('trainingStart', '09:00')
const trainingEnd = useStorage('trainingEnd', '11:00')
const customIngredients = useStorage('customIngredients', [])
const deletedIngredients = useStorage('deletedIngredients', [])

// 默认全选所有食材
const defaultSelectedIds = getAllIngredients(recipesData.value).map(i => i.id)
const selectedIngredients = useStorage('selectedIngredients', defaultSelectedIds)

// ── 非持久化状态 ──
const lockedMeals = ref({ breakfast: false, lunch: false, dinner: false })
const detailRecipe = ref(null)
const showSnack = ref(false)
const snackData = ref(null)

// ── 过滤引擎 ──
const { mealTags, pools, rollSnack } = useMealFilter(
  recipesData,
  selectedIngredients,
  isTrainingDay,
  trainingStart,
  trainingEnd
)

// ── 事件处理 ──
function showRecipeDetail(recipe) {
  detailRecipe.value = recipe
}

function handleAllDone() {
  // 所有转盘停止后，触发黑巧概率判定
  const result = rollSnack()
  if (result.triggered) {
    snackData.value = result.data
    showSnack.value = true
  }
}
</script>
