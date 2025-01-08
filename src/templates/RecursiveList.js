export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
  },
  template: `
    <ul>
      <li v-for="child of data">
        <a v-if="child.url" :href="child.url">{{ child.name || child.key }}</a>
        <span v-else>{{ child.name || child.key }}</span>
        <RecursiveList v-if="child.children" :data="child.toArray()" />
      </li>
    </ul>
  `
}
