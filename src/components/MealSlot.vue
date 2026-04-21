<template>
  <div class="meal-slot">
    <!-- 餐次标题行 -->
    <div class="meal-header">
      <div class="meal-header__label">
        <span>{{ mealEmoji }} {{ mealLabel }}</span>
        <span class="badge" :class="badgeClass">{{ tagLabel }}</span>
      </div>
      <div class="meal-header__actions">
        <button
          v-if="!spinning && pool.length > 0"
          class="btn btn--ghost btn--sm"
          :class="{ 'lock-active': locked }"
          @click="$emit('toggle-lock')"
          :title="locked ? '解锁' : '锁定'"
        >{{ locked ? '🔒' : '🔓' }}</button>
      </div>
    </div>

    <!-- 老虎机窗口 -->
    <div
      class="slot-viewport"
      ref="slotViewportRef"
      :class="{
        'slot-viewport--spinning': spinning,
        'slot-viewport--locked': locked
      }"
      @click="handleViewportClick"
    >
      <!-- 空池提示 -->
      <div v-if="pool.length === 0" class="slot-static">
        <div class="slot-item slot-item--empty">
          <span class="slot-item__name">暂无菜谱</span>
        </div>
      </div>
      
      <!-- 统一收拢为单个状态对齐的真实数据轮播层 -->
      <div 
        v-else 
        class="slot-reel" 
        :class="{ 'is-animating': isAnimating, 'is-settling': isSettling }" 
        :style="{ transform: `translateY(${offset}px)` }"
        @transitionend="onTransitionEnd"
      >
        <div
          v-for="(item, idx) in reelItems"
          :key="idx"
          class="slot-item"
        >
          <span 
            class="slot-item__name" 
            :style="(!spinning && !currentRecipe) ? { opacity: 0.6, letterSpacing: '2px', fontWeight: 'bold', color: 'var(--text-muted)' } : { opacity: 1 }"
          >
            {{ (!spinning && !currentRecipe) ? '？？？' : item.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- 结果详情区 -->
    <div
      v-if="currentRecipe && !spinning"
      class="result-area"
      :class="{ 'result-area--disabled': !hasDetail(currentRecipe) }"
      @click="hasDetail(currentRecipe) ? $emit('show-detail', currentRecipe) : null"
    >
      <div class="result-area__portions">
        <span
          v-for="(portion, ingId) in currentRecipe.portions"
          :key="ingId"
          class="result-area__portion-item"
        >{{ getIngredientName(ingId) }} {{ portion }}</span>
        
        <template v-if="!currentRecipe.portions || Object.keys(currentRecipe.portions).length === 0">
          <span 
            v-for="ingId in currentRecipe.ingredientIds" 
            :key="ingId" 
            class="result-area__portion-item"
          >{{ getIngredientName(ingId) }}</span>
        </template>
      </div>
      <div class="result-area__hint">{{ hasDetail(currentRecipe) ? '点击查看详细做法 →' : '详细做法：暂无' }}</div>
    </div>

    <!-- 空池提示 -->
    <div v-if="pool.length === 0 && !spinning" class="empty-hint">
      请勾选更多食材以解锁菜谱
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { MEAL_LABELS, TAG_LABELS, TAG_COLORS, getIngredientById } from '../data/recipes.js'
import confetti from 'canvas-confetti'

const playUnboxSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Arpeggio for "opening" pattern
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1); // G5
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn("Audio not supported or permission denied", e);
  }
}

const props = defineProps({
  slot: { type: String, required: true },
  pool: { type: Array, default: () => [] },
  tag: { type: String, default: 'rest_day' },
  locked: Boolean,
  recipesData: Object
})

const emit = defineEmits(['toggle-lock', 'show-detail', 'result'])

const ITEM_HEIGHT = 90

const spinning = ref(false)
const currentRecipe = ref(null)
const isAnimating = ref(false)
const isSettling = ref(false)
const offset = ref(0)
const slotViewportRef = ref(null)

let currentTargetIndex = 0
let exactTargetOffset = 0
let settlingState = false
const loops = 5

// 维持足够的单项，由于要做物理惯性，我们在数据上冗余 5 轮完整列表
const reelItems = computed(() => {
  if (props.pool.length === 0) return []
  const items = []
  for (let i = 0; i <= loops; i++) {
    items.push(...props.pool)
  }
  return items
})

const mealEmoji = computed(() => ({ breakfast: '🌅', lunch: '☀️', dinner: '🌙' }[props.slot]))
const mealLabel = computed(() => MEAL_LABELS[props.slot])
const tagLabel = computed(() => TAG_LABELS[props.tag])
const badgeClass = computed(() => ({
  'badge--amber': props.tag === 'pre_workout',
  'badge--green': props.tag === 'post_workout',
  'badge--blue': props.tag === 'rest_day'
}))

function getIngredientName(id) {
  const ing = getIngredientById(props.recipesData, id)
  return ing ? ing.name : id
}

function getDynamicItemHeight() {
  const reelElement = slotViewportRef.value?.querySelector('.slot-reel')
  if (reelElement && reelElement.children.length > 0) {
    return reelElement.children[0].offsetHeight
  }
  return window.innerWidth >= 768 ? 100 : 90
}

function hasDetail(recipe) {
  if (!recipe) return false
  return (recipe.steps && recipe.steps.length > 0) || (recipe.custom_steps && recipe.custom_steps.trim().length > 0)
}

/**
 * 带有“二次机械归位（Settling）”物理效应的数据驱动动画
 */
