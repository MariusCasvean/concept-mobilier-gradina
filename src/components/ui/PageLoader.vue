<script setup>
const props = defineProps({
  label: { type: String, default: 'Se încarcă…' },
})
</script>

<template>
  <div class="wrap" role="status" aria-live="polite">
    <v-progress-circular indeterminate color="cyan" size="42" width="4" />
    <p v-if="props.label" class="muted label">{{ props.label }}</p>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  gap: .75rem;
}
.label {
  margin: 0;
}
</style>
