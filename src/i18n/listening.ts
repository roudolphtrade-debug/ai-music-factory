import { useI18n } from "./context";
import type { Lang } from "./translations";

/** Browser-safe listening catalog (player, Radio, Library) for the six languages. */
const fr = {
  radioIntro: "Explorez le catalogue par genre, ambiance ou station thématique. Programmation démo, titres réellement jouables.",
  shuffle: "Lecture aléatoire", repeatAll: "Répéter tout", repeatOne: "Répéter le titre", repeatOff: "Répétition désactivée",
  queue: "File d'attente", nowPlaying: "En cours", upNext: "À suivre", emptyQueue: "La file est vide. Lancez un titre pour la remplir.",
  moveUp: "Monter", moveDown: "Descendre", remove: "Retirer", playTrack: "Lire", like: "Ajouter aux favoris", unlike: "Retirer des favoris",
  loading: "Chargement", error: "Lecture impossible : ce titre n'a pas pu être chargé.", retry: "Réessayer", skip: "Titre suivant",
  playing: "Lecture", paused: "En pause", volume: "Volume", mute: "Couper le son", unmute: "Rétablir le son",
  genres: "Genres", moods: "Ambiances", stations: "Stations thématiques", stationsNote: "Programmation démo générée à partir du catalogue local.",
  demoProgramming: "Programmation démo", results: "{n} titres", reset: "Réinitialiser", noResults: "Aucun titre ne correspond à cette sélection.",
  selection: "Sélection en cours", allTracks: "Tout le catalogue", playSelection: "Lire la sélection", tracksCount: "{n} titres",
  favorites: "Favoris", playlists: "Playlists", plays: "Écoutes", playAll: "Tout lire", shufflePlay: "Aléatoire",
  newPlaylist: "Nouvelle playlist", namePlaceholder: "Nom de la playlist", create: "Créer", rename: "Renommer", save: "Enregistrer",
  cancel: "Annuler", edit: "Modifier", done: "Terminé", deleteConfirm: "Supprimer cette playlist ? Les titres restent dans le catalogue.",
  delete: "Supprimer", emptyPlaylist: "Cette playlist est vide. Ajoutez des titres depuis vos favoris ou la Radio.",
  localNote: "Enregistré sur cet appareil",
};
type Dict = typeof fr;

