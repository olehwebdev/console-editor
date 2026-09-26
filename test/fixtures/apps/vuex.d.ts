// Vuex 4's package.json names its types only outside `exports`, which bundler resolution reads.
declare module 'vuex' {
  export * from 'vuex/types/index.d.ts';
}
