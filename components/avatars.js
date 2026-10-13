// Avatari Saiyana, nacrtani kao PNG u assets/images/avatars
export const AVATARS = [
  { id: 'goku', name: 'Goku', image: require('../assets/images/avatars/goku.png') },
  { id: 'goku_ss', name: 'Goku SS', image: require('../assets/images/avatars/goku_ss.png') },
  { id: 'goku_blue', name: 'Goku SS Blue', image: require('../assets/images/avatars/goku_blue.png') },
  { id: 'vegeta', name: 'Vegeta', image: require('../assets/images/avatars/vegeta.png') },
  { id: 'vegeta_ss', name: 'Vegeta SS', image: require('../assets/images/avatars/vegeta_ss.png') },
  { id: 'vegeta_blue', name: 'Vegeta SS Blue', image: require('../assets/images/avatars/vegeta_blue.png') },
  { id: 'gohan_ss2', name: 'Gohan SS2', image: require('../assets/images/avatars/gohan_ss2.png') },
  { id: 'trunks', name: 'Trunks', image: require('../assets/images/avatars/trunks.png') },
  { id: 'broly', name: 'Broly', image: require('../assets/images/avatars/broly.png') },
  { id: 'bardock', name: 'Bardock', image: require('../assets/images/avatars/bardock.png') },
  { id: 'raditz', name: 'Raditz', image: require('../assets/images/avatars/raditz.png') },
  { id: 'nappa', name: 'Nappa', image: require('../assets/images/avatars/nappa.png') },
];

export const DEFAULT_AVATAR = 'vegeta_ss';

export const avatarImage = (id) =>
  (AVATARS.find((a) => a.id === id) || AVATARS.find((a) => a.id === DEFAULT_AVATAR)).image;