const en: Dict = {
  radioIntro: "Explore the catalog by genre, mood or themed station. Demo programming, genuinely playable tracks.",
  shuffle: "Shuffle", repeatAll: "Repeat all", repeatOne: "Repeat track", repeatOff: "Repeat off",
  queue: "Queue", nowPlaying: "Now playing", upNext: "Up next", emptyQueue: "The queue is empty. Play a track to fill it.",
  moveUp: "Move up", moveDown: "Move down", remove: "Remove", playTrack: "Play", like: "Add to favorites", unlike: "Remove from favorites",
  loading: "Loading", error: "Playback failed: this track could not be loaded.", retry: "Retry", skip: "Next track",
  playing: "Playing", paused: "Paused", volume: "Volume", mute: "Mute", unmute: "Unmute",
  genres: "Genres", moods: "Moods", stations: "Themed stations", stationsNote: "Demo programming built from the local catalog.",
  demoProgramming: "Demo programming", results: "{n} tracks", reset: "Reset", noResults: "No track matches this selection.",
  selection: "Current selection", allTracks: "Full catalog", playSelection: "Play selection", tracksCount: "{n} tracks",
  favorites: "Favorites", playlists: "Playlists", plays: "Plays", playAll: "Play all", shufflePlay: "Shuffle",
  newPlaylist: "New playlist", namePlaceholder: "Playlist name", create: "Create", rename: "Rename", save: "Save",
  cancel: "Cancel", edit: "Edit", done: "Done", deleteConfirm: "Delete this playlist? Tracks stay in the catalog.",
  delete: "Delete", emptyPlaylist: "This playlist is empty. Add tracks from your favorites or the Radio.",
  localNote: "Saved on this device",
};
const es: Dict = {
  radioIntro: "Explora el catálogo por género, ambiente o estación temática. Programación demo, canciones realmente reproducibles.",
  shuffle: "Aleatorio", repeatAll: "Repetir todo", repeatOne: "Repetir canción", repeatOff: "Repetición desactivada",
  queue: "Cola", nowPlaying: "Sonando", upNext: "A continuación", emptyQueue: "La cola está vacía. Reproduce una canción para llenarla.",
  moveUp: "Subir", moveDown: "Bajar", remove: "Quitar", playTrack: "Reproducir", like: "Añadir a favoritos", unlike: "Quitar de favoritos",
  loading: "Cargando", error: "No se pudo reproducir: la canción no se cargó.", retry: "Reintentar", skip: "Siguiente canción",
  playing: "Reproduciendo", paused: "En pausa", volume: "Volumen", mute: "Silenciar", unmute: "Activar sonido",
  genres: "Géneros", moods: "Ambientes", stations: "Estaciones temáticas", stationsNote: "Programación demo creada a partir del catálogo local.",
  demoProgramming: "Programación demo", results: "{n} canciones", reset: "Restablecer", noResults: "Ninguna canción coincide con esta selección.",
  selection: "Selección actual", allTracks: "Catálogo completo", playSelection: "Reproducir selección", tracksCount: "{n} canciones",
  favorites: "Favoritos", playlists: "Listas", plays: "Escuchas", playAll: "Reproducir todo", shufflePlay: "Aleatorio",
  newPlaylist: "Nueva lista", namePlaceholder: "Nombre de la lista", create: "Crear", rename: "Renombrar", save: "Guardar",
  cancel: "Cancelar", edit: "Editar", done: "Listo", deleteConfirm: "¿Eliminar esta lista? Las canciones siguen en el catálogo.",
  delete: "Eliminar", emptyPlaylist: "Esta lista está vacía. Añade canciones desde tus favoritos o la Radio.",
  localNote: "Guardado en este dispositivo",
};
const zh: Dict = {
  radioIntro: "按曲风、氛围或主题电台探索曲库。示范节目，曲目均可真实播放。",
  shuffle: "随机播放", repeatAll: "全部循环", repeatOne: "单曲循环", repeatOff: "关闭循环",
  queue: "播放队列", nowPlaying: "正在播放", upNext: "即将播放", emptyQueue: "队列为空。播放一首歌曲即可填充。",
  moveUp: "上移", moveDown: "下移", remove: "移除", playTrack: "播放", like: "加入收藏", unlike: "取消收藏",
  loading: "加载中", error: "无法播放：该曲目加载失败。", retry: "重试", skip: "下一首",
  playing: "播放中", paused: "已暂停", volume: "音量", mute: "静音", unmute: "取消静音",
  genres: "曲风", moods: "氛围", stations: "主题电台", stationsNote: "基于本地曲库生成的示范节目。",
  demoProgramming: "示范节目", results: "{n} 首曲目", reset: "重置", noResults: "没有符合此选择的曲目。",
  selection: "当前选择", allTracks: "全部曲库", playSelection: "播放所选", tracksCount: "{n} 首曲目",
  favorites: "收藏", playlists: "歌单", plays: "播放记录", playAll: "全部播放", shufflePlay: "随机",
  newPlaylist: "新建歌单", namePlaceholder: "歌单名称", create: "创建", rename: "重命名", save: "保存",
  cancel: "取消", edit: "编辑", done: "完成", deleteConfirm: "删除此歌单？曲目仍保留在曲库中。",
  delete: "删除", emptyPlaylist: "此歌单为空。可从收藏或电台添加曲目。",
  localNote: "保存在本设备",
};
const pt: Dict = {
  radioIntro: "Explore o catálogo por gênero, clima ou estação temática. Programação demo, faixas realmente tocáveis.",
  shuffle: "Aleatório", repeatAll: "Repetir tudo", repeatOne: "Repetir faixa", repeatOff: "Repetição desativada",
  queue: "Fila", nowPlaying: "Tocando agora", upNext: "A seguir", emptyQueue: "A fila está vazia. Toque uma faixa para preenchê-la.",
  moveUp: "Subir", moveDown: "Descer", remove: "Remover", playTrack: "Tocar", like: "Adicionar aos favoritos", unlike: "Remover dos favoritos",
  loading: "Carregando", error: "Não foi possível tocar: a faixa não carregou.", retry: "Tentar novamente", skip: "Próxima faixa",
  playing: "Tocando", paused: "Pausado", volume: "Volume", mute: "Silenciar", unmute: "Ativar som",
  genres: "Gêneros", moods: "Climas", stations: "Estações temáticas", stationsNote: "Programação demo criada a partir do catálogo local.",
  demoProgramming: "Programação demo", results: "{n} faixas", reset: "Redefinir", noResults: "Nenhuma faixa corresponde a esta seleção.",
  selection: "Seleção atual", allTracks: "Catálogo completo", playSelection: "Tocar seleção", tracksCount: "{n} faixas",
  favorites: "Favoritos", playlists: "Playlists", plays: "Reproduções", playAll: "Tocar tudo", shufflePlay: "Aleatório",
  newPlaylist: "Nova playlist", namePlaceholder: "Nome da playlist", create: "Criar", rename: "Renomear", save: "Salvar",
  cancel: "Cancelar", edit: "Editar", done: "Concluir", deleteConfirm: "Excluir esta playlist? As faixas continuam no catálogo.",
  delete: "Excluir", emptyPlaylist: "Esta playlist está vazia. Adicione faixas dos favoritos ou da Rádio.",
  localNote: "Salvo neste dispositivo",
};
const ar: Dict = {
  radioIntro: "استكشف الكتالوج حسب النوع أو الأجواء أو المحطة الموضوعية. برمجة توضيحية ومقطوعات قابلة للتشغيل فعلياً.",
  shuffle: "تشغيل عشوائي", repeatAll: "تكرار الكل", repeatOne: "تكرار المقطوعة", repeatOff: "إيقاف التكرار",
  queue: "قائمة الانتظار", nowPlaying: "قيد التشغيل", upNext: "التالي", emptyQueue: "القائمة فارغة. شغّل مقطوعة لملئها.",
  moveUp: "تحريك للأعلى", moveDown: "تحريك للأسفل", remove: "إزالة", playTrack: "تشغيل", like: "إضافة إلى المفضلة", unlike: "إزالة من المفضلة",
  loading: "جارٍ التحميل", error: "تعذّر التشغيل: لم يتم تحميل هذه المقطوعة.", retry: "إعادة المحاولة", skip: "المقطوعة التالية",
  playing: "قيد التشغيل", paused: "متوقف مؤقتاً", volume: "مستوى الصوت", mute: "كتم الصوت", unmute: "إلغاء الكتم",
  genres: "الأنواع", moods: "الأجواء", stations: "محطات موضوعية", stationsNote: "برمجة توضيحية مبنية على الكتالوج المحلي.",
  demoProgramming: "برمجة توضيحية", results: "{n} مقطوعات", reset: "إعادة تعيين", noResults: "لا توجد مقطوعة تطابق هذا الاختيار.",
  selection: "الاختيار الحالي", allTracks: "الكتالوج الكامل", playSelection: "تشغيل الاختيار", tracksCount: "{n} مقطوعات",
  favorites: "المفضلة", playlists: "قوائم التشغيل", plays: "مرات الاستماع", playAll: "تشغيل الكل", shufflePlay: "عشوائي",
  newPlaylist: "قائمة جديدة", namePlaceholder: "اسم القائمة", create: "إنشاء", rename: "إعادة تسمية", save: "حفظ",
  cancel: "إلغاء", edit: "تعديل", done: "تم", deleteConfirm: "حذف هذه القائمة؟ تبقى المقطوعات في الكتالوج.",
  delete: "حذف", emptyPlaylist: "هذه القائمة فارغة. أضف مقطوعات من المفضلة أو الراديو.",
  localNote: "محفوظ على هذا الجهاز",
};

export const listening: Record<Lang, Dict> = { fr, en, es, zh, pt, ar };

export function useListening() {
  const { lang } = useI18n();
  const d = listening[lang] ?? fr;
  const f = (key: keyof Dict, n: number) => d[key].replace("{n}", String(n));
  return { l: d, f, lang };
}
