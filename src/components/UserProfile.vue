<template>
  <div class="section">
    <div class="section__title">👤 个人信息</div>
    <div class="card">
      <!-- 性别切换 -->
      <div class="toggle-group">
        <button
          class="toggle-group__item"
          :class="{ 'toggle-group__item--active': profile.gender === 'male' }"
          @click="update('gender', 'male')"
        >♂️ 男</button>
        <button
          class="toggle-group__item"
          :class="{ 'toggle-group__item--active': profile.gender === 'female' }"
          @click="update('gender', 'female')"
        >♀️ 女</button>
      </div>

      <!-- 年龄 / 身高 / 体重 -->
      <div class="profile-grid">
        <div class="profile-field">
          <label class="profile-field__label">年龄</label>
          <div class="profile-input-wrap">
            <input
              type="number" inputmode="numeric" min="1" max="120"
              class="profile-input"
              :value="profile.age"
              placeholder="0"
              @input="update('age', $event.target.value)"
            />
            <span class="profile-unit">岁</span>
          </div>
        </div>

        <div class="profile-field">
          <label class="profile-field__label">身高</label>
          <div class="profile-input-wrap">
            <input
              type="number" inputmode="numeric" min="50" max="250"
              class="profile-input"
              :value="profile.height"
              placeholder="0"
              @input="update('height', $event.target.value)"
            />
            <span class="profile-unit">cm</span>
          </div>
        </div>

        <div class="profile-field">
          <label class="profile-field__label">体重</label>
          <div class="profile-input-wrap">
            <input
              type="number" inputmode="decimal" min="20" max="300" step="0.1"
              class="profile-input"
              :value="profile.weight"
              placeholder="0"
              @input="update('weight', $event.target.value)"
            />
            <span class="profile-unit">kg</span>
          </div>
        </div>
      </div>

      <!-- 计算结果：BMI + 每日能量/营养目标 -->
      <div v-if="metrics && metrics.valid" class="metrics-block">
        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-card__value" :style="{ color: metrics.bmiColor }">{{ metrics.bmi }}</span>
            <span class="metric-card__label">BMI · {{ metrics.bmiLevel }}</span>
          </div>

          <!-- 每日热量：可自定义编辑 -->
          <div
            class="metric-card metric-card--editable"
            :class="{ 'metric-card--custom': metrics.isCustomCalories }"
            @click="startEditCalories"
          >
            <div v-if="!editingCalories" class="metric-card__value-row">
              <span class="metric-card__value">{{ metrics.tdee }}</span>
              <span class="metric-card__edit-icon">✏️</span>
            </div>
            <input
              v-else
              ref="calInputRef"
              type="number" inputmode="numeric" min="0" max="10000"
              class="metric-card__input"
              :value="metrics.tdee"
              @blur="commitCalories"
              @keyup.enter="commitCalories"
              @keyup.esc="editingCalories = false"
              @click.stop
            />
            <span class="metric-card__label">
              每日热量 kcal{{ metrics.isCustomCalories ? ' · 自定义' : '' }}
            </span>
          </div>

          <div class="metric-card">
            <span class="metric-card__value">{{ metrics.bmr }}</span>
            <span class="metric-card__label">基础代谢 kcal</span>
          </div>
        </div>

        <div class="macro-row">
          <div class="macro-item">
            <span class="macro-item__dot" style="background: var(--accent-amber)"></span>
            <span class="macro-item__label">碳水</span>
            <span class="macro-item__value">{{ metrics.carbs }}g</span>
          </div>
          <div class="macro-item">
            <span class="macro-item__dot" style="background: var(--accent-green)"></span>
            <span class="macro-item__label">蛋白</span>
            <span class="macro-item__value">{{ metrics.protein }}g</span>
          </div>
          <div class="macro-item">
            <span class="macro-item__dot" style="background: var(--accent-blue)"></span>
            <span class="macro-item__label">脂肪</span>
            <span class="macro-item__value">{{ metrics.fat }}g</span>
          </div>
        </div>

        <p class="metrics-hint">
          <template v-if="metrics.isCustomCalories">
            已采用自定义热量，营养素随之换算 ·
            <button class="metrics-hint__reset" @click="resetCalories">恢复推荐值 {{ metrics.tdeeAuto }}</button>
          </template>
          <template v-else>
            按{{ metrics.isTrainingDay ? '训练日' : '休息日' }}活动量估算，点击热量数值可自定义
          </template>
        </p>
      </div>

      <p v-else class="metrics-empty">填写年龄 / 身高 / 体重后，自动估算每日能量与营养目标</p>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
  metrics: { type: Object, default: null },
  customCalories: { type: [Number, String], default: '' }
})

const emit = defineEmits(['update:profile', 'update:customCalories'])

function update(key, value) {
  emit('update:profile', { ...props.profile, [key]: value })
}

// ── 每日热量自定义编辑 ──
const editingCalories = ref(false)
const calInputRef = ref(null)

async function startEditCalories() {
  editingCalories.value = true
  await nextTick()
  const el = calInputRef.value
  if (el) { el.focus(); el.select() }
}

function commitCalories() {
  if (!editingCalories.value) return
  const val = Math.round(Number(calInputRef.value?.value))
  editingCalories.value = false
  if (val > 0) {
    emit('update:customCalories', val)
  } else {
    // 输入空/非法 → 视为恢复推荐值
    emit('update:customCalories', '')
  }
}

function resetCalories() {
  emit('update:customCalories', '')
}
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.profile-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.profile-field__label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.profile-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  transition: border-color var(--duration-fast);
  width: 100%;
}

.profile-input-wrap:focus-within {
  border-color: var(--accent-green);
  box-shadow: 0 0 0 3px var(--accent-green-glow);
}

.profile-input {
  width: 100%;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--font-md);
  font-weight: 600;
  text-align: center;
  -moz-appearance: textfield;
}

.profile-input::-webkit-outer-spin-button,
.profile-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.profile-input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

.profile-unit {
  font-size: var(--font-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── 计算结果区 ── */
.metrics-block {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}

.metrics-row {
  display: flex;
  gap: var(--space-sm);
}

.metric-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  background: var(--bg-base);
  border-radius: var(--radius-sm);
}

.metric-card__value {
  font-size: var(--font-lg);
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-card__label {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}

/* 可编辑热量卡片 */
.metric-card--editable {
  cursor: pointer;
  transition: background var(--duration-fast), box-shadow var(--duration-fast);
}

.metric-card--editable:hover {
  background: var(--bg-surface-hover);
}

.metric-card--custom {
  box-shadow: inset 0 0 0 1px var(--accent-amber);
}

.metric-card--custom .metric-card__value {
  color: var(--accent-amber);
}

.metric-card__value-row {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  line-height: 1.2;
}

.metric-card__edit-icon {
  font-size: 9px;
  opacity: 0.6;
}

.metric-card__input {
  width: 100%;
  min-width: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--accent-green);
  outline: none;
  color: var(--accent-green);
  font-size: var(--font-lg);
  font-weight: 900;
  text-align: center;
  line-height: 1.2;
  -moz-appearance: textfield;
  padding: 0;
}

.metric-card__input::-webkit-outer-spin-button,
.metric-card__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.macro-row {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.macro-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
}

.macro-item__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.macro-item__label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
}

.macro-item__value {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.metrics-hint {
  font-size: var(--font-xs);
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-sm);
}

.metrics-hint__reset {
  background: none;
  border: none;
  color: var(--accent-green);
  font-size: var(--font-xs);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.metrics-empty {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
  font-size: var(--font-xs);
  color: var(--text-muted);
  text-align: center;
}

</style>
