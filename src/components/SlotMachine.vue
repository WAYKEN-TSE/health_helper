<template>
  <div class="section">
    <div class="section__title">🎰 今日菜单</div>

    <MealSlot
      v-for="slot in slots"
      :key="slot"
      :ref="el => { if (el) slotRefs[slot] = el }"
      :slot-name="slot"
      :slot="slot"
      :pool="pools[slot]"
      :tag="mealTags[slot]"
      :locked="lockedMeals[slot]"
      :recipes-data="recipesData"
      @toggle-lock="toggleLock(slot)"
      @show-detail="recipe => $emit('show-detail', recipe)"
      @result="recipe => handleResult(slot, recipe)"
    />

    <!-- 一键随机按钮 -->
    <div class="spin-action">
      <button
        class="btn btn--spin btn--full"
        @click="spinAll"
        :disabled="allSpinning"
      >
        {{ allSpinning ? '🎰 抽取中...' : '🎰 一键随机' }}
      </button>
      <div class="pool-hint" v-if="totalPoolSize > 0">
        共 {{ totalPoolSize }} 道菜谱可选
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MealSlot from './MealSlot.vue'

const props = defineProps({
  pools: Object,
  mealTags: Object,
  lockedMeals: Object,
  recipesData: Object
})

const emit = defineEmits(['show-detail', 'update:lockedMeals', 'all-done'])

const slots = ['breakfast', 'lunch', 'dinner']
const slotRefs = ref({})

const allSpinning = computed(() => {
  return slots.some(s => slotRefs.value[s]?.spinning)
})

const totalPoolSize = computed(() => {
  return slots.reduce((sum, s) => sum + (props.pools[s]?.length || 0), 0)
})

function toggleLock(slot) {
  const next = { ...props.lockedMeals }
  next[slot] = !next[slot]
  emit('update:lockedMeals', next)
}

function handleResult(slot, recipe) {
  // 检查是否所有未锁定的都完成了
  const allDone = slots.every(s => {
    if (props.lockedMeals[s]) return true
    return slotRefs.value[s] && !slotRefs.value[s].spinning
  })
  if (allDone && recipe) {
    emit('all-done')
  }
}

function spinAll() {
  const activeSlots = slots.filter(s => !props.lockedMeals[s]);
  if (activeSlots.length === 0) return;

  const emptySlots = activeSlots.filter(s => !props.pools[s] || props.pools[s].length === 0);
  
  if (emptySlots.length > 0) {
    // 物理拦截：如存在空池则整体拦截并提示
    alert("当前没有可制作的菜谱，请在「食材管理」录入库存，或手动勾选想吃的菜品。");
    return;
  }

  slots.forEach((s, i) => {
    if (!props.lockedMeals[s] && slotRefs.value[s]) {
      // 错开启动时间
      setTimeout(() => {
        slotRefs.value[s].triggerSpin()
      }, i * 200)
    }
  })
}
</script>

<style scoped>
.spin-action {
  margin-top: var(--space-lg);
  text-align: center;
}

.pool-hint {
  font-size: var(--font-xs);
  color: var(--text-muted);
  margin-top: var(--space-sm);
}
</style>
