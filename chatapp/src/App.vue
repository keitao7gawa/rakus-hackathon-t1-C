<script setup>
import { provide, ref, onMounted } from "vue"
import { supabase } from './lib/supabaseClient'

// #region reactive state
const userName = ref("")
// #endregion

// #database
const instruments = ref([]) // MessageTableの入る場所
// #enddatabase

// #region global variable
provide("userName", userName)
// #endregion

// supabaseからデータを取得するための関数
async function getMessages() {
  try {
    const { data, error } = await supabase.from('MessageTable').select() // 本来はここにSQLを書くべきではない
    if (error) throw error
    instruments.value = data
    console.log('取得したデータ:', data) // 取得したデータを表示
  } catch (error) {
    console.error('データの取得エラー:', error.message)
  }
}

// コンポーネントがマウントされたときにデータを取得するというイベント
onMounted(() => {
  getMessages()
})
</script>

<template>
  <router-view />
</template>

<style scoped>
</style>
