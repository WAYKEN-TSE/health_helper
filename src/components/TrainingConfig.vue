<template>
  <div class="section">
    <div class="section__title">⚙️ 训练计划</div>
    <div class="card">
      <!-- 训练日 / 休息日 切换 -->
      <div class="toggle-group">
        <button
          class="toggle-group__item"
          :class="{ 'toggle-group__item--active': isTrainingDay }"
          @click="$emit('update:isTrainingDay', true)"
        >🏸 训练日</button>
        <button
          class="toggle-group__item"
          :class="{ 'toggle-group__item--active': !isTrainingDay }"
          @click="$emit('update:isTrainingDay', false)"
        >😴 休息日</button>
      </div>

      <!-- 训练时间选择 -->
      <transition name="slide">
        <div v-if="isTrainingDay" class="time-row">
          <div class="time-field">
            <label class="time-field__label">开始时间</label>
            <input
              type="time"
              class="time-input"
              :value="trainingStart"
              @input="$emit('update:trainingStart', $event.target.value)"
            />
          </div>
          <div class="time-field__separator">→</div>
          <div class="time-field">
            <label class="time-field__label">结束时间</label>
            <input
              type="time"
              class="time-input"
              :value="trainingEnd"
              @input="$emit('update:trainingEnd', $event.target.value)"
            />
          </div>
        </div>
      </transition>

      <!-- 三餐标签结果 -->
      <div class="tag-display" v-if="mealTags">
        <div v-for="(tag, slot) in mealTags" :key="slot" class="tag-display__item">
          <span class="tag-display__meal">{{ mealLabels[slot] }}</span>
          <span class="badge" :class="badgeClass(tag)">{{ tagLabels[tag] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MEAL_LABELS, TAG_LABELS } from '../data/recipes.js'

const props = defineProps({
  isTrainingDay: Boolean,
  trainingStart: String,
  trainingEnd: String,
  mealTags: Object
})

defineEmits(['update:isTrainingDay', 'update:trainingStart', 'update:trainingEnd'])

const mealLabels = MEAL_LABELS
const tagLabels = TAG_LABELS

function badgeClass(tag) {
  return {
    'badge--amber': tag === 'pre_workout',
    'badge--green': tag === 'post_workout',
    'badge--blue': tag === 'rest_day'
  }
}
</script>

<style scoped>
.time-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  justify-content: center;
}

.time-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.time-field__label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.time-field__separator {
  color: var(--text-muted);
  font-size: var(--font-lg);
  margin-top: var(--space-lg);
}

.tag-display {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}

.tag-display__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.tag-display__meal {
  font-size: var(--font-xs);
  color: var(--text-muted);
  font-weight: 600;
}

/* 过渡 */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--duration-normal) var(--ease-out);
  max-height: 120px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
