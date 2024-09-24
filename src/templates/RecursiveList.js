export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
    tag: { type: String, default: 'ul' },
  },
  computed: {
    sorted() {
      return this.data.toSorted((a, b) => a.name > b.name ? 1 : -1)
    },
  },
  template: `
    <component :is="tag">
      <li v-for="child of sorted">
        <a v-if="'url' in child" :href="child.url">{{ child.name }}</a>
        <RecursiveList v-if="child.children?.length" :data="child.children" :tag="tag" />
      </li>
    </component>
  `
}
