export default {
  name: 'RecursiveList',
  props: {
    data: { required: true },
    tag: { type: String, default: 'ul' },
  },
  template: `
    <component :is="tag">
      <li v-for="(v, k) in data">
        <a v-if="'url' in v" :href="v.url">{{ v.name }}</a>
        <template v-else>
          {{ k }}
          <RecursiveList v-if="typeof v === 'object' && v !== null" :data="v"></RecursiveList>
        </template>
      </li>
    </component>
  `
}
