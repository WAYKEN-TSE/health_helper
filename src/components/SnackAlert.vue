<template>
  <teleport to="body">
    <transition
      enter-active-class="toast-enter"
      leave-active-class="toast-leave"
    >
      <div v-if="visible" class="snack-toast" @click="dismiss">
        <span class="snack-toast__icon">🍫</span>
        <div>
          <div class="snack-toast__title">黑巧加餐！</div>
          <div class="snack-toast__text">
            {{ snackData?.tips || '来一块黑巧克力补充能量吧！' }}
          </div>
          <div class="snack-toast__portion">建议份量：{{ snackData?.portion || '20-30g' }}</div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  snackData: Object,
  show: Boolean
})

const emit = defineEmits(['dismiss'])

const visible = ref(false)
let timer = null

watch(() => props.show, (val) => {
  if (val) {
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      dismiss()
    }, 6000)
  }
})

function dismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<style scoped>
.toast-enter {
  animation: toastIn var(--duration-slow) var(--ease-spring);
}

.toast-leave {
  animation: toastOut var(--duration-normal) var(--ease-out) forwards;
}

.snack-toast__portion {
  font-size: var(--font-xs);
  color: hsl(35, 40%, 50%);
  margin-top: 4px;
}

.snack-toast {
  cursor: pointer;
}
</style>
