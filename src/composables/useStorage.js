import { ref, watch } from 'vue'

const PREFIX = 'badminton-meal:'

/**
 * 响应式 localStorage composable
 * @param {string} key 存储键名
 * @param {*} defaultValue 默认值
 * @returns {import('vue').Ref}
 */
export function useStorage(key, defaultValue) {
  const fullKey = PREFIX + key
  const stored = localStorage.getItem(fullKey)
  const data = ref(stored ? JSON.parse(stored) : defaultValue)

  watch(data, (val) => {
    localStorage.setItem(fullKey, JSON.stringify(val))
  }, { deep: true })

  return data
}

/** 清除本应用所有缓存 */
export function clearAllStorage() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k.startsWith(PREFIX)) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
}