function startSpin() {
  if (spinning.value || props.pool.length === 0) return

  spinning.value = true
  const poolLen = props.pool.length
  
  // 1. 数据层锁定解
  const targetIdxInPool = Math.floor(Math.random() * poolLen)
  const targetRecipe = props.pool[targetIdxInPool]
  
  // 隐藏下方详情
  currentRecipe.value = null 
  emit('result', null)

  // 2. 将当前容器拉回到动态计算的高度起点
  const itemHeight = getDynamicItemHeight()
  isAnimating.value = false
  isSettling.value = false
  offset.value = -(currentTargetIndex) * itemHeight
  settlingState = false

  // 3. 计算完美的终点高度
  const totalTargetIndex = targetIdxInPool + loops * poolLen
  exactTargetOffset = -totalTargetIndex * itemHeight

  // 4. 重现老虎机经典现象：故意设置最终目标的物理误差偏差（偏上或偏下 30~50px）
  const errorMagnitude = 30 + Math.random() * 20
  const isOvershoot = Math.random() > 0.5
  // stage1Offset 代表未完全到达中央的位置
  const stage1Offset = exactTargetOffset + (isOvershoot ? -errorMagnitude : errorMagnitude)

  // 渲染帧切入
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isAnimating.value = true
      offset.value = stage1Offset
      currentTargetIndex = targetIdxInPool
    })
  })
}

function onTransitionEnd(e) {
  if (e.propertyName !== 'transform' || !spinning.value) return 

  if (!settlingState) {
    // --- 阶段1 结束 ---
    // 老虎机停在非正中央的物理位置（只有半块字体），进入“机械归位”反馈逻辑。
    settlingState = true
    isAnimating.value = false
    
    nextTick(() => {
      // 强制触发一次 reflow 计算以阻断旧的 transition
      void slotViewportRef.value.offsetHeight
      
      // 此时从靠上或靠下位置，缓慢转移至中央（perfect position）
      isSettling.value = true
      offset.value = exactTargetOffset
    })
  } else {
    // --- 阶段2 结束 ---
    // 已处于完全正中央显示
    spinning.value = false
    isSettling.value = false
    isAnimating.value = false
    settlingState = false
    
    playUnboxSound();
    let originX = 0.5;
    let originY = 0.5;
    if (slotViewportRef.value) {
      const rect = slotViewportRef.value.getBoundingClientRect();
      originX = (rect.left + rect.width / 2) / window.innerWidth;
      originY = (rect.top + rect.height / 2) / window.innerHeight;
    }
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { x: originX, y: originY },
      colors: ['#26de81', '#fed330', '#fc5c65', '#45aaf2'],
      zIndex: 100
    });

    nextTick(() => {
      // 强制触发一次 reflow 以阻断旧的 transition
      void slotViewportRef.value.offsetHeight

      // 刷新归一回到首轮数组同等坐标，无感跨越
      const itemHeight = getDynamicItemHeight()
      offset.value = -currentTargetIndex * itemHeight

      // 引出菜谱详情
      currentRecipe.value = props.pool[currentTargetIndex]
      emit('result', currentRecipe.value)
    })
  }
}

function triggerSpin() {
  startSpin()
}

function handleViewportClick() {
  if (props.locked || spinning.value) return
  if (props.pool.length === 0) {
    // 物理拦截
    alert("当前没有可制作的菜谱，请在「食材管理」录入库存，或手动勾选想吃的菜品。");
    return;
  }
  startSpin()
}

function reset() {
  spinning.value = false
  isAnimating.value = false
  isSettling.value = false
  offset.value = 0
  currentTargetIndex = 0
  currentRecipe.value = null
  settlingState = false
}

// 侦测 pool 变化，如果被外部筛除导致失效，重置
watch(() => props.pool, (newPool) => {
  if (props.locked || spinning.value) return
  if (currentRecipe.value) {
    const idx = newPool.findIndex(r => r.id === currentRecipe.value.id)
    if (idx >= 0) {
      currentTargetIndex = idx
      const itemHeight = getDynamicItemHeight()
      offset.value = -currentTargetIndex * itemHeight
    } else {
      reset()
    }
  } else {
    reset()
  }
}, { deep: true })

defineExpose({ triggerSpin, reset, spinning })
</script>

<style scoped>
.slot-viewport--spinning {
  animation: slot-shake 0.4s infinite ease-in-out alternate;
  box-shadow: 0 0 15px rgba(38, 222, 129, 0.4);
  position: relative;
  overflow: hidden;
}

.slot-viewport--spinning::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 10%),
              radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 10%);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  animation: flash-particles 0.3s infinite linear;
  opacity: 0.15;
  z-index: 10;
}

@keyframes slot-shake {
  0% { transform: translateY(-2px) scale(0.99); }
  100% { transform: translateY(2px) scale(1.005); }
}

@keyframes flash-particles {
  0% { background-position: 0 0, 10px 10px; }
  100% { background-position: 0 50px, 10px 60px; }
}

.meal-slot {
  margin-bottom: var(--space-lg);
}

.lock-active {
  color: var(--accent-amber) !important;
  background: hsla(38, 90%, 55%, 0.1) !important;
}

.slot-static {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.result-area__hint {
  font-size: var(--font-xs);
  color: var(--text-muted);
  margin-top: var(--space-sm);
  text-align: right;
}

.slot-reel {
  /* 初始化状态不需要 transition，由 JS isAnimating 或 isSettling 动态赋予 */
}

.slot-reel.is-animating {
  transition: transform 2.6s cubic-bezier(0.15, 1, 0.3, 1);
}

.slot-reel.is-settling {
  transition: transform 0.8s cubic-bezier(0.3, 0.05, 0.2, 1);
}

.result-area--disabled {
  cursor: not-allowed !important;
  opacity: 0.8;
}
.result-area--disabled .result-area__hint {
  color: var(--text-muted);
}

.empty-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--font-sm);
  padding: var(--space-md);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  margin-top: var(--space-sm);
}
</style>
