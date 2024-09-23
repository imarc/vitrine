export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
    tag: { type: String, default: 'ul' },
  },
  template: `
    <component :is="tag">
      <li v-for="child of data">
        <a v-if="'url' in child" :href="child.url">{{ child.name }}</a>
        <RecursiveList v-if="child.children?.length" :data="child.children" :tag="tag" />
      </li>
    </component>
  `
}
