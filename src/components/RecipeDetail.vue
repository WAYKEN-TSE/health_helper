<template>
  <teleport to="body">
    <div v-if="recipe" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <!-- 头部 -->
        <div class="detail-header">
          <div class="detail-header__top">
            <span class="badge" :class="badgeClass">{{ tagLabel }}</span>
            <button class="btn btn--ghost btn--sm" @click="$emit('close')">✕</button>
          </div>
          <h2 class="detail-header__name">{{ recipe.name }}</h2>
        </div>

        <!-- 营养概览 -->
        <div class="nutrition-summary">
          <div class="nutrition-summary__item" v-for="item in nutritionItems" :key="item.label">
            <span class="nutrition-summary__value" :style="{ color: item.color }">{{ item.value }}</span>
            <span class="nutrition-summary__label">{{ item.label }}</span>
          </div>
        </div>

        <!-- 营养条形图 -->
        <div class="nutrition-bar">
          <div
            class="nutrition-bar__segment"
            :style="{ width: carbPercent + '%', background: 'var(--accent-amber)' }"
            title="碳水"
          ></div>
          <div
            class="nutrition-bar__segment"
            :style="{ width: proteinPercent + '%', background: 'var(--accent-green)' }"
            title="蛋白质"
          ></div>
          <div
            class="nutrition-bar__segment"
            :style="{ width: fatPercent + '%', background: 'var(--accent-blue)' }"
            title="脂肪"
          ></div>
        </div>

        <!-- 食材配比 -->
        <div class="detail-section">
          <h3 class="detail-section__title">📦 食材配比</h3>
          <div class="portions-grid">
            <div
              v-for="(portion, ingId) in recipe.portions"
              :key="ingId"
              class="portion-chip"
            >
              <span class="portion-chip__name">{{ getIngredientName(ingId) }}</span>
              <span class="portion-chip__amount">{{ portion }}</span>
            </div>
          </div>
        </div>

        <!-- 烹饪步骤 -->
        <div class="detail-section">
          <h3 class="detail-section__title">👨‍🍳 烹饪步骤</h3>
          
          <template v-if="recipe.steps && recipe.steps.length > 0">
            <ol class="steps-list">
              <li
                v-for="(step, idx) in recipe.steps"
                :key="idx"
                class="steps-list__item"
              >{{ step }}</li>
            </ol>
          </template>
          
          <template v-else-if="recipe.custom_steps">
            <div class="custom-steps-block">
              {{ recipe.custom_steps }}
            </div>
          </template>
          
          <template v-else>
            <div class="custom-steps-block empty-text">
              详细做法：暂无
            </div>
          </template>
        </div>

        <!-- 运动员 Tips -->
        <div class="detail-section">
          <div class="tip-card">
            <span class="tip-card__icon">💡</span>
            <strong>运动员 Tips：</strong>{{ recipe.tips }}
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'
import { TAG_LABELS, getIngredientById } from '../data/recipes.js'

const props = defineProps({
  recipe: Object,
  recipesData: Object
})

defineEmits(['close'])

const tagLabel = computed(() => TAG_LABELS[props.recipe?.mealTag] || '日常餐')

const badgeClass = computed(() => ({
  'badge--amber': props.recipe?.mealTag === 'pre_workout',
  'badge--green': props.recipe?.mealTag === 'post_workout',
  'badge--blue': props.recipe?.mealTag === 'rest_day'
}))

const nutritionItems = computed(() => {
  if (!props.recipe?.nutrition) return []
  const n = props.recipe.nutrition
  return [
    { label: '热量', value: n.calories + ' kcal', color: 'var(--text-primary)' },
    { label: '碳水', value: n.carbs + 'g', color: 'var(--accent-amber)' },
    { label: '蛋白', value: n.protein + 'g', color: 'var(--accent-green)' },
    { label: '脂肪', value: n.fat + 'g', color: 'var(--accent-blue)' },
    { label: '纤维', value: n.fiber + 'g', color: 'var(--text-secondary)' }
  ]
})

const totalMacro = computed(() => {
  if (!props.recipe?.nutrition) return 1
  const n = props.recipe.nutrition
  return n.carbs + n.protein + n.fat || 1
})

const carbPercent = computed(() => ((props.recipe?.nutrition?.carbs || 0) / totalMacro.value * 100).toFixed(0))
const proteinPercent = computed(() => ((props.recipe?.nutrition?.protein || 0) / totalMacro.value * 100).toFixed(0))
const fatPercent = computed(() => ((props.recipe?.nutrition?.fat || 0) / totalMacro.value * 100).toFixed(0))

function getIngredientName(id) {
  const ing = getIngredientById(props.recipesData, id)
  return ing ? ing.name : id
}
</script>

<style scoped>
.detail-header {
  margin-bottom: var(--space-lg);
}

.detail-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.detail-header__name {
  font-size: var(--font-2xl);
  font-weight: 900;
  line-height: 1.3;
  color: var(--text-primary);
}

.nutrition-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border-radius: var(--radius-md);
}

.nutrition-summary__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.nutrition-summary__value {
  font-size: var(--font-md);
  font-weight: 700;
}

.nutrition-summary__label {
  font-size: var(--font-xs);
  color: var(--text-muted);
}

.detail-section {
  margin-top: var(--space-lg);
}

.detail-section__title {
  font-size: var(--font-md);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
}

.portions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.portion-chip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.portion-chip__name {
  font-weight: 600;
  font-size: var(--font-sm);
}

.portion-chip__amount {
  font-size: var(--font-xs);
  color: var(--accent-green);
  font-weight: 500;
}

.custom-steps-block {
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  background: rgba(255, 255, 255, 0.05);
  padding: var(--space-md);
  border-radius: var(--radius-sm);
}

.empty-text {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}
</style>
